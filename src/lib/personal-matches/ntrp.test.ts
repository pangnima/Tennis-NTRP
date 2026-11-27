import { describe, expect, it } from 'vitest'
import { derivePublicNtrp } from './ntrp'

describe('derivePublicNtrp (DB derive_public_ntrp 미러)', () => {
    it('공개 회원은 동적 개인 NTRP 우선', () => {
        expect(derivePublicNtrp({ ntrp: 3, personalNtrp: 3.42 })).toBe(3.42)
    })

    it('개인 NTRP가 없으면 자가선언 값', () => {
        expect(derivePublicNtrp({ ntrp: 3 })).toBe(3)
    })

    it('통계 비공개 회원은 개인 NTRP를 감추고 자가선언 값만', () => {
        expect(derivePublicNtrp({ ntrp: 3, personalNtrp: 3.42, statsHidden: true })).toBe(3)
    })

    it('통계 비공개 + 자가선언 값도 없으면 없음', () => {
        expect(derivePublicNtrp({ personalNtrp: 3.42, statsHidden: true })).toBeUndefined()
    })

    it('1.0~7.0 밖이면 없음 (game_players.ntrp check 범위)', () => {
        expect(derivePublicNtrp({ personalNtrp: 0.5 })).toBeUndefined()
        expect(derivePublicNtrp({ personalNtrp: 7.5 })).toBeUndefined()
        expect(derivePublicNtrp({ ntrp: 0 })).toBeUndefined()
    })

    it('값이 아예 없으면 없음 (게스트)', () => {
        expect(derivePublicNtrp({})).toBeUndefined()
    })
})

