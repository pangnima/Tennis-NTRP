import { describe, expect, it } from 'vitest'
import {
    computeMatchDelta,
    expectedScore,
    marginFactor,
    pickK,
    roundRating,
} from './elo'
import { K_BASE, K_PROVISIONAL } from './constants'

describe('expectedScore', () => {
    it('동급은 0.5', () => {
        expect(expectedScore(2.5, 2.5)).toBeCloseTo(0.5, 6)
    })
    it('NTRP 1.0 차이는 강자 ≈ 0.909', () => {
        expect(expectedScore(4.0, 3.0)).toBeCloseTo(0.9091, 4)
    })
    it('NTRP 0.5 차이는 강자 ≈ 0.760', () => {
        expect(expectedScore(3.0, 2.5)).toBeCloseTo(0.7597, 4)
    })
})

describe('marginFactor', () => {
    it('압승(6-0,6-0)은 1.5', () => {
        expect(
            marginFactor([{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }], 'team1'),
        ).toBeCloseTo(1.5, 6)
    })
    it('박빙(7-6,6-7,7-6)은 ≈ 1.0', () => {
        const mf = marginFactor(
            [{ team1: 7, team2: 6 }, { team1: 6, team2: 7 }, { team1: 7, team2: 6 }],
            'team1',
        )
        expect(mf).toBeGreaterThanOrEqual(1.0)
        expect(mf).toBeLessThan(1.02)
    })
    it('무승부·스코어 없음은 1.0', () => {
        expect(marginFactor([{ team1: 6, team2: 6 }], 'draw')).toBe(1)
        expect(marginFactor([], 'team1')).toBe(1)
    })
})

describe('pickK', () => {
    it('잠정기(<10경기)는 0.10', () => {
        expect(pickK(0)).toBe(K_PROVISIONAL)
        expect(pickK(9)).toBe(K_PROVISIONAL)
    })
    it('정착(>=10경기)은 0.05', () => {
        expect(pickK(10)).toBe(K_BASE)
    })
})

describe('computeMatchDelta — docs §2.8 Worked Examples', () => {
    // 예시 1: 이변승. A 2.5 가 B 4.0 을 6-4,6-4 로 이김 (정착 K=0.05, mf=1.10).
    it('이변승은 +0.053', () => {
        const delta = computeMatchDelta({
            selfRating: 2.5,
            oppRating: 4.0,
            selfScore: 1,
            k: 0.05,
            margin: 1.1,
        })
        expect(delta).toBeCloseTo(0.0533, 3)
    })
    // 예시 2: 강자 예상 압승. B 4.0 이 A 2.5 를 6-1,6-2 로 이김 (K=0.05, mf=1.30).
    it('강자 압승은 거의 불변 +0.002', () => {
        const delta = computeMatchDelta({
            selfRating: 4.0,
            oppRating: 2.5,
            selfScore: 1,
            k: 0.05,
            margin: 1.3,
        })
        expect(delta).toBeCloseTo(0.002, 3)
    })
})

describe('roundRating', () => {
    it('소수점 3자리로 반올림', () => {
        expect(roundRating(2.57149)).toBe(2.571)
        expect(roundRating(2.5715)).toBe(2.572)
    })
})
