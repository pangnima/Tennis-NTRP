import type { CourtStat, DoublesCourtStats } from '@/lib/stats'
import type { BundleWithPersonal } from '@/lib/analytics/shared'

type CourtSide = 'ad' | 'deuce'

function emptyCourtStat(): CourtStat {
    return { matches: 0, wins: 0, losses: 0, draws: 0 }
}

function tally(stat: CourtStat, outcome: 'win' | 'loss' | 'draw') {
    stat.matches++
    if (outcome === 'win') stat.wins++
    else if (outcome === 'loss') stat.losses++
    else stat.draws++
}

/**
 * 복식 경기(분해본)를 사용자가 맡은 코트 사이드(애드=백 / 듀스=포)별로 집계.
 * - setScores[0].myAd === 'me' 이면 애드, 그 외(파트너/미지정)는 듀스.
 *   → 코트 미지정 세트는 듀스에 포함(DoublesCourtStatsCard 정책과 일치).
 * - 단식은 제외.
 */
export function aggregateByDoublesCourtSide(bundle: BundleWithPersonal): DoublesCourtStats {
    const result: DoublesCourtStats = { ad: emptyCourtStat(), deuce: emptyCourtStat() }

    for (const pm of bundle.personalMatches) {
        if (pm.matchType === 'singles') continue
        const side: CourtSide = pm.setScores[0]?.myAd === 'me' ? 'ad' : 'deuce'
        const outcome = pm.winner === 'me' ? 'win' : pm.winner === 'opponent' ? 'loss' : 'draw'
        tally(result[side], outcome)
    }

    return result
}
