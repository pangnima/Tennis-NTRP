// 대진 배치 코어 — 순수 규칙. 옛 매칭 룸 자동 대진표(Week 40, `pre-rebuild-2026-11` 태그의 lineup-core.ts)를
// 새 구조에 맞게 줄였다: 성별은 언제나 선호(soft — 모인 사람은 다 뛴다), 가중치는 균형 하나, 회원 규칙은
// "게임마다 회원 최소 1명"(DB `record_game`·`save_match_games`의 `no_member_player`와 같은 눈높이) 하나.

import type { MatchType } from '@/types'

/** 배치 대상 1명 */
export type LineupPlayer = {
    /** 회원 uuid 또는 비회원 키. 페어 키·중복 판정의 단위 */
    key: string
    name: string
    /** 이미 파생된 유효 NTRP(`toLineupPlayers`) */
    ntrp: number
    /** 모르면 비워 둔다 — 성별은 선호일 뿐 사람을 빼지 않는다 */
    gender?: 'male' | 'female'
    isMember: boolean
}

export type LineupTeams = { team1: LineupPlayer[]; team2: LineupPlayer[] }

/** 누적 상태 — 게임을 하나 배치할 때마다 갱신된다 */
export type LineupState = {
    playCount: Map<string, number> // key → 누적 경기 수
    partnerCount: Map<string, number> // pairKey → 같은 팀으로 뛴 횟수
    opponentCount: Map<string, number> // pairKey → 상대로 만난 횟수
}

export function createLineupState(): LineupState {
    return { playCount: new Map(), partnerCount: new Map(), opponentCount: new Map() }
}

/** 정렬 무관 페어 키 */
export function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`
}

const count = (map: Map<string, number>, key: string) => map.get(key) ?? 0

/** 종목별 필요 인원 — male/female은 성별 선호 인원(단식은 성별 무관) */
export function courtNeed(type: MatchType): { size: number; male: number; female: number } {
    switch (type) {
        case 'singles':
            return { size: 2, male: 0, female: 0 }
        case 'men_doubles':
            return { size: 4, male: 4, female: 0 }
        case 'women_doubles':
            return { size: 4, male: 0, female: 4 }
        case 'mixed_doubles':
            return { size: 4, male: 2, female: 2 }
    }
}

/** k개 조합 열거 (작은 입력 전용 — 후보는 언제나 size + 3명 이하로 좁혀서 들어온다) */
export function combinations<T>(arr: T[], k: number): T[][] {
    if (k <= 0) return [[]]
    if (k > arr.length) return []
    const result: T[][] = []
    const pick = (start: number, acc: T[]) => {
        if (acc.length === k) {
            result.push([...acc])
            return
        }
        for (let i = start; i < arr.length; i++) {
            acc.push(arr[i])
            pick(i + 1, acc)
            acc.pop()
        }
    }
    pick(0, [])
    return result
}

const sumNtrp = (arr: LineupPlayer[]) => arr.reduce((acc, p) => acc + p.ntrp, 0)

/** 팀 전력 차이 */
export function teamDiff(teams: LineupTeams): number {
    return Math.abs(sumNtrp(teams.team1) - sumNtrp(teams.team2))
}

/** 파트너·상대 재구성 페널티 — 같은 짝을 다시 만날수록 제곱으로 커진다 */
function variety(teams: LineupTeams, state: LineupState): number {
    let v = 0
    for (const t of [teams.team1, teams.team2]) {
        if (t.length === 2) v += (count(state.partnerCount, pairKey(t[0].key, t[1].key)) + 1) ** 2
    }
    for (const a of teams.team1) {
        for (const b of teams.team2) v += (count(state.opponentCount, pairKey(a.key, b.key)) + 1) ** 2
    }
    return v
}

/**
 * 코트 안 팀 구성 — 가능한 분할 중 (팀 전력 차 + 재구성 페널티)가 가장 낮은 안.
 * 혼복에서 남 2·여 2가 모이면 팀마다 1남 1녀인 두 분할만 후보로 둔다.
 */
export function splitTeams(players: LineupPlayer[], type: MatchType, state: LineupState): LineupTeams {
    if (type === 'singles') {
        const [p0, p1] = [...players].sort((a, b) => b.ntrp - a.ntrp)
        return { team1: [p0], team2: [p1] }
    }
    const males = players.filter((p) => p.gender === 'male')
    const females = players.filter((p) => p.gender === 'female')
    const [p0, p1, p2, p3] = players
    const candidates: LineupTeams[] =
        type === 'mixed_doubles' && males.length === 2 && females.length === 2
            ? [
                  { team1: [males[0], females[0]], team2: [males[1], females[1]] },
                  { team1: [males[0], females[1]], team2: [males[1], females[0]] },
              ]
            : [
                  { team1: [p0, p1], team2: [p2, p3] },
                  { team1: [p0, p2], team2: [p1, p3] },
                  { team1: [p0, p3], team2: [p1, p2] },
              ]
    let best = candidates[0]
    let bestCost = Infinity
    for (const c of candidates) {
        const cost = teamDiff(c) + variety(c, state)
        if (cost < bestCost) {
            bestCost = cost
            best = c
        }
    }
    return best
}

/** 한 코트 묶음의 비용 — 실력(코트 안 NTRP 폭 + 팀 전력 차) + 공평성(누적 출전) + 다양성 */
export function groupCost(players: LineupPlayer[], type: MatchType, state: LineupState): number {
    const ntrps = players.map((p) => p.ntrp)
    const teams = splitTeams(players, type, state)
    const skill = Math.max(...ntrps) - Math.min(...ntrps) + teamDiff(teams)
    const fairness = players.reduce((acc, p) => acc + count(state.playCount, p.key), 0)
    return skill + fairness + variety(teams, state)
}

/** 요구 성별 구성과 어긋난 정도 — 비용의 최우선 항이라 "가능하면 맞추되 사람을 빼지는 않는다"가 된다 */
export function genderPenalty(group: LineupPlayer[], type: MatchType): number {
    if (type === 'singles') return 0
    const need = courtNeed(type)
    const males = group.filter((p) => p.gender === 'male').length
    const females = group.filter((p) => p.gender === 'female').length
    return Math.abs(males - need.male) + Math.abs(females - need.female)
}

const GENDER_PENALTY_WEIGHT = 1000

/**
 * 한 게임에 채울 선수 묶음. 채울 수 없으면 null.
 * `mandatory`는 반드시 들어가야 하는 선수(덜 뛴 사람) — 출전 편차를 1 이내로 묶는 장치다.
 * 회원이 한 명도 없는 묶음은 고르지 않는다(저장할 수 없다).
 */
export function selectPlayers(
    type: MatchType,
    available: LineupPlayer[],
    state: LineupState,
    mandatory: LineupPlayer[] = [],
): LineupPlayer[] | null {
    const need = courtNeed(type)
    const take = need.size - mandatory.length
    if (take < 0) return null
    const fixed = new Set(mandatory.map((p) => p.key))
    const rest = available.filter((p) => !fixed.has(p.key))
    if (rest.length < take) return null

    // 적게 뛴 선수 우선, 같으면 NTRP 순 — 비슷한 실력끼리 묶이는 띠를 만든다
    const byFairness = (a: LineupPlayer, b: LineupPlayer) =>
        count(state.playCount, a.key) - count(state.playCount, b.key) || a.ntrp - b.ntrp
    const shortlist = [...rest].sort(byFairness).slice(0, Math.min(rest.length, take + 3))

    let best: LineupPlayer[] | null = null
    let bestCost = Infinity
    for (const combo of combinations(shortlist, take)) {
        const group = [...mandatory, ...combo]
        if (!group.some((p) => p.isMember)) continue
        const cost = GENDER_PENALTY_WEIGHT * genderPenalty(group, type) + groupCost(group, type, state)
        if (cost < bestCost) {
            bestCost = cost
            best = group
        }
    }
    return best
}

/** 배치 확정 — 팀을 가르고 누적 상태(경기 수·파트너·상대)를 갱신한다 */
export function commitLineup(players: LineupPlayer[], type: MatchType, state: LineupState): LineupTeams {
    const teams = splitTeams(players, type, state)
    for (const p of players) state.playCount.set(p.key, count(state.playCount, p.key) + 1)
    const bump = (map: Map<string, number>, a: string, b: string) => map.set(pairKey(a, b), count(map, pairKey(a, b)) + 1)
    for (const t of [teams.team1, teams.team2]) {
        if (t.length === 2) bump(state.partnerCount, t[0].key, t[1].key)
    }
    for (const a of teams.team1) {
        for (const b of teams.team2) bump(state.opponentCount, a.key, b.key)
    }
    return teams
}
