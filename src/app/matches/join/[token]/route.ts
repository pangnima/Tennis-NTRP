import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * 초대 링크 착지 — 토큰이 맞으면 그 자리에서 참가시키고 매칭으로 보낸다(링크는 호스트만 건넬 수 있어 신청·비밀번호 없이 들어온다).
 * **비로그인이면 초대 화면(`/invite/<token>`)으로 보낸다**(0108) — 매칭 요약을 보여 주고 [회원으로 참가]/[비회원으로 참가]를 고르게 한다.
 * 로그인·가입을 마치면 이 주소로 돌아와(`next`) 바로 참가자가 된다. 미들웨어는 이 경로를 보호 라우트에서 뺀다.
 * 실패(잘못된 토큰·확정된 매칭·모집 마감 — 0101·정원)는 목록에서 한 줄로 알린다.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL(`/invite/${encodeURIComponent(token)}`, request.url))

    const { data, error } = await supabase.rpc('join_match', { p_token: token })
    const matchId = (data as { matchId?: string } | null)?.matchId
    if (error || !matchId) return NextResponse.redirect(new URL('/matches?error=invite', request.url))
    return NextResponse.redirect(new URL(`/matches/${matchId}`, request.url))
}
