import { derivePublicNtrp } from '@/lib/personal-matches/ntrp'
import type { MatchType } from '@/types'

import { commitLineup, courtNeed, createLineupState, genderPenalty, selectPlayers, type LineupPlayer } from './lineup-core'

/**
 * 매칭 자동 대진표 (순수). 대진은 격자가 아니라 **순서 있는 게임 목록**이고, 코트가 N면이면 연속된 N게임이
 * 한 라운드다(같은 라운드에 한 사람이 두 코트에 서지 않는다).
 *
 * 약속 셋 — 출전 편차 ≤ 1(덜 뛴 사람을 다음 게임에 강제로 넣는 "출전 계층"), 파트너·상대 반복 회피,
 * 팀 전력 균형. 같은 시드 = 같은 대진이라 [다시 뽑기]는 시드만 바꾼다.
 * 옛 매칭 룸 자동 대진표(Week 40)의 알고리즘과 테스트를 옮겨 왔다.
 */

export type { LineupPlayer } from './lineup-core'

/** 대진 후보의 최소 형태 — 매칭 참가자(`MatchMember`)와 보드의 비회원이 구조적으로 대입된다 */
export type LineupCandidate = {
    key: string
    name: string
    ntrp?: number
    personalNtrp?: number
    statsHidden?: boolean
    gender?: 'male' | 'female'
    isMember: boolean
}

/** 아무도 평점이 없을 때의 대체값 */
const FALLBACK_NTRP = 3.0

/**
 * 후보 → 배치 대상. NTRP는 화면에 보이는 값(`derivePublicNtrp`)을 쓴다 — 보이는 값과 배치 기준이 다르면 안 된다.
 * 값이 없으면 아는 사람들의 평균으로 채운다(평점이 없다고 대진에서 빠지면 안 된다).
 */
export function toLineupPlayers(candidates: LineupCandidate[]): LineupPlayer[] {
    const known = candidates.map((c) => derivePublicNtrp(c)).filter((n): n is number => typeof n === 'number')
    const fallback = known.length > 0 ? known.reduce((sum, n) => sum + n, 0) / known.length : FALLBACK_NTRP
    return candidates.map((c) => ({
        key: c.key,
        name: c.name,
        ntrp: derivePublicNtrp(c) ?? fallback,
        gender: c.gender,
        isMember: c.isMember,
    }))
}

/** 한 번에 만들 수 있는 게임 수 상한 */
export const LINEUP_MAX_GAMES = 20
/** 1인당 게임 수 선택지 */
export const PER_PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const
/** 코트 면 수 선택지 */
export const COURT_OPTIONS = [1, 2, 3, 4] as const
/** 한 게임(세트 하나)에 드는 시간의 어림 — 권장값 계산에만 쓴다 */
const SLOT_MINUTES = 30

/** 1인당 게임 수 → 총 게임 수. 4명·3게임 → 3게임, 6명·2게임 → 3게임. 반올림해 1~상한으로 묶는다 */
export function gamesForPerPlayer(playerCount: number, perPlayer: number, matchType: MatchType): number {
    if (playerCount <= 0 || perPlayer <= 0) return 0
    const raw = Math.round((playerCount * perPlayer) / courtNeed(matchType).size)
    return Math.min(LINEUP_MAX_GAMES, Math.max(1, raw))
}

/** 인원으로 실제 돌릴 수 있는 면 수 — 11명 복식은 3면을 골라도 2면이 한계다 */
export function effectiveCourtCount(playerCount: number, matchType: MatchType, courtCount: number): number {
    const byPlayers = Math.floor(Math.max(0, playerCount) / courtNeed(matchType).size)
    return Math.max(1, Math.min(Math.floor(courtCount), byPlayers))
}

/**
 * 권장 1인당 게임 수 — 매칭 소요 시간 안에 들어가는 가장 큰 값(게임 하나 30분 어림).
 * 인원이 모자라 대진을 만들 수 없으면 null.
 */
export function recommendPerPlayer(input: { durationMinutes: number; courts: number; playerCount: number; matchType: MatchType }): number | null {
    const { durationMinutes, playerCount, matchType } = input
    if (playerCount < courtNeed(matchType).size) return null
    const courts = effectiveCourtCount(playerCount, matchType, input.courts)
    const capacity = Math.max(1, Math.floor(durationMinutes / SLOT_MINUTES)) * courts
    for (let per = PER_PLAYER_OPTIONS[PER_PLAYER_OPTIONS.length - 1]; per >= 1; per--) {
        if (gamesForPerPlayer(playerCount, per, matchType) <= capacity) return per
    }
    return 1
}

export type LineupGame = { team1: LineupPlayer[]; team2: LineupPlayer[] }

export type LineupResult = {
    games: LineupGame[]
    /** games[i]에서 쉬는 사람들의 key */
    resting: string[][]
    /** key → 출전 횟수(못 뛴 사람도 0) */
    playCounts: Record<string, number>
    warnings: string[]
}

export type BuildLineupOptions = { matchType: MatchType; games: number; seed: number; courts?: number }

/** mulberry32 — 작고 결정적인 PRNG. 비용이 같은 후보들의 순서를 흔드는 데만 쓴다 */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
}

/**
 * 출전 계층 — 경계보다 덜 뛴 사람(mandatory)은 반드시 들어가고, 경계와 같은 사람(optional) 중에서 나머지를 고른다.
 * 더 많이 뛴 사람은 후보에서 빠지므로 출전 편차가 1을 넘지 않는다.
 */
function fairnessTier(players: LineupPlayer[], playCount: Map<string, number>, size: number) {
    const n = (p: LineupPlayer) => playCount.get(p.key) ?? 0
    if (players.length <= size) return { mandatory: players, optional: [] as LineupPlayer[] }
    const boundary = n([...players].sort((a, b) => n(a) - n(b))[size - 1])
    return { mandatory: players.filter((p) => n(p) < boundary), optional: players.filter((p) => n(p) === boundary) }
}

/**
 * 계층에 회원이 없으면 덜 뛴 회원 한 명을 강제로 넣는다 — 회원이 적은 매칭에서 회원을 편차 규칙으로 빼면
 * 회원 없는 게임밖에 남지 않아 대진이 끊긴다(회원은 편차를 넘고, 비회원끼리는 여전히 ≤ 1).
 */
function withMemberForced(tier: ReturnType<typeof fairnessTier>, pool: LineupPlayer[], playCount: Map<string, number>, size: number) {
    if ([...tier.mandatory, ...tier.optional].some((p) => p.isMember) || tier.mandatory.length >= size) return tier.mandatory
    const n = (p: LineupPlayer) => playCount.get(p.key) ?? 0
    const member = pool.filter((p) => p.isMember).sort((a, b) => n(a) - n(b))[0]
    return member ? [...tier.mandatory, member] : tier.mandatory
}

const TYPE_LABEL: Record<MatchType, string> = { singles: '단식', men_doubles: '남자 복식', women_doubles: '여자 복식', mixed_doubles: '혼합 복식' }

/** 게임 목록에서 쉬는 사람과 출전 횟수를 다시 센다 — 손으로 고친 뒤에도 같은 함수로 맞는다 */
export function summarizeLineup(games: readonly { team1: readonly (LineupPlayer | null)[]; team2: readonly (LineupPlayer | null)[] }[], players: LineupPlayer[]) {
    const playCounts: Record<string, number> = Object.fromEntries(players.map((p) => [p.key, 0]))
    const resting = games.map((g) => {
        const inGame = new Set([...g.team1, ...g.team2].flatMap((p) => (p ? [p.key] : [])))
        for (const key of inGame) if (key in playCounts) playCounts[key] += 1
        return players.filter((p) => !inGame.has(p.key)).map((p) => p.key)
    })
    return { resting, playCounts }
}

/** 참가자로 순서 있는 대진을 만든다. 만들 수 없으면 games가 비고 warnings가 이유를 말한다 */
export function buildLineup(players: LineupPlayer[], opts: BuildLineupOptions): LineupResult {
    const warnings: string[] = []
    const empty = (): LineupResult => ({ games: [], resting: [], playCounts: {}, warnings })
    const need = courtNeed(opts.matchType)
    if (opts.games < 1) {
        warnings.push('게임 수를 1 이상으로 정해 주세요.')
        return empty()
    }
    if (players.length < need.size) {
        warnings.push(`${TYPE_LABEL[opts.matchType]} 대진에는 참가자가 ${need.size}명 이상 필요합니다.`)
        return empty()
    }
    const members = players.filter((p) => p.isMember).length
    if (members < 1) {
        warnings.push('게임마다 회원이 한 명은 있어야 합니다.')
        return empty()
    }
    const total = Math.min(opts.games, LINEUP_MAX_GAMES)
    if (opts.games > LINEUP_MAX_GAMES) warnings.push(`한 번에 만들 수 있는 게임은 ${LINEUP_MAX_GAMES}개까지입니다.`)
    const asked = opts.courts ?? 1
    const courts = effectiveCourtCount(players.length, opts.matchType, asked)
    if (courts < asked) warnings.push(`참가자 ${players.length}명으로는 한 번에 ${courts}면만 돌릴 수 있습니다.`)

    const state = createLineupState()
    const rng = mulberry32(opts.seed)
    const roundUsed = new Set<string>()
    const games: LineupGame[] = []
    let memberOverran = false
    for (let i = 0; i < total; i++) {
        if (i % courts === 0) roundUsed.clear()
        const pool = shuffled(players.filter((p) => !roundUsed.has(p.key)), rng)
        const tier = fairnessTier(pool, state.playCount, need.size)
        const mandatory = withMemberForced(tier, pool, state.playCount, need.size)
        if (mandatory !== tier.mandatory) memberOverran = true
        const picked = selectPlayers(opts.matchType, tier.optional, state, mandatory)
        if (!picked) {
            warnings.push(`${i + 1}번째 게임부터는 참가자 구성으로 대진을 만들 수 없어 멈췄습니다.`)
            break
        }
        games.push(commitLineup(picked, opts.matchType, state))
        for (const p of picked) roundUsed.add(p.key)
    }
    // 강제로 넣은 결과 편차가 실제로 1을 넘었을 때만 알린다(넘지 않았다면 사람이 볼 이상은 없다)
    const counts = summarizeLineup(games, players).playCounts
    if (memberOverran && Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) > 1) {
        warnings.push(`회원이 ${members}명뿐이라 회원이 더 자주 나섭니다.`)
    }
    if (games.some((g) => genderPenalty([...g.team1, ...g.team2], opts.matchType) > 0)) {
        warnings.push(`인원 구성상 일부 게임은 ${TYPE_LABEL[opts.matchType]} 성별 구성을 맞추지 못했습니다.`)
    }
    return { games, ...summarizeLineup(games, players), warnings }
}
