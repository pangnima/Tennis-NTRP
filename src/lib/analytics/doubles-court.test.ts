import { describe, expect, it } from 'vitest'
import type { PersonalMatchSetScore, PersonalMatchWinner } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import { aggregateByDoublesCourtSide } from './doubles-court'

const ME = 'me'

// 개인 복식 경기 픽스처 (분해본 = 단일 세트)
function pmDoubles(
    set: PersonalMatchSetScore,
    winner: PersonalMatchWinner,
): SettledPersonalMatch {
    return {
        id: 'p', userId: ME, opponentName: 'X', playedAt: '2026-06-01',
        matchType: 'men_doubles', setScores: [set], winner, createdAt: '2026-06-01',
    }
}

function pmSingles(winner: PersonalMatchWinner): SettledPersonalMatch {
    return {
        id: 's', userId: ME, opponentName: 'X', playedAt: '2026-06-01',
        matchType: 'singles', setScores: [{ me: 6, opp: 4 }], winner, createdAt: '2026-06-01',
    }
}

describe('aggregateByDoublesCourtSide', () => {
    it('개인 복식 myAd=me → 애드 코트 집계', () => {
        const r = aggregateByDoublesCourtSide(
            { personalMatches: [pmDoubles({ me: 6, opp: 4, myAd: 'me' }, 'me')] },
        )
        expect(r.ad).toEqual({ matches: 1, wins: 1, losses: 0, draws: 0 })
        expect(r.deuce).toEqual({ matches: 0, wins: 0, losses: 0, draws: 0 })
    })

    it('개인 복식 myAd 미지정/파트너 → 듀스 코트 집계', () => {
        const r = aggregateByDoublesCourtSide({
            personalMatches: [
                pmDoubles({ me: 4, opp: 6 }, 'opponent'),                 // 미지정
                pmDoubles({ me: 6, opp: 6, myAd: 'partner' }, 'draw'),    // 파트너가 애드
            ],
        })
        expect(r.ad).toEqual({ matches: 0, wins: 0, losses: 0, draws: 0 })
        expect(r.deuce).toEqual({ matches: 2, wins: 0, losses: 1, draws: 1 })
    })

    it('단식 경기는 양쪽 모두 제외', () => {
        const r = aggregateByDoublesCourtSide({ personalMatches: [pmSingles('me')] })
        expect(r.ad.matches).toBe(0)
        expect(r.deuce.matches).toBe(0)
    })

    it('빈 입력 → 0 집계', () => {
        const r = aggregateByDoublesCourtSide({ personalMatches: [] })
        expect(r).toEqual({
            ad: { matches: 0, wins: 0, losses: 0, draws: 0 },
            deuce: { matches: 0, wins: 0, losses: 0, draws: 0 },
        })
    })
})
