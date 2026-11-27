import { courtKey } from '@/lib/matches/court'

/**
 * 코트명 정리(0103) — 관리자 화면의 **「합칠 만한 묶음」 제안**. 사람들이 쓴 이름이 쌓이면 같은 코트가
 * 「양시숲·양재시민·양재시숲」「올림픽·올공·올림픽공원」처럼 갈린다. 여기서는 묶음을 *제안*만 하고(틀릴 수 있다),
 * 관리자가 체크를 고친 뒤 공식 명칭을 적어 합친다 — 합치는 일은 DB `merge_court_names`.
 */
export type CourtNameUse = { name: string; uses: number }
export type OfficialCourt = { id: string; name: string; uses: number; aliases: { key: string; alias: string }[] }
export type CourtCluster = {
    /** 걸린 공식 코트 — 있으면 「이 공식 코트에 합치기」 */
    court?: OfficialCourt
    /** 공식 명칭 칸의 기본값 — 공식 코트의 이름, 없으면 가장 많이 쓴 이름 */
    official: string
    names: CourtNameUse[]
}

/** 코트명에 흔히 붙는 말 — 묶음을 볼 때는 뗀다(「목동테니스장」≈「목동」, 「서남물 하드」≈「서남물」, 「올림픽공원 3번 코트」≈「올림픽공원」) */
const GENERIC = /테니스장|테니스코트|테니스|실내|실외|코트|하드|클레이|인조잔디|잔디|\d+번?/g

/** 묶음 판정용 알맹이 — 키에서 흔한 말을 뗀 것. 2자 미만이면(「내코트」「2222」) 무엇과도 묶지 않는다 */
export function courtCore(name: string): string {
    return courtKey(name).replace(GENERIC, '')
}

function isSubsequence(short: string, long: string): boolean {
    let at = 0
    for (const ch of short) {
        at = long.indexOf(ch, at)
        if (at < 0) return false
        at += 1
    }
    return true
}

function commonPrefix(a: string, b: string): number {
    let n = 0
    while (n < a.length && n < b.length && a[n] === b[n]) n += 1
    return n
}

/**
 * 같은 코트일 법한가 — 알맹이가 같거나 · 한쪽이 다른 쪽을 담거나(「올림픽」⊂「올림픽공원」) ·
 * 첫 글자가 같은 줄임말이거나(「올공」~「올림픽공원」, 「양시숲」~「양재시숲」) · 앞 세 글자가 같다(「양재시민」~「양재시숲」).
 */
export function relatedCourts(a: string, b: string): boolean {
    const x = courtCore(a)
    const y = courtCore(b)
    if (x.length < 2 || y.length < 2) return false
    if (x === y) return true
    const [short, long] = x.length <= y.length ? [x, y] : [y, x]
    if (long.includes(short)) return true
    if (short[0] === long[0] && isSubsequence(short, long)) return true
    return commonPrefix(x, y) >= 3
}

const total = (c: CourtCluster) => c.names.reduce((sum, n) => sum + n.uses, 0)

/**
 * 묶음 제안 — ① 이름끼리 이어진 덩어리를 만든다(건너 이어진 것도 한 덩어리: 「양시숲」~「양재시숲」~「양재시민」)
 * ② 덩어리가 공식 코트(이름·별칭)에 걸리면 그 코트에 합치기, 아니면 이름이 둘 이상일 때만 새 공식 코트로 제안한다.
 * 많이 쓴 묶음부터. 어디에도 안 걸린 이름은 제안하지 않는다(화면의 「모든 이름」에서 직접 고른다).
 */
export function suggestCourtClusters(names: ReadonlyArray<CourtNameUse>, courts: ReadonlyArray<OfficialCourt>): CourtCluster[] {
    const root = names.map((_, i) => i)
    const find = (i: number): number => {
        while (root[i] !== i) i = root[i]
        return i
    }
    for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
            if (relatedCourts(names[i].name, names[j].name)) root[find(j)] = find(i)
        }
    }
    const lumps = new Map<number, CourtNameUse[]>()
    names.forEach((n, i) => lumps.set(find(i), [...(lumps.get(find(i)) ?? []), n]))

    const byCourt = new Map<string, CourtCluster>()
    const fresh: CourtCluster[] = []
    for (const members of lumps.values()) {
        const court = courts.find((c) => [c.name, ...c.aliases.map((a) => a.alias)].some((label) => members.some((m) => relatedCourts(m.name, label))))
        if (court) {
            const cluster = byCourt.get(court.id) ?? { court, official: court.name, names: [] }
            cluster.names.push(...members)
            byCourt.set(court.id, cluster)
        } else if (members.length > 1) {
            fresh.push({ official: '', names: members })
        }
    }
    return [...byCourt.values(), ...fresh]
        .map((c) => {
            const sorted = [...c.names].sort((a, b) => b.uses - a.uses || b.name.length - a.name.length)
            return { ...c, names: sorted, official: c.court ? c.official : sorted[0].name }
        })
        .sort((a, b) => total(b) - total(a))
}
