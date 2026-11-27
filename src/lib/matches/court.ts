/**
 * 코트명 — **함께 쌓는 코트 목록**의 규칙(0102). 운영자가 모든 코트를 알 수 없어 사람들이 쓴 이름이 목록이 되고,
 * 같은 코트가 「양재 시민의숲」·「양시숲」처럼 갈리지 않게 찾기가 기존 이름을 먼저 보여 준다.
 * DB `court_key`·`hangul_choseong`·`search_court_names`의 거울 — 화면은 내 최근 목록을 거를 때와 「비슷한 코트」 힌트에 쓴다.
 */

/** 같은 코트 판정 키 — 소문자 + 공백 제거(「양재 시민의숲」 = 「양재시민의숲」) */
export function courtKey(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '')
}

const CHOSEONG = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
/** 한글 음절 → 초성(가 = U+AC00, 588자마다 초성 하나). 한글이 아니면 그대로 */
export function choseong(text: string): string {
    return [...text].map((ch) => {
        const code = ch.charCodeAt(0) - 0xac00
        return code >= 0 && code <= 11171 ? CHOSEONG[Math.floor(code / 588)] : ch
    }).join('')
}

const JAMO_ONLY = /^[ㄱ-ㅎ]+$/

/**
 * 찾기 순위 — 0 앞부분 일치 · 1 포함 · 2 줄임말(질의 글자를 순서대로 담음 — 「양시숲」⊂「양재시민의숲」) 또는 초성(질의가 자음뿐일 때).
 * 걸리지 않으면 null. 빈 질의는 0(전부).
 */
export function matchCourt(name: string, query: string): 0 | 1 | 2 | null {
    const q = courtKey(query)
    if (!q) return 0
    const key = courtKey(name)
    if (key.startsWith(q)) return 0
    if (key.includes(q)) return 1
    if (JAMO_ONLY.test(q)) return choseong(key).includes(q) ? 2 : null
    let at = 0
    for (const ch of q) {
        at = key.indexOf(ch, at)
        if (at < 0) return null
        at += 1
    }
    return 2
}

/** 후보 — 이름만, 또는 공식 코트처럼 **별칭(via)으로 걸린** 이름(0103) */
export type CourtCandidate = string | { name: string; via?: string | null }

/**
 * 「비슷한 코트가 있어요」 — 적은 이름이 어느 후보와도 키가 같지 않은데 앞부분·포함·줄임말·초성으로 걸리는 후보가 있으면
 * 그 첫 후보(후보는 이미 순위 순 — 공식 코트가 먼저). 공식 코트는 별칭으로 걸려도 후보다(「올팍」 → 「올림픽공원 테니스장」).
 * 키가 같은 후보가 있으면(띄어쓰기만 다름) 저장할 때 DB가 그 철자로 맞추므로 힌트가 필요 없다.
 */
export function similarCourt(value: string, candidates: ReadonlyArray<CourtCandidate>): string | null {
    const key = courtKey(value)
    if (!key) return null
    const list = candidates.map((c) => (typeof c === 'string' ? { name: c, via: null } : c))
    if (list.some((c) => courtKey(c.name) === key)) return null
    return list.find((c) => matchCourt(c.name, value) !== null || (!!c.via && matchCourt(c.via, value) !== null))?.name ?? null
}

/** 코트 번호를 붙인 표시 — 「양재 시민의숲 · 3번 코트」. 번호가 숫자·쉼표뿐이면 「3, 4번 코트」, 아니면 적은 그대로(「A코트」) */
export function formatCourt(name: string | undefined, no: string | undefined): string {
    const court = name?.trim()
    const n = no?.trim()
    if (!court) return ''
    if (!n) return court
    return `${court} · ${/^[\d\s,·~-]+$/.test(n) ? `${n}번 코트` : n}`
}

export const COURT_NAME_MAX = 40
export const COURT_NO_MAX = 10
