import type { MatchType } from '@/types'

type MatchTypeStats = {
    matchType: MatchType
    wins: number
    losses: number
    draws: number
    totalMatches: number
    winRate: number
    setsWon: number
    setsLost: number
}

export type PlayerStats = {
    wins: number
    losses: number
    draws: number
    totalMatches: number
    winRate: number
    setsWon: number
    setsLost: number
    byMatchType: MatchTypeStats[]
}

/**
 * 승률(%) — 무승부는 분모에서 뺀다(승 ÷ (승 + 패), 반올림). 승패가 하나도 없으면 null.
 * 0으로 그려야 하는 자리(통계 집계·차트)는 `?? 0`으로 받는다.
 */
export function winRateOf(wins: number, losses: number): number | null {
    const decisive = wins + losses
    return decisive === 0 ? null : Math.round((wins / decisive) * 100)
}

export const EMPTY_PLAYER_STATS: PlayerStats = {
    wins: 0,
    losses: 0,
    draws: 0,
    totalMatches: 0,
    winRate: 0,
    setsWon: 0,
    setsLost: 0,
    byMatchType: [],
}

/** 여러 PlayerStats를 합산해 '전체' 카드용 단일 PlayerStats 생성. winRate는 무승부 제외 재계산. */
export function combinePlayerStats(...parts: PlayerStats[]): PlayerStats {
    const a = parts.reduce(
        (s, p) => ({
            wins: s.wins + p.wins,
            losses: s.losses + p.losses,
            draws: s.draws + p.draws,
            totalMatches: s.totalMatches + p.totalMatches,
            setsWon: s.setsWon + p.setsWon,
            setsLost: s.setsLost + p.setsLost,
        }),
        { wins: 0, losses: 0, draws: 0, totalMatches: 0, setsWon: 0, setsLost: 0 },
    )
    const decisive = a.wins + a.losses
    return {
        ...a,
        winRate: decisive === 0 ? 0 : Math.round((a.wins / decisive) * 100),
        byMatchType: [],
    }
}

// ── 코트 통계 타입 (queries/stats.ts에서 이동) ──────────────────────
export type CourtStat = { matches: number; wins: number; losses: number; draws: number }

export type DoublesCourtStats = { ad: CourtStat; deuce: CourtStat }
