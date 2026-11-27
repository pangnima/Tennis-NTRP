/**
 * 경기 결과 목록의 묶기·거르기 — 순수 함수(vitest). 화면은 searchParams를 이 타입으로 읽어 서버에서 거른다.
 *
 * **한 게임 = 스코어 하나 = 한 줄**(0105). 같은 자리에서 친 게임은 **묶음**으로 모은다:
 *   · 매칭 게임 = 같은 매칭 · 직접 기록 = 같은 날짜·시각·코트(번호)·종목
 * 묶음 머리가 공통 정보(일시·경기장·종목·구분)를 한 번만 말하고, 그 아래 게임 줄은 대진·결과·스코어만 가진다.
 */
import { formatDayWithWeekday } from '@/lib/format'
import { findSeat, setsForSeat } from '@/lib/games/perspective'
import { courtKey } from '@/lib/matches/court'
import { formatMatchHours } from '@/lib/matches/when'
import type { CourtSurface, Game, MatchType, TennisMatch } from '@/types'

export type GameTypeFilter = 'all' | 'singles' | 'doubles'
export type GameResultFilter = 'all' | 'win' | 'loss'
/**
 * 구분 — 그 경기가 내게 어떤 자리였나.
 *   host = 내가 만든 매칭의 경기 · guest = 남이 만든 매칭의 경기 · direct = 매칭 없이 바로 기록한 경기
 * 매칭 안의 경기는 호스트가 아니면 게스트다(셋째 경우가 없다). 직접 기록에는 호스트가 없어 따로 둔다.
 */
export type GameRole = 'host' | 'guest' | 'direct'
export type GameRoleFilter = 'all' | GameRole
export type GameFilter = { type: GameTypeFilter; result: GameResultFilter; role: GameRoleFilter }

/** 화면을 가르는 축 — 밑줄 탭 */
export const GAME_ROLE_FILTERS: { key: GameRoleFilter; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'host', label: '호스트' }, { key: 'guest', label: '게스트' }, { key: 'direct', label: '직접 기록' },
]
/** 거르는 축 — 세그먼트 토글. 첫 칸이 축의 이름을 말한다(「전체」가 세 번 나오지 않게) */
export const GAME_TYPE_FILTERS: { key: GameTypeFilter; label: string }[] = [
    { key: 'all', label: '종목 전체' }, { key: 'singles', label: '단식' }, { key: 'doubles', label: '복식' },
]
export const GAME_RESULT_FILTERS: { key: GameResultFilter; label: string }[] = [
    { key: 'all', label: '승패 전체' }, { key: 'win', label: '승' }, { key: 'loss', label: '패' },
]

/** 주소의 값은 믿지 않는다 — 모르는 값은 '전체' */
export function parseGameFilter(params: { type?: string; result?: string; role?: string }): GameFilter {
    return {
        type: params.type === 'singles' || params.type === 'doubles' ? params.type : 'all',
        result: params.result === 'win' || params.result === 'loss' ? params.result : 'all',
        role: params.role === 'host' || params.role === 'guest' || params.role === 'direct' ? params.role : 'all',
    }
}

/**
 * 한 게임의 구분. `hostedMatchIds`는 보는 사람이 호스트인 매칭의 id들이다 — 게임은 매칭의 호스트를 모르므로 밖에서 받는다.
 * 매칭을 볼 수 없게 된 경우(비공개 매칭에서 나간 뒤)에도 답은 같다: 호스트는 나갈 수 없으니 그 매칭의 호스트일 수 없다.
 */
export function gameRole(game: Game, hostedMatchIds: ReadonlySet<string>): GameRole {
    if (!game.matchId) return 'direct'
    return hostedMatchIds.has(game.matchId) ? 'host' : 'guest'
}

/** 한 게임의 승패(내 관점) — 스코어가 하나라 곧 그 스코어의 승패다. 내가 뛰지 않았으면 null */
export function gameOutcome(game: Game, viewerId: string): 'win' | 'loss' | 'draw' | null {
    const seat = findSeat(game, viewerId)
    if (!seat) return null
    const s = setsForSeat(game, seat)[0]
    if (!s) return null
    return s.me > s.opp ? 'win' : s.me < s.opp ? 'loss' : 'draw'
}

/** 묶음의 정체 — 게임과 수정 기록이 같은 키를 쓴다(지워진 게임의 기록도 제 묶음에 붙는다) */
export type SessionRef = { matchId?: string; playedAt: string; playedTime?: string; courtName?: string; courtNo?: string; matchType: MatchType }

export function sessionKey(ref: SessionRef): string {
    if (ref.matchId) return `m:${ref.matchId}`
    return ['d', ref.playedAt, ref.playedTime?.slice(0, 5) ?? '', courtKey(ref.courtName ?? ''), ref.courtNo?.trim() ?? '', ref.matchType].join('|')
}

export type GameSession = {
    key: string
    kind: 'match' | 'direct'
    matchId?: string
    /** 매칭의 방 제목 — 머리 줄에서 그 매칭으로 가는 링크 */
    title?: string
    playedAt: string
    playedTime?: string
    durationMinutes?: number
    courtName?: string
    courtNo?: string
    surface?: CourtSurface
    matchType: MatchType
    role: GameRole
    /** 1게임부터(먼저 친 것이 위) */
    games: Game[]
}

/**
 * 게임(최신순) → 묶음(최신순). 매칭 묶음의 일시·장소·길이는 **매칭의 값**이다(게임은 길이를 갖지 않는다) —
 * 매칭을 못 읽으면 게임의 값으로 물러난다. 묶음 안은 기록한 순서(1게임, 2게임 …).
 */
export function groupGamesIntoSessions(games: Game[], matches: ReadonlyMap<string, TennisMatch>, hostedMatchIds: ReadonlySet<string>): GameSession[] {
    const byKey = new Map<string, GameSession>()
    for (const g of games) {
        const key = sessionKey(g)
        const found = byKey.get(key)
        if (found) {
            found.games.push(g)
            continue
        }
        const m = g.matchId ? matches.get(g.matchId) : undefined
        byKey.set(key, {
            key, kind: g.matchId ? 'match' : 'direct', matchId: g.matchId, title: m?.title,
            playedAt: m?.playedAt ?? g.playedAt, playedTime: m?.playedTime ?? g.playedTime,
            durationMinutes: m ? m.durationMinutes : g.durationMinutes,
            courtName: m?.courtName ?? g.courtName, courtNo: m ? m.courtNo : g.courtNo, surface: m?.surface ?? g.surface,
            matchType: g.matchType, role: gameRole(g, hostedMatchIds), games: [g],
        })
    }
    return [...byKey.values()].map((s) => ({ ...s, games: [...s.games].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
}

/** 구분·종목은 묶음 단위로, 승패는 게임 단위로 거른다 — 맞는 게임이 없는 묶음은 뺀다 */
export function filterSessions(sessions: GameSession[], viewerId: string, filter: GameFilter): GameSession[] {
    return sessions.flatMap((s) => {
        if (filter.role !== 'all' && s.role !== filter.role) return []
        if (filter.type === 'singles' && s.matchType !== 'singles') return []
        if (filter.type === 'doubles' && s.matchType === 'singles') return []
        if (filter.result === 'all') return [s]
        const games = s.games.filter((g) => gameOutcome(g, viewerId) === filter.result)
        return games.length > 0 ? [{ ...s, games }] : []
    })
}

/** 묶음의 내 전적 — 「4게임 3승 1패」 */
export function sessionTally(session: GameSession, viewerId: string): { games: number; wins: number; losses: number; draws: number } {
    const outcomes = session.games.map((g) => gameOutcome(g, viewerId))
    const count = (o: string) => outcomes.filter((x) => x === o).length
    return { games: session.games.length, wins: count('win'), losses: count('loss'), draws: count('draw') }
}

export function formatTally(t: { games: number; wins: number; losses: number; draws: number }): string {
    const parts = [t.wins > 0 && `${t.wins}승`, t.losses > 0 && `${t.losses}패`, t.draws > 0 && `${t.draws}무`].filter(Boolean)
    return [`${t.games}게임`, ...parts].join(' ')
}

/** 묶음의 일시 — 「11.26 (목) 20:00~22:00」. 길이를 모르면 시작만(「11.25 (수) 16:00」), 시각도 모르면 날짜만 */
export function sessionWhen(s: Pick<GameSession, 'playedAt' | 'playedTime' | 'durationMinutes'>): string {
    const day = formatDayWithWeekday(s.playedAt)
    if (!s.playedTime) return day
    const hours = s.durationMinutes ? formatMatchHours(s.playedTime, s.durationMinutes) : s.playedTime.slice(0, 5)
    return `${day} ${hours}`
}

export type SessionMonthGroup = { key: string; label: string; sessions: GameSession[]; games: number }

/** 경기일의 연·월로 묶는다. 입력 순서(최신순)를 그대로 지킨다 */
export function groupSessionsByMonth(sessions: GameSession[]): SessionMonthGroup[] {
    const groups: SessionMonthGroup[] = []
    for (const s of sessions) {
        const key = s.playedAt.slice(0, 7)
        const last = groups[groups.length - 1]
        if (last?.key === key) {
            last.sessions.push(s)
            last.games += s.games.length
        } else {
            groups.push({ key, label: `${Number(key.slice(0, 4))}년 ${Number(key.slice(5, 7))}월`, sessions: [s], games: s.games.length })
        }
    }
    return groups
}
