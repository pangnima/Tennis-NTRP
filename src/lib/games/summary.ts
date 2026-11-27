/** 홈의 숫자 셋 — 경기 수·승률·승패. 세트 하나가 게임 하나다(통계 화면과 같은 단위). */
import { setsForSeat, findSeat } from '@/lib/games/perspective'
import type { Game } from '@/types'

export type GameSummary = { games: number; wins: number; losses: number; draws: number; winRate: number | null }

export function summarizeGames(games: Game[], userId: string): GameSummary {
    let wins = 0
    let losses = 0
    let draws = 0
    for (const g of games) {
        const seat = findSeat(g, userId)
        if (!seat) continue
        for (const s of setsForSeat(g, seat)) {
            if (s.me > s.opp) wins += 1
            else if (s.me < s.opp) losses += 1
            else draws += 1
        }
    }
    const decided = wins + losses
    return { games: wins + losses + draws, wins, losses, draws, winRate: decided > 0 ? Math.round((wins / decided) * 100) : null }
}
