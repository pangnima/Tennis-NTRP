import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'

// ── 번들 구성 타입 ──────────────────────────────────────
// 개인 경기는 분해본(게임 1건 = 세트 1개 + winner)만 받는다 — explodePersonalMatchSets 산출
export type BundleWithPersonal = { personalMatches: SettledPersonalMatch[] }
export type BundleWithUserMap = { userMap: Map<string, { ntrp?: number }> }

// ── 공통 승패 타입 ──────────────────────────────────────
export type WinLoss = {
    wins: number
    losses: number
    draws: number
    total: number
    winRate: number   // decisive 기준 (draws 제외)
}

export function calcWinRate(wins: number, losses: number): number {
    const decisive = wins + losses
    if (decisive === 0) return 0
    return Math.round((wins / decisive) * 100)
}

export function emptyWL(): WinLoss {
    return { wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 }
}

export function addOutcome(wl: WinLoss, o: 'win' | 'loss' | 'draw') {
    wl.total++
    if (o === 'win') wl.wins++
    else if (o === 'loss') wl.losses++
    else wl.draws++
}
