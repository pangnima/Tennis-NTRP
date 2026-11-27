import { describe, expect, it } from 'vitest'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import { aggregateHourHeatmap } from './hour-heatmap'

const TODAY = '2026-06-30'

function personal(id: string, playedAt: string, playedTime?: string): SettledPersonalMatch {
    return { id, userId: 'me', opponentName: 'X', playedAt, playedTime, matchType: 'singles', setScores: [{ me: 6, opp: 4 }], winner: 'me', createdAt: playedAt }
}

const EMPTY = { personalMatches: [] as SettledPersonalMatch[] }

describe('aggregateHourHeatmap', () => {
    it('개인 경기 시각을 요일×시간에 배치', () => {
        const r = aggregateHourHeatmap(
            { ...EMPTY, personalMatches: [personal('p1', '2026-06-15', '18:30')] },
            TODAY, 90,
        )
        // 2026-06-15는 월요일(0), 18시
        expect(r.grid[0][18]).toBe(1)
        expect(r.totalGames).toBe(1)
        expect(r.mostActive).toEqual({ weekday: 0, hour: 18 })
    })

    it('시간 미입력은 untimed로만 카운트', () => {
        const r = aggregateHourHeatmap(
            { ...EMPTY, personalMatches: [personal('p1', '2026-06-15')] },
            TODAY, 90,
        )
        expect(r.untimed).toBe(1)
        expect(r.totalGames).toBe(0)
        expect(r.maxCount).toBe(0)
    })

    it('기간(sinceDays) 밖 경기는 제외', () => {
        const r = aggregateHourHeatmap(
            { ...EMPTY, personalMatches: [personal('p1', '2026-01-01', '10:00')] },
            TODAY, 28,  // 최근 4주
        )
        expect(r.totalGames).toBe(0)
        expect(r.untimed).toBe(0)
    })
})
