import { describe, expect, it } from 'vitest'

import { NOTIFICATION_TYPES, type NotificationPayload } from '@/types'

import { NOTIFICATION_LABEL, notificationHref, notificationLabel, notificationTitleLine } from './labels'

const SNAPSHOT: NotificationPayload = {
    playedAt: '2026-12-05', playedTime: '10:00', durationMinutes: 120, matchType: 'men_doubles',
    courtName: '올림픽공원 3번', hostName: '호스트', actorName: '김철수',
}

// 노출 문구에서 물러난 어휘 — 사라진 흐름(확인·이의·수락)과 옛 이름(방·방장·강퇴)을 다시 말하지 않는다.
// '승인'은 0099에서 돌아왔다(공개 매칭 참가 신청을 호스트가 승인한다 — 오너 결정). 내보낼 때는 '강퇴'가 아니라 '내보내기'.
const RETIRED_WORDS = ['방장', '강퇴', '클럽', '이의', '수락', '대진표', '룸']

describe('NOTIFICATION_LABEL', () => {
    it('모든 타입에 제목·본문이 있다', () => {
        for (const type of NOTIFICATION_TYPES) {
            const label = NOTIFICATION_LABEL[type](SNAPSHOT)
            expect(label.title.length, type).toBeGreaterThan(0)
            expect(label.body.length, type).toBeGreaterThan(0)
        }
    })

    it('물러난 어휘를 쓰지 않는다', () => {
        for (const type of NOTIFICATION_TYPES) {
            for (const payload of [SNAPSHOT, { ...SNAPSHOT, auto: true }]) {
                const { title, body } = NOTIFICATION_LABEL[type](payload)
                for (const word of RETIRED_WORDS) {
                    expect(title, `${type}.title`).not.toContain(word)
                    expect(body, `${type}.body`).not.toContain(word)
                }
            }
        }
    })

    it('행위자 이름이 없어도(탈퇴·시스템) 문장이 선다', () => {
        expect(notificationLabel({ type: 'game_recorded', payload: {} }).body).toContain('참가자님이')
        expect(notificationLabel({ type: 'match_confirmed', payload: { auto: true } }).body).toContain('자동')
    })

    it('비회원이 명단에 오른 것도 「새 참가자」다(0108) — 타입을 늘리지 않고 payload로 가른다', () => {
        const body = (payload: NotificationPayload) => notificationLabel({ type: 'match_joined', payload }).body
        expect(body({ actorName: '여자02' })).toBe('여자02님이 매칭에 참가했습니다.')
        expect(body({ actorName: '여자02', guestName: '김손님' })).toBe('여자02님이 비회원 김손님님을 참가자로 추가했습니다.')
        expect(body({ guestName: '김손님', viaLink: true })).toBe('비회원 김손님님이 초대 링크로 참가했습니다.')
        expect(notificationLabel({ type: 'match_left', payload: { guestName: '김손님' } }).body).toBe('비회원 김손님님이 참가를 취소했습니다.')
    })
})

describe('링크와 매칭 한 줄', () => {
    it('매칭이 있으면 그 매칭, 없으면 내 경기', () => {
        expect(notificationHref({ matchId: 'm1' })).toBe('/matches/m1')
        expect(notificationHref({ matchId: null })).toBe('/games')
    })

    it('스냅샷이 있으면 일시 · 코트 · 종목 한 줄, 없으면 null', () => {
        expect(notificationTitleLine(SNAPSHOT)).toContain('10:00~12:00')
        expect(notificationTitleLine({})).toBeNull()
    })
})
