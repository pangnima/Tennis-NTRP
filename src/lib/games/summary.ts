/** 홈의 숫자 셋 — 경기 수·승률·승패. 스코어 하나가 게임 하나다(통계 화면과 같은 단위). */
import { setsForSeat, findSeat } from '@/lib/games/perspective'
import { tallySets } from '@/lib/personal-matches/winner'
import { winRateOf } from '@/lib/stats'
import type { Game } from '@/types'

export type GameSummary = { games: number; wins: number; losses: number; draws: number; winRate: number | null }

export function summarizeGames(games: Game[], userId: string): GameSummary {
    let wins = 0
    let losses = 0
    let draws = 0
    for (const g of games) {
        const seat = findSeat(g, userId)
        if (!seat) continue
        const t = tallySets(setsForSeat(g, seat))
        wins += t.wins
        losses += t.losses
        draws += t.draws
    }
    return { games: wins + losses + draws, wins, losses, draws, winRate: winRateOf(wins, losses) }
}
