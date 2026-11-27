import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/supabase'

/** 초대 링크 착지 주소 — `/matches/join/<token>` */
const INVITE_LANDING = /^\/matches\/join\/([0-9A-Za-z]{8,64})$/

/**
 * 로그인·가입·프로필 완성 직후의 착지 주소(0108). 가려던 곳이 **초대 링크**면 그 자리에서 참가시키고 매칭 주소를 돌려준다.
 *
 * 서버 액션의 `redirect()`는 클라이언트 내비게이션이다 — 라우트 핸들러 주소(`/matches/join/<token>`)로 보내면 핸들러의 307을
 * 따라가 화면은 매칭 상세인데 **주소창에는 초대 주소가 남는다**. 그 상태로 화면을 새로 그리면 참가를 다시 시도한다
 * (나가거나 내보내진 뒤에도). 그래서 액션이 직접 참가시키고 진짜 주소로 보낸다. 링크를 직접 연 경우는 핸들러가 맡는다.
 */
export async function resolveInviteLanding(supabase: SupabaseClient<Database>, next: string): Promise<string> {
    const token = INVITE_LANDING.exec(next)?.[1]
    if (!token) return next
    const { data, error } = await supabase.rpc('join_match', { p_token: token })
    const matchId = (data as { matchId?: string } | null)?.matchId
    return error || !matchId ? '/matches?error=invite' : `/matches/${matchId}`
}
