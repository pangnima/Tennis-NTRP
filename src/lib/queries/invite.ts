import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'

import { inviteGuestCookie, inviteMeCookie, toInviteView, type InviteView } from '@/lib/matches/invite'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 초대 링크의 매칭(0108) — **로그인 없이** 읽는다(토큰이 열쇠, anon RPC). 없는 토큰·종료 7일이 지난 매칭은 null.
 * 이 기기가 기억하는 비회원(0109)도 함께 본다: 등록한 기기는 쿠키의 비회원 id를 DB에 넘겨 확인받고(`meKey`),
 * 이름만 고른 기기는 그 이름이 명단의 비회원인지만 본다. 한 요청에서 메타데이터와 본문이 같이 읽어 `cache`로 한 번만 부른다.
 */
export const fetchInvitedMatch = cache(async (token: string): Promise<InviteView | null> => {
    const store = await cookies()
    const guestId = store.get(inviteGuestCookie(token))?.value
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_invited_match', {
        p_token: token,
        ...(guestId && UUID.test(guestId) ? { p_guest_id: guestId } : {}),
    })
    return error ? null : toInviteView(data, store.get(inviteMeCookie(token))?.value)
})
