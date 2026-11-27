import { describe, expect, it } from 'vitest'
import type { MatchType, PersonalMatchWinner } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import { aggregatePartnerChemistry } from './partner-chemistry'

const ME = 'me'

// 복식 한 게임(분해본): 내 파트너 = 회원 partner
function dbl(
    id: string,
    partner: string,
    winner: PersonalMatchWinner,
    playedAt: string,
    matchType: MatchType = 'men_doubles',
): SettledPersonalMatch {
    return {
        id, userId: ME, opponentName: 'x', opponent2Name: 'y',
        partnerUserId: partner, partnerName: partner,
        playedAt, matchType,
        setScores: [{ me: 6, opp: 4 }], winner, createdAt: playedAt,
    }
}

describe('aggregatePartnerChemistry', () => {
    it('minGames(3) 미만 파트너 제외', () => {
        const personalMatches = [
            dbl('m1', 'P', 'me', '2026-06-01'),
            dbl('m2', 'P', 'me', '2026-06-02'),
        ]
        expect(aggregatePartnerChemistry({ personalMatches }, 'male', 3)).toEqual([])
    })

    it('케미식 단위 검증: winRate=100, recent=100, total=20 → 100', () => {
        const personalMatches = Array.from({ length: 20 }, (_, i) =>
            dbl(`m${i}`, 'P', 'me', `2026-01-${String((i % 28) + 1).padStart(2, '0')}`))
        const r = aggregatePartnerChemistry({ personalMatches }, 'male', 3)
        expect(r[0].partnerId).toBe('P')
        expect(r[0].winRate).toBe(100)
        expect(r[0].chemistry).toBe(100)
    })

    it('현재 연승(streakType=W) 계산', () => {
        const personalMatches = [
            dbl('m1', 'P', 'opponent', '2026-06-01'), // 패(가장 과거)
            dbl('m2', 'P', 'me', '2026-06-02'),       // 승
            dbl('m3', 'P', 'me', '2026-06-03'),       // 승
            dbl('m4', 'P', 'me', '2026-06-04'),       // 승(최신)
        ]
        const r = aggregatePartnerChemistry({ personalMatches }, 'male', 3)
        expect(r[0].streakType).toBe('W')
        expect(r[0].currentStreak).toBe(3)
    })

    it('성별 필터: 여성은 여복+혼복만', () => {
        const personalMatches = [
            dbl('w1', 'P', 'me', '2026-05-01', 'women_doubles'),
            dbl('m1', 'Q', 'me', '2026-06-01'),
            dbl('m2', 'Q', 'me', '2026-06-02'),
            dbl('m3', 'Q', 'me', '2026-06-03'),
        ]
        const r = aggregatePartnerChemistry({ personalMatches }, 'female', 1)
        // 여성 필터 → 남복(Q) 제외, 여복(P)만
        expect(r).toHaveLength(1)
        expect(r.every((p) => p.matchType === 'women_doubles')).toBe(true)
    })

    it('외부 파트너(개인 복식, userId 없음)도 집계', () => {
        const personalMatches: SettledPersonalMatch[] = [1, 2, 3].map((i) => ({
            id: `p${i}`, userId: ME, opponentName: 'opp',
            partnerName: '김파트너',
            playedAt: `2026-06-0${i}`, matchType: 'men_doubles',
            setScores: [{ me: 6, opp: 4 }], winner: 'me', createdAt: `2026-06-0${i}`,
        }))
        const r = aggregatePartnerChemistry({ personalMatches }, 'male', 3)
        expect(r).toHaveLength(1)
        expect(r[0].partnerId).toBe('name:김파트너')
        expect(r[0].partnerName).toBe('김파트너')
    })
})
