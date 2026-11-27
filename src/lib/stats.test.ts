import { describe, expect, it } from 'vitest'
import { combinePlayerStats, EMPTY_PLAYER_STATS, winRateOf } from './stats'

describe('winRateOf — 승 ÷ (승 + 패), 무승부는 분모에서 뺀다', () => {
    it('반올림한 정수 %', () => {
        expect(winRateOf(3, 1)).toBe(75)
        expect(winRateOf(1, 2)).toBe(33)
        expect(winRateOf(2, 1)).toBe(67)
        expect(winRateOf(5, 0)).toBe(100)
        expect(winRateOf(0, 4)).toBe(0)
    })
    it('승패가 하나도 없으면 null — 0으로 그리는 자리는 `?? 0`', () => {
        expect(winRateOf(0, 0)).toBeNull()
        expect(winRateOf(0, 0) ?? 0).toBe(0)
    })
})

describe('combinePlayerStats — 합산 후 승률 재계산', () => {
    it('무승부는 분모에서 빠진다', () => {
        const a = { ...EMPTY_PLAYER_STATS, wins: 2, losses: 1, draws: 3, totalMatches: 6 }
        const b = { ...EMPTY_PLAYER_STATS, wins: 1, losses: 0, totalMatches: 1 }
        const total = combinePlayerStats(a, b)
        expect(total).toMatchObject({ wins: 3, losses: 1, draws: 3, totalMatches: 7, winRate: 75 })
    })
    it('0경기면 0', () => expect(combinePlayerStats(EMPTY_PLAYER_STATS).winRate).toBe(0))
})
