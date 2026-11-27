import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { parseSnapshot, type GameEdit } from '@/lib/games/history'
import { mapGameRow, mapGamesJson } from '@/lib/games/map'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { Game, MatchType } from '@/types'

/**
 * 한 회원이 뛴 게임 전부(최신순) — 통계·전적 목록·홈의 재료. 본인은 언제나, 타인은 통계 비공개·탈퇴면 빈 배열
 * (`get_user_games`가 가른다). 관점은 호출부가 `toPersonalMatches`로 만든다.
 */
export async function fetchUserGames(userId: string): Promise<Game[]> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_games', { p_user_id: userId })
    if (error) return []
    return mapGamesJson(data)
}

/**
 * 테이블에서 직접 읽는 판본 — 레이팅 재계산 전용. service_role 클라이언트(RLS 우회)로 남의 게임도 읽어야 해서
 * `auth.uid()`에 기대는 RPC를 쓸 수 없다. 사용자 클라이언트를 넘기면 RLS가 본인이 뛴 게임으로 좁힌다.
 */
export async function fetchGamesByPlayer(supabase: SupabaseClient<Database>, userId: string): Promise<Game[]> {
    const { data: seats } = await supabase.from('game_players').select('game_id').eq('user_id', userId)
    const ids = (seats ?? []).map((s) => s.game_id)
    if (ids.length === 0) return []
    const { data } = await supabase.from('games').select('*, players:game_players(*)').in('id', ids)
    return (data ?? []).map((row) => mapGameRow(row, row.players))
}

/** 게임 한 건(수정 화면) — RLS가 볼 수 있는 사람(참가자·매칭 멤버)으로 좁힌다. */
export async function fetchGameById(gameId: string): Promise<Game | null> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('games')
        .select('*, players:game_players(*), match:matches(confirmed_at)')
        .eq('id', gameId)
        .maybeSingle()
    if (!data) return null
    return mapGameRow(data, data.players, { matchConfirmed: data.match?.confirmed_at != null })
}

/**
 * 내 묶음에 붙을 수정 기록(0105, 최근 300줄) — 내가 선수였던 게임의 기록 + 내가 뛴 매칭의 기록.
 * 볼 수 있는 범위는 RLS가 정한다(`game_edits_select`). 고친 사람 이름은 한 번에 읽어 붙인다.
 */
export async function fetchGameEdits(viewerId: string, matchIds: string[]): Promise<GameEdit[]> {
    const supabase = await createClient()
    const base = supabase.from('game_edits').select('*').order('created_at', { ascending: false }).limit(300)
    const { data } = await (matchIds.length > 0
        ? base.or(`member_ids.cs.{${viewerId}},match_id.in.(${matchIds.join(',')})`)
        : base.contains('member_ids', [viewerId]))
    const rows = data ?? []
    const actorIds = [...new Set(rows.flatMap((r) => (r.actor_id ? [r.actor_id] : [])))]
    const { data: actors } = actorIds.length > 0 ? await supabase.from('users').select('id, name').in('id', actorIds) : { data: [] }
    const nameOf = new Map((actors ?? []).map((u) => [u.id, u.name]))
    return rows.map((r) => ({
        id: r.id,
        gameId: r.game_id,
        matchId: r.match_id ?? undefined,
        actorName: r.actor_id ? nameOf.get(r.actor_id) : undefined,
        action: r.action === 'delete' ? 'delete' : 'edit',
        before: parseSnapshot(r.before),
        after: r.after == null ? undefined : parseSnapshot(r.after),
        matchType: r.match_type as MatchType,
        playedAt: r.played_at,
        playedTime: r.played_time?.slice(0, 5) ?? undefined,
        courtName: r.court_name ?? undefined,
        courtNo: r.court_no ?? undefined,
        createdAt: r.created_at,
    }))
}