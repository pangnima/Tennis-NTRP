import { describe, expect, it } from 'vitest'
import type { PersonalMatchWinner } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'
import { buildHeadToHeadList } from './head-to-head'
import { selectRivals } from './rival'

const ME = 'me'

// 회원 상대 oppId와의 단식 한 게임(분해본)
function vs(id: string, oppId: string, winner: PersonalMatchWinner): SettledPersonalMatch {
    return {
        id, userId: ME, opponentUserId: oppId, opponentName: oppId,
        playedAt: '2026-06-01', matchType: 'singles',
        setScores: [{ me: winner === 'me' ? 6 : 4, opp: winner === 'me' ? 4 : 6 }], winner, createdAt: '2026-06-01',
    }
}

// 상대 oppId에 대해 wins승/losses패 게임 생성
function vsRecord(oppId: string, wins: number, losses: number): SettledPersonalMatch[] {
    const out: SettledPersonalMatch[] = []
    for (let i = 0; i < wins; i++) out.push(vs(`${oppId}-w${i}`, oppId, 'me'))
    for (let i = 0; i < losses; i++) out.push(vs(`${oppId}-l${i}`, oppId, 'opponent'))
    return out
}

describe('selectRivals (승률 45~55% 박빙)', () => {
    const bundle = {
        personalMatches: [
            ...vsRecord('even', 3, 3),   // 50% (6경기) — 가장 박빙
            ...vsRecord('low', 5, 6),    // 45% (11경기)
            ...vsRecord('high', 6, 5),   // 55% (11경기)
            ...vsRecord('strong', 7, 3), // 70% — 밴드 밖 제외
            ...vsRecord('few', 1, 1),    // 2경기 — minGames 미만 제외
        ],
    }

    it('45~55%만 포함하고 50%에 가까운 순으로 정렬', () => {
        const h2h = buildHeadToHeadList(bundle)
        const rivals = selectRivals(bundle, h2h, new Map(), 3)
        expect(rivals.map((r) => r.key)).toContain('even')
        expect(rivals.map((r) => r.key)).not.toContain('strong')
        expect(rivals.map((r) => r.key)).not.toContain('few')
        expect(rivals[0].key).toBe('even') // 50% 가장 박빙
        expect(rivals.every((r) => r.winRate >= 45 && r.winRate <= 55)).toBe(true)
        expect(rivals[0].last5).toHaveLength(5)
        expect(rivals[0].lastDate).toBe('2026-06-01')
    })

    it('박빙 상대가 없으면 빈 배열', () => {
        const onlyStrong = { personalMatches: vsRecord('strong', 8, 2) }
        const h2h = buildHeadToHeadList(onlyStrong)
        expect(selectRivals(onlyStrong, h2h, new Map(), 3)).toEqual([])
    })
})
