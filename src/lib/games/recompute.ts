import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { toPersonalMatches } from '@/lib/games/perspective'
import { explodePersonalMatchSets } from '@/lib/personal-matches/explode'
import { fetchGamesByPlayer } from '@/lib/queries/games'
import { roundRating } from '@/lib/rating/elo'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

async function recomputeOne(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
    const games = await fetchGamesByPlayer(supabase, userId)
    const matches = toPersonalMatches(games, userId)

    const memberIds = [...new Set(matches.flatMap((m) => [m.opponentUserId, m.opponent2UserId, m.partnerUserId, userId]))]
        .filter((id): id is string => !!id)
    const { data: members } = await supabase.from('users').select('id, ntrp').in('id', memberIds)
    const ntrpById = new Map<string, number>()
    for (const r of members ?? []) if (r.ntrp != null) ntrpById.set(r.id, r.ntrp)

    const snap = replayPersonalRatings(explodePersonalMatchSets(matches), ntrpById.get(userId) ?? null, (id) => ntrpById.get(id))
    // 표시용 3자리로 반올림해 캐시한다 — 원값(배정밀도)을 그대로 두면 이 값을 읽는 스냅샷·라벨에 긴 소수가 샌다
    const personalNtrp = snap.matchesPlayed > 0 ? roundRating(snap.rating) : null
    await supabase.from('users').update({ personal_ntrp: personalNtrp }).eq('id', userId)
}

/**
 * 게임을 기록·수정·삭제한 뒤 **참가 회원 전원**의 레이팅 캐시(`users.personal_ntrp`)를 다시 계산한다.
 * 랭킹과 다음 게임의 NTRP 스냅샷이 이 캐시를 읽으므로 행동한 사람 것만 고치면 남의 값이 낡는다.
 *
 * **service_role 키(`SUPABASE_SERVICE_ROLE_KEY`)가 꼭 있어야 한다**(0103) — `personal_ntrp`는 회원이 스스로 고칠 수 없게
 * DB 트리거(`guard_user_protected_columns`)가 잠갔다. 랭킹이 읽는 값이라 본인 세션으로 쓰게 두면 누구나 자기 레이팅을 올린다.
 * 키가 없으면 아무것도 갱신되지 않는다(백필 `npm run db:backfill-personal-ntrp`가 따라잡는다).
 * best-effort — 실패해도 이미 저장된 게임은 그대로다. 다음 쓰기나 백필이 따라잡는다.
 */
export async function recomputePersonalNtrpFor(memberIds: string[]): Promise<void> {
    try {
        const admin = createAdminClient()
        if (!admin) return
        await Promise.all([...new Set(memberIds)].map((id) => recomputeOne(admin, id)))
    } catch {
        // 캐시 갱신 실패는 본 작업 성공에 영향을 주지 않는다.
    }
}
