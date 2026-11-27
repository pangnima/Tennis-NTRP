'use server'

import { revalidatePath } from 'next/cache'

import { gameErrorMessage } from '@/lib/games/errors'
import { cleanSets, validateRecordInput, validateSets, type RecordInput } from '@/lib/games/input'
import { recomputePersonalNtrpFor } from '@/lib/games/recompute'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, GameSet } from '@/types'

type ActionResult = { error: string | null }

const LOGIN_REQUIRED = '로그인이 필요합니다.'

/** 게임 쓰기는 홈·내 경기·통계·매칭 상세를 한꺼번에 바꾼다 — 경로를 세지 않고 (main) 전체를 무효화한다. */
function revalidateAll(): void {
    revalidatePath('/', 'layout')
}

function asIds(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/**
 * 경기 기록(직접 기록 — 매칭 없이 친 경기). 공통 정보 + **게임 배열**을 한 번에 받아 게임마다 한 줄로 넣는다(0105 —
 * 한 게임 = 스코어 하나, 게임마다 대진이 다를 수 있다). 저장되는 순간 참가 회원 전원의 전적·통계에 반영된다
 * (확인 단계 없음, 틀리면 참가자 누구나 고친다). 매칭 안의 게임은 `saveMatchBoardAction`(save_match_games).
 */
export async function recordGameAction(input: RecordInput): Promise<ActionResult & { gameIds?: string[] }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }

    const invalid = validateRecordInput(input, user.id)
    if (invalid) return { error: invalid }

    const { data, error } = await supabase.rpc('record_game', {
        p_match_type: input.matchType,
        p_played_at: input.playedAt ?? null,
        p_played_time: input.playedTime ?? null,
        p_duration_minutes: input.durationMinutes ?? null,
        p_surface: input.surface ?? null,
        p_court_name: input.courtName ?? null,
        p_court_no: input.courtNo ?? null,
        p_notes: input.notes ?? null,
        p_games: input.games.map((g) => ({
            players: g.players.map((p) =>
                p.userId
                    ? { team: p.team, slot: p.slot, userId: p.userId }
                    : { team: p.team, slot: p.slot, name: p.name?.trim(), hand: p.hand ?? null, ntrp: p.ntrp ?? null, gender: p.gender ?? null },
            ),
            sets: cleanSets(g.sets, input.matchType),
        })),
    })
    if (error) return { error: gameErrorMessage(error.message, '경기를 저장하지 못했습니다.') }

    const result = (data ?? {}) as { gameIds?: unknown; memberIds?: unknown }
    await recomputePersonalNtrpFor(asIds(result.memberIds))
    revalidateAll()
    return { error: null, gameIds: asIds(result.gameIds) }
}

export type GameUpdateInput = {
    /** 스코어 하나 */
    sets: GameSet[]
    notes?: string
    // 매칭 밖 게임만 고칠 수 있다(매칭 게임은 매칭 값을 따른다 — DB가 무시한다)
    playedAt?: string
    playedTime?: string
    durationMinutes?: number
    surface?: CourtSurface
    courtName?: string
    courtNo?: string
}

/** 스코어·메모 수정. 선수 구성은 못 바꾼다 — 지우고 다시 기록한다. 고치면 다른 참가자에게 알림이 간다. */
export async function updateGameAction(gameId: string, input: GameUpdateInput): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }

    const invalid = validateSets(input.sets)
    if (invalid) return { error: invalid }

    const { data, error } = await supabase.rpc('update_game', {
        p_game_id: gameId,
        p_sets: input.sets,
        p_notes: input.notes ?? null,
        p_played_at: input.playedAt ?? null,
        p_played_time: input.playedTime ?? null,
        p_surface: input.surface ?? null,
        p_court_name: input.courtName ?? null,
        p_duration_minutes: input.durationMinutes ?? null,
        p_court_no: input.courtNo?.trim() || null,
    })
    if (error) return { error: gameErrorMessage(error.message, '경기를 수정하지 못했습니다.') }

    await recomputePersonalNtrpFor(asIds(data))
    revalidateAll()
    return { error: null }
}

export async function deleteGameAction(gameId: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }

    const { data, error } = await supabase.rpc('delete_game', { p_game_id: gameId })
    if (error) return { error: gameErrorMessage(error.message, '경기를 삭제하지 못했습니다.') }

    await recomputePersonalNtrpFor(asIds(data))
    revalidateAll()
    return { error: null }
}

/** 매칭 밖 게임의 확정(잠금)/확정 취소 — 기록한 사람만. */
export async function setGameLockedAction(gameId: string, locked: boolean): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }

    const { error } = await supabase.rpc('set_game_locked', { p_game_id: gameId, p_locked: locked })
    if (error) return { error: gameErrorMessage(error.message, '처리하지 못했습니다.') }

    revalidateAll()
    return { error: null }
}
