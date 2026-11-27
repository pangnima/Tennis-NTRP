import { describe, expect, it } from 'vitest'

import type { Game } from '@/types'

import { summarizeGames } from './summary'

const game = (sets: Game['sets'], meTeam: 1 | 2): Game => ({
    id: Math.random().toString(), createdBy: 'me', matchType: 'singles', playedAt: '2026-11-25', sets,
    players: [{ team: meTeam, slot: 1, userId: 'me', name: '나' }, { team: meTeam === 1 ? 2 : 1, slot: 1, name: '상대' }],
    locked: false, createdAt: '',
})

describe('summarizeGames', () => {
    it('세트 단위로 세고, 내 팀 기준으로 승패를 읽는다', () => {
        const s = summarizeGames([game([{ t1: 6, t2: 4 }, { t1: 2, t2: 6 }], 1), game([{ t1: 6, t2: 0 }], 2), game([{ t1: 5, t2: 5 }], 1)], 'me')
        expect(s).toEqual({ games: 4, wins: 1, losses: 2, draws: 1, winRate: 33 })
    })

    it('기록이 없으면 승률은 null', () => {
        expect(summarizeGames([], 'me')).toEqual({ games: 0, wins: 0, losses: 0, draws: 0, winRate: null })
    })

    it('내가 뛰지 않은 게임은 세지 않는다', () => {
        expect(summarizeGames([game([{ t1: 6, t2: 0 }], 1)], 'other').games).toBe(0)
    })
})
