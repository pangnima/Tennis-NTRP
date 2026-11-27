import { describe, expect, it } from 'vitest'

import { fromGames, guestKey } from '@/lib/games/board'

import { inviteGuestCookie, inviteJoinBlocked, inviteMeCookie, toInviteView } from './invite'

const MATCH_ROW = {
    id: 'm1', title: '혼복 모임', match_type: 'mixed_doubles', played_at: '2026-11-30', played_time: '10:00:00', duration_minutes: 120,
    surface: 'hard', court_name: '목동 실내코트', court_no: '12', court_fee: 40000, capacity: 4, notes: '캔볼 5000원',
    is_listed: true, confirmed_at: null, closed_at: null, created_at: '2026-11-27T00:00:00Z',
}
const PAYLOAD = {
    match: MATCH_ROW,
    hostName: '남자08',
    roster: [
        { key: 'aaa111', name: '남자08', gender: 'male', kind: 'host', deleted: false },
        { key: 'bbb222', name: '여자02', gender: 'female', kind: 'member', deleted: false },
        { key: 'guest:김손님', name: '김손님', gender: 'male', kind: 'guest', deleted: false },
    ],
    games: [{
        sets: [{ t1: 6, t2: 4, t1Ad: 2, t2Ad: 2 }],
        players: [
            { team: 1, slot: 1, member: true, key: 'aaa111', name: '남자08', gender: 'male' },
            { team: 1, slot: 2, member: false, key: 'guest:김손님', name: '김손님', gender: 'male' },
            { team: 2, slot: 1, member: true, key: 'bbb222', name: '여자02', gender: 'female' },
            { team: 2, slot: 2, member: false, key: 'guest:나간손님', name: '나간손님', gender: null },
        ],
    }],
}

describe('초대 링크로 읽는 매칭(0108)', () => {
    it('DB 결과를 매칭·명단·읽기 전용 보드의 모양으로 바꾼다', () => {
        const view = toInviteView(PAYLOAD)
        expect(view?.match).toMatchObject({ id: 'm1', title: '혼복 모임', playedTime: '10:00', capacity: 4, courtFee: 40000, hostId: '' })
        expect(view?.hostName).toBe('남자08')
        expect(view?.roster.map((r) => r.kind)).toEqual(['host', 'member', 'guest'])
        // 회원은 초대용 key를 userId 자리에 싣는다(진짜 회원 id가 아니다) — 비회원은 이름이 키
        expect(view?.pool).toEqual([
            { key: 'aaa111', userId: 'aaa111', name: '남자08', gender: 'male', isMember: true },
            { key: 'bbb222', userId: 'bbb222', name: '여자02', gender: 'female', isMember: true },
            { key: guestKey('김손님'), userId: undefined, name: '김손님', gender: 'male', isMember: false },
        ])
    })

    it('보드가 그대로 읽는다 — 명단에 없는(뺀) 비회원도 게임에는 남는다', () => {
        const view = toInviteView(PAYLOAD)!
        const { rows, pool } = fromGames(view.games, view.pool, view.match.matchType)
        expect(rows[0].slots).toEqual(['aaa111', guestKey('김손님'), 'bbb222', guestKey('나간손님')])
        expect(rows[0].scores).toEqual([{ t1: '6', t2: '4' }])
        expect(pool.map((p) => p.name)).toEqual(['남자08', '여자02', '김손님', '나간손님'])
    })

    it('이 기기가 기억하는 비회원(0109) — 등록한 기기는 owner, 이름만 고른 기기는 보기 전용', () => {
        expect(toInviteView(PAYLOAD)?.me).toBeUndefined()
        expect(toInviteView({ ...PAYLOAD, meKey: 'guest:김손님' })?.me).toEqual({ key: 'guest:김손님', name: '김손님', owner: true })
        expect(toInviteView(PAYLOAD, ' 김손님 ')?.me).toEqual({ key: 'guest:김손님', name: '김손님', owner: false })
        // 등록한 기기가 먼저다 · 명단에 없는 이름과 회원 이름은 인정하지 않는다
        expect(toInviteView({ ...PAYLOAD, meKey: 'guest:김손님' }, '나간손님')?.me?.owner).toBe(true)
        expect(toInviteView(PAYLOAD, '나간손님')?.me).toBeUndefined()
        expect(toInviteView(PAYLOAD, '남자08')?.me).toBeUndefined()
        expect(toInviteView({ ...PAYLOAD, meKey: 'guest:나간손님' })?.me).toBeUndefined()
    })

    it('쿠키 이름은 토큰마다 — 주소에서 온 값이라 글자·숫자만 쓴다', () => {
        expect(inviteGuestCookie('c6168fef19144175ac8b5b8071b42433')).toBe('invite_guest_c6168fef19144175')
        expect(inviteMeCookie('ab;c=d e/12')).toBe('invite_me_abcde12')
    })

    it('없는 토큰(null)·깨진 값은 null', () => {
        expect(toInviteView(null)).toBeNull()
        expect(toInviteView({ match: {} })).toBeNull()
    })

    it('새로 참가할 수 있나 — 확정·모집 마감·정원', () => {
        const view = toInviteView(PAYLOAD)!
        expect(inviteJoinBlocked(view)).toBe(false)
        expect(inviteJoinBlocked({ ...view, roster: [...view.roster, { key: 'guest:x', name: 'x', kind: 'guest', deleted: false }] })).toBe(true)
        expect(inviteJoinBlocked({ ...view, match: { ...view.match, closedAt: '2026-11-27T01:00:00Z' } })).toBe(true)
        expect(inviteJoinBlocked({ ...view, match: { ...view.match, confirmedAt: '2026-11-27T01:00:00Z' } })).toBe(true)
    })
})
