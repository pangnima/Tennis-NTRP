'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import type { BoardDiff, SavedRef } from '@/lib/games/board'
import { gameErrorMessage } from '@/lib/games/errors'
import { recomputePersonalNtrpFor } from '@/lib/games/recompute'
import { validateMatchPassword } from '@/lib/matches/password'
import { COURT_NO_MAX } from '@/lib/matches/court'
import { CAPACITY_MAX, CAPACITY_MIN, COURT_FEE_MAX } from '@/lib/matches/fee'
import { INVITE_COOKIE_MAX_AGE, inviteGuestCookie, inviteMeCookie } from '@/lib/matches/invite'
import { validateMatchTitle } from '@/lib/matches/title'
import { createClient } from '@/lib/supabase/server'
import type { CourtSurface, MatchType } from '@/types'
import type { Json } from '@/types/supabase'

type ActionResult = { error: string | null }

const LOGIN_REQUIRED = '로그인이 필요합니다.'

export type MatchInput = {
    /** 방 제목(0101) — 필수, 1~40자 */
    title: string
    matchType: MatchType
    playedAt: string
    playedTime: string
    durationMinutes: number
    surface?: CourtSurface
    /** 코트명(0102) — 매칭은 필수. 저장할 때 DB가 같은 코트의 대표 철자로 맞춘다 */
    courtName: string
    /** 코트 번호 — 선택, 10자 */
    courtNo?: string
    /** 코트 비용 총액(원, 0104) — 선택. 비우면 「코트비 미정」으로 보인다 */
    courtFee?: number
    /** 정원(호스트 포함) — 기본 단식 2 · 복식 4 */
    capacity: number
    notes?: string
    isListed: boolean
    /** 비공개 매칭의 입장 비밀번호(공개면 무시). 수정에서 비공개를 유지할 때는 비우면 그대로 */
    password?: string
    inviteeIds: string[]
}

/** passwordOptional — 수정 화면에서 이미 비공개인 매칭을 비공개로 둘 때(비우면 지금 비밀번호를 그대로 쓴다) */
function validate(input: MatchInput, passwordOptional = false): string | null {
    const title = validateMatchTitle(input.title)
    if (title) return title
    if (!input.playedAt) return '경기 날짜를 선택해주세요.'
    if (!input.playedTime) return '시작 시각을 선택해주세요.'
    if (!input.surface) return '코트 표면을 선택해주세요.'
    if (!input.courtName.trim()) return '코트명을 적어 주세요 — 신청하는 사람이 어디서 치는지 알아야 합니다.'
    if ((input.courtNo ?? '').trim().length > COURT_NO_MAX) return `코트 번호는 ${COURT_NO_MAX}자까지 적을 수 있습니다.`
    if (input.courtFee != null && !(Number.isInteger(input.courtFee) && input.courtFee >= 0 && input.courtFee <= COURT_FEE_MAX)) {
        return '코트 비용은 숫자로 0~1,000만 원까지 적을 수 있습니다.'
    }
    if (!(Number.isInteger(input.capacity) && input.capacity >= CAPACITY_MIN && input.capacity <= CAPACITY_MAX)) {
        return `인원은 ${CAPACITY_MIN}~${CAPACITY_MAX}명으로 정해 주세요.`
    }
    if (input.inviteeIds.length > 50) return '한 번에 50명까지 초대할 수 있습니다.'
    if (input.isListed || (passwordOptional && !input.password)) return null
    return validateMatchPassword(input.password ?? '')
}

function revalidateAll(): void {
    revalidatePath('/', 'layout')
}

async function callRpc(run: (supabase: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: { message: string } | null }>, fallback: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }
    const { error } = await run(supabase)
    if (error) return { error: gameErrorMessage(error.message, fallback) }
    revalidateAll()
    return { error: null }
}

/** 매칭 만들기 — 일정과 장소를 정하고 사람을 부른다. 초대한 회원은 곧바로 참가자가 된다(수락 단계 없음). */
export async function createMatchAction(input: MatchInput): Promise<ActionResult & { matchId?: string }> {
    const invalid = validate(input)
    if (invalid) return { error: invalid }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }

    const { data, error } = await supabase.rpc('create_match', {
        p_title: input.title.trim(),
        p_match_type: input.matchType,
        p_played_at: input.playedAt,
        p_played_time: input.playedTime,
        p_duration_minutes: input.durationMinutes,
        p_surface: input.surface ?? null,
        p_court_name: input.courtName.trim(),
        p_court_no: input.courtNo?.trim() || null,
        p_court_fee: input.courtFee ?? null,
        p_capacity: input.capacity,
        p_notes: input.notes ?? null,
        p_listed: input.isListed,
        p_invitee_ids: input.inviteeIds,
        p_password: input.isListed ? null : input.password ?? null,
    })
    if (error) return { error: gameErrorMessage(error.message, '매칭을 만들지 못했습니다.') }
    revalidateAll()
    return { error: null, matchId: data }
}

/** 공개 매칭에 참가 신청 — 호스트가 승인하면 참가자가 된다(0099). 호스트에게 알림이 간다 */
export async function applyMatchAction(matchId: string): Promise<ActionResult> {
    return callRpc((s) => s.rpc('apply_match', { p_match_id: matchId }), '신청하지 못했습니다.')
}

export async function cancelApplicationAction(matchId: string): Promise<ActionResult> {
    return callRpc((s) => s.rpc('cancel_application', { p_match_id: matchId }), '신청을 취소하지 못했습니다.')
}

/** 호스트의 [승인]/[거절] */
export async function decideApplicationAction(matchId: string, userId: string, approve: boolean): Promise<ActionResult> {
    return callRpc((s) => s.rpc('decide_application', { p_match_id: matchId, p_user_id: userId, p_approve: approve }), '처리하지 못했습니다.')
}

/** 호스트의 [내보내기] — 이미 기록된 게임은 남는다 */
export async function removeMatchMemberAction(matchId: string, userId: string): Promise<ActionResult> {
    return callRpc((s) => s.rpc('remove_match_member', { p_match_id: matchId, p_user_id: userId }), '내보내지 못했습니다.')
}

/** 호스트가 비공개 매칭의 비밀번호를 바꾼다 */
export async function setMatchPasswordAction(matchId: string, password: string): Promise<ActionResult> {
    const invalid = validateMatchPassword(password)
    if (invalid) return { error: invalid }
    return callRpc((s) => s.rpc('set_match_password', { p_match_id: matchId, p_password: password }), '비밀번호를 바꾸지 못했습니다.')
}

type JoinResult = { status?: string; matchId?: string } | null

/**
 * 비공개 매칭에 비밀번호로 입장 — 맞으면 바로 참가자. 틀린 비밀번호는 DB가 오류가 아니라 값으로 돌려준다
 * (오류로 끝내면 시도 횟수까지 되돌아가 제한이 걸리지 않는다). 10분에 10번을 넘기면 rate_limited.
 */
export async function joinMatchByPasswordAction(matchId: string, password: string): Promise<ActionResult> {
    if (!password) return { error: '비밀번호를 입력해 주세요.' }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }
    const { data, error } = await supabase.rpc('join_match', { p_match_id: matchId, p_password: password })
    if (error) return { error: gameErrorMessage(error.message, '입장하지 못했습니다.') }
    if ((data as JoinResult)?.status === 'wrong_password') return { error: '비밀번호가 맞지 않습니다.' }
    revalidateAll()
    return { error: null }
}

/** 초대 링크로 참가 — 비공개 매칭도 토큰이 맞으면 들어간다. 성공하면 매칭 id를 돌려준다. */
export async function joinMatchByTokenAction(token: string): Promise<ActionResult & { matchId?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED }
    const { data, error } = await supabase.rpc('join_match', { p_token: token })
    if (error) return { error: gameErrorMessage(error.message, '참가하지 못했습니다.') }
    revalidateAll()
    return { error: null, matchId: (data as JoinResult)?.matchId }
}

/** 비회원 한 명의 입력 — 참가자 표·보드·초대 화면이 같은 모양으로 보낸다 */
export type GuestInput = { name: string; ntrp: number; gender?: 'male' | 'female'; hand?: 'right' | 'left' }

function validateGuest(guest: GuestInput): string | null {
    const name = guest.name.trim()
    if (name.length < 1 || name.length > 20) return '이름을 1~20자로 적어 주세요.'
    if (!Number.isFinite(guest.ntrp) || guest.ntrp < 1 || guest.ntrp > 7) return 'NTRP는 1.0~7.0 사이로 적어 주세요.'
    return null
}

/**
 * 명단에 비회원 추가(0108) — 참가자 누구나. 정원에 포함되고, 정원이 찼거나 모집 마감이면 호스트만 넣을 수 있다(DB).
 * 참가자 표의 [+ 비회원 추가]와 보드의 [+ 비회원]이 같은 문을 쓴다 — 넣는 곳은 명단 하나.
 */
export async function addMatchGuestAction(matchId: string, guest: GuestInput): Promise<ActionResult> {
    const invalid = validateGuest(guest)
    if (invalid) return { error: invalid }
    return callRpc(
        (s) => s.rpc('add_match_guest', {
            p_match_id: matchId, p_name: guest.name.trim(), p_ntrp: guest.ntrp, p_gender: guest.gender ?? null, p_hand: guest.hand ?? null,
        }),
        '비회원을 추가하지 못했습니다.',
    )
}

/** 명단에서 비회원 빼기 — 호스트와 넣은 사람. 이미 기록된 게임은 남는다 */
export async function removeMatchGuestAction(guestId: string): Promise<ActionResult> {
    return callRpc((s) => s.rpc('remove_match_guest', { p_guest_id: guestId }), '빼지 못했습니다.')
}

/**
 * 초대 링크로 **비회원이 스스로** 참가(0108) — 로그인하지 않은 사람이 부른다(토큰이 열쇠, anon RPC).
 * 확정·모집 마감·정원은 DB가 막고, 한 매칭에 10분 10명을 넘기면 rate_limited.
 */
export async function joinMatchAsGuestAction(token: string, guest: GuestInput): Promise<ActionResult> {
    const invalid = validateGuest(guest)
    if (invalid) return { error: invalid }
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('join_match_as_guest', {
        p_token: token, p_name: guest.name.trim(), p_ntrp: guest.ntrp, p_gender: guest.gender ?? null, p_hand: guest.hand ?? null,
    })
    if (error) return { error: gameErrorMessage(error.message, '참가하지 못했습니다.') }
    // 이 기기가 등록한 사람을 기억한다(0109) — 다시 열면 버튼 대신 「OO님으로 참가 중」, [참가 취소]의 열쇠
    const guestId = (data as { guestId?: string } | null)?.guestId
    if (guestId) await setInviteCookie(inviteGuestCookie(token), guestId)
    revalidateAll()
    return { error: null }
}

async function setInviteCookie(name: string, value: string): Promise<void> {
    (await cookies()).set(name, value, {
        httpOnly: true, sameSite: 'lax', path: '/', maxAge: INVITE_COOKIE_MAX_AGE, secure: process.env.NODE_ENV === 'production',
    })
}

/** 초대 링크로 스스로 등록한 비회원의 [참가 취소](0109) — **등록한 기기에서만**(쿠키의 비회원 id가 열쇠). 게임은 남는다 */
export async function leaveMatchAsGuestAction(token: string): Promise<ActionResult> {
    const store = await cookies()
    const guestId = store.get(inviteGuestCookie(token))?.value
    if (!guestId) return { error: '이 기기에서 등록한 참가 기록이 없습니다. 호스트에게 요청해 주세요.' }
    const supabase = await createClient()
    const { error } = await supabase.rpc('leave_match_as_guest', { p_token: token, p_guest_id: guestId })
    if (error) return { error: gameErrorMessage(error.message, '취소하지 못했습니다.') }
    store.delete(inviteGuestCookie(token))
    revalidateAll()
    return { error: null }
}

/**
 * 다른 기기에서 「명단의 내 이름 고르기」(0109) — 쿠키에 이름만 적는다(DB를 쓰지 않는다). 보는 것(내 줄·내 게임 강조)만 달라지고
 * 아무것도 바꿀 수 없다 — 이름은 비밀이 아니다. `name`이 null이면 [내가 아니에요](지운다).
 */
export async function pickInviteGuestAction(token: string, name: string | null): Promise<ActionResult> {
    if (name === null) (await cookies()).delete(inviteMeCookie(token))
    else await setInviteCookie(inviteMeCookie(token), name.trim().slice(0, 20))
    return { error: null }
}

export async function leaveMatchAction(matchId: string): Promise<ActionResult> {
    return callRpc((s) => s.rpc('leave_match', { p_match_id: matchId }), '나가지 못했습니다.')
}

export async function addMatchMembersAction(matchId: string, userIds: string[]): Promise<ActionResult> {
    if (userIds.length === 0) return { error: '초대할 회원을 선택해주세요.' }
    return callRpc((s) => s.rpc('add_match_members', { p_match_id: matchId, p_user_ids: userIds }), '초대하지 못했습니다.')
}

/** 호스트의 최종 확정(잠금)/확정 취소 */
export async function setMatchConfirmedAction(matchId: string, confirmed: boolean): Promise<ActionResult> {
    return callRpc((s) => s.rpc('set_match_confirmed', { p_match_id: matchId, p_confirmed: confirmed }), '처리하지 못했습니다.')
}

export async function deleteMatchAction(matchId: string): Promise<ActionResult> {
    return callRpc((s) => s.rpc('delete_match', { p_match_id: matchId }), '매칭을 삭제하지 못했습니다.')
}

/**
 * 매칭 게임 보드 저장 — 바뀐 게임만 한 트랜잭션에(`save_match_games`). 대진만 바꾼 저장은 알림이 가지 않고,
 * 스코어가 들어가면 참가자에게 알림이 한 번 간다. 영향받은 회원 전원의 레이팅 캐시를 한 번에 다시 계산한다.
 */
export async function saveMatchBoardAction(matchId: string, diff: BoardDiff): Promise<{ error: string | null; rows: SavedRef[] }> {
    if (diff.upserts.length === 0 && diff.deletes.length === 0) return { error: null, rows: [] }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: LOGIN_REQUIRED, rows: [] }
    const { data, error } = await supabase.rpc('save_match_games', {
        p_match_id: matchId,
        p_upserts: diff.upserts as unknown as Json,
        p_deletes: diff.deletes,
    })
    if (error) return { error: gameErrorMessage(error.message, '저장하지 못했습니다.'), rows: [] }
    // rows = upsert 순서대로 저장된 게임의 {id, version} — 보드가 그 줄의 기준만 바꾼다(게임별 저장)
    const result = data as { memberIds?: string[]; rows?: SavedRef[] } | null
    await recomputePersonalNtrpFor(result?.memberIds ?? [])
    revalidateAll()
    return { error: null, rows: result?.rows ?? [] }
}

/**
 * 호스트가 매칭 정보를 고친다(매칭 정보 수정 화면 — 제목·일시·장소·공개 범위·메모).
 * wasPrivate = 지금 비공개 — 비공개를 유지하면 비밀번호는 선택(비우면 그대로). 공개→비공개면 필수이고 대기 중 신청은 DB가 정리한다.
 */
export async function updateMatchAction(matchId: string, input: Omit<MatchInput, 'inviteeIds'>, wasPrivate: boolean): Promise<ActionResult> {
    const invalid = validate({ ...input, inviteeIds: [] }, wasPrivate)
    if (invalid) return { error: invalid }
    return callRpc(
        (s) => s.rpc('update_match', {
            p_match_id: matchId,
            p_title: input.title.trim(),
            p_match_type: input.matchType,
            p_played_at: input.playedAt,
            p_played_time: input.playedTime,
            p_duration_minutes: input.durationMinutes,
            p_surface: input.surface ?? null,
            p_court_name: input.courtName.trim(),
            p_court_no: input.courtNo?.trim() || null,
            p_court_fee: input.courtFee ?? null,
            p_capacity: input.capacity,
            p_notes: input.notes ?? null,
            p_listed: input.isListed,
            p_password: input.isListed ? null : input.password || null,
        }),
        '매칭을 수정하지 못했습니다.',
    )
}

/** 호스트의 [모집 마감] / [마감 해제] — 마감하면 대기 중 신청은 지워지고 신청자에게 알림이 간다(DB) */
export async function setMatchClosedAction(matchId: string, closed: boolean): Promise<ActionResult> {
    return callRpc((s) => s.rpc('set_match_closed', { p_match_id: matchId, p_closed: closed }), '처리하지 못했습니다.')
}
