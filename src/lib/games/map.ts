/** DB 모양 → 도메인 타입. `get_user_games` RPC의 jsonb와 테이블 행(임베드) 두 입구가 같은 `Game`으로 모인다. */
import type { Database } from '@/types/supabase'
import type { CourtSurface, Game, GamePlayer, GameSet, MatchType, TennisMatch } from '@/types'

type GameRow = Database['public']['Tables']['games']['Row']
type PlayerRow = Database['public']['Tables']['game_players']['Row']
type MatchRow = Database['public']['Tables']['matches']['Row']

const hand = (v: unknown): GamePlayer['hand'] => (v === 'right' || v === 'left' ? v : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined)
const time = (v: unknown): string | undefined => str(v)?.slice(0, 5)

export function mapSets(raw: unknown): GameSet[] {
    if (!Array.isArray(raw)) return []
    return raw.flatMap((e) => {
        if (!e || typeof e !== 'object') return []
        const s = e as Record<string, unknown>
        if (typeof s.t1 !== 'number' || typeof s.t2 !== 'number') return []
        const out: GameSet = { t1: s.t1, t2: s.t2 }
        if (s.t1Ad === 1 || s.t1Ad === 2) out.t1Ad = s.t1Ad
        if (s.t2Ad === 1 || s.t2Ad === 2) out.t2Ad = s.t2Ad
        return [out]
    })
}

function mapPlayer(p: Record<string, unknown>): GamePlayer {
    return {
        team: p.team === 2 ? 2 : 1,
        slot: p.slot === 2 ? 2 : 1,
        userId: str(p.userId ?? p.user_id),
        name: str(p.name) ?? '',
        hand: hand(p.hand),
        ntrp: p.ntrp == null ? undefined : Number(p.ntrp),
        gender: p.gender === 'male' || p.gender === 'female' ? p.gender : undefined,
        deleted: p.deleted === true || undefined,
    }
}

const bySeat = (a: GamePlayer, b: GamePlayer) => a.team - b.team || a.slot - b.slot

/** `get_user_games`가 돌려주는 jsonb 배열(camelCase) */
export function mapGamesJson(raw: unknown): Game[] {
    if (!Array.isArray(raw)) return []
    return raw.map((e) => {
        const g = e as Record<string, unknown>
        const players = Array.isArray(g.players) ? g.players : []
        return {
            id: String(g.id),
            matchId: str(g.matchId),
            createdBy: String(g.createdBy),
            matchType: g.matchType as MatchType,
            playedAt: String(g.playedAt),
            playedTime: time(g.playedTime),
            durationMinutes: typeof g.durationMinutes === 'number' ? g.durationMinutes : undefined,
            surface: str(g.surface) as CourtSurface | undefined,
            courtName: str(g.courtName),
            courtNo: str(g.courtNo),
            notes: str(g.notes),
            sets: mapSets(g.sets),
            players: players.map((p) => mapPlayer(p as Record<string, unknown>)).sort(bySeat),
            updatedBy: str(g.updatedBy),
            updatedByName: str(g.updatedByName),
            updatedAt: str(g.updatedAt),
            locked: g.locked === true,
            createdAt: String(g.createdAt),
        }
    })
}

/** 테이블 행 + 참가자 임베드. `locked`는 매칭 확정 여부를 아는 호출부가 넘긴다. */
export function mapGameRow(
    row: GameRow,
    players: PlayerRow[],
    opts: { matchConfirmed?: boolean; updatedByName?: string } = {},
): Game {
    return {
        id: row.id,
        matchId: row.match_id ?? undefined,
        createdBy: row.created_by,
        matchType: row.match_type as MatchType,
        playedAt: row.played_at,
        playedTime: time(row.played_time),
        durationMinutes: row.duration_minutes ?? undefined,
        surface: (row.surface ?? undefined) as CourtSurface | undefined,
        courtName: row.court_name ?? undefined,
        courtNo: row.court_no ?? undefined,
        notes: row.notes ?? undefined,
        sets: mapSets(row.sets),
        players: players.map((p) => mapPlayer(p as unknown as Record<string, unknown>)).sort(bySeat),
        updatedBy: row.updated_by ?? undefined,
        updatedByName: opts.updatedByName,
        updatedAt: row.updated_at ?? undefined,
        locked: row.locked_at != null || opts.matchConfirmed === true,
        createdAt: row.created_at,
    }
}

export function mapMatchRow(row: MatchRow): TennisMatch {
    return {
        id: row.id,
        hostId: row.host_id,
        title: row.title ?? undefined,
        matchType: row.match_type as MatchType,
        playedAt: row.played_at,
        playedTime: time(row.played_time),
        durationMinutes: row.duration_minutes,
        surface: (row.surface ?? undefined) as CourtSurface | undefined,
        courtName: row.court_name ?? undefined,
        courtNo: row.court_no ?? undefined,
        courtFee: row.court_fee ?? undefined,
        capacity: row.capacity,
        notes: row.notes ?? undefined,
        isListed: row.is_listed,
        confirmedAt: row.confirmed_at ?? undefined,
        closedAt: row.closed_at ?? undefined,
        createdAt: row.created_at,
    }
}
