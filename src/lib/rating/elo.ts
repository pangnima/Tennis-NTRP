// 레이팅 공용 primitive(NTRP 스케일 ELO) — 개인 레이팅(personal-rating.ts)이 경기마다 쓴다. docs/rating-system.md §2

import {
    DEFAULT_RATING,
    K_BASE,
    K_PROVISIONAL,
    MARGIN_WEIGHT,
    MAX_RATING,
    MIN_RATING,
    PROVISIONAL_THRESHOLD,
    RATING_SCALE_D,
} from './constants'

type WinnerSide = 'team1' | 'team2' | 'draw'
type SetScore = { team1: number; team2: number }

// ── 순수 계산 함수 ──────────────────────────────────────

/** rSelf 입장에서 rOpp 상대로의 기대 승률 (ELO). */
export function expectedScore(rSelf: number, rOpp: number): number {
    return 1 / (1 + Math.pow(10, (rOpp - rSelf) / RATING_SCALE_D))
}

/** 경기 수에 따른 K 계수 (잠정기 차등). */
export function pickK(matchesPlayed: number): number {
    return matchesPlayed < PROVISIONAL_THRESHOLD ? K_PROVISIONAL : K_BASE
}

/**
 * 세트 게임 차로 변동폭을 가중한다.
 * dominance = clamp((Gw − Gl) / (Gw + Gl), 0, 1), factor = 1 + MARGIN_WEIGHT × dominance.
 * 무승부·스코어 없음 → 1.0.
 */
export function marginFactor(sets: SetScore[], winnerId: WinnerSide): number {
    if (winnerId === 'draw' || sets.length === 0) return 1
    let team1Games = 0
    let team2Games = 0
    for (const s of sets) {
        team1Games += s.team1
        team2Games += s.team2
    }
    const gw = winnerId === 'team1' ? team1Games : team2Games
    const gl = winnerId === 'team1' ? team2Games : team1Games
    const total = gw + gl
    if (total === 0) return 1
    const dominance = Math.min(Math.max((gw - gl) / total, 0), 1)
    return 1 + MARGIN_WEIGHT * dominance
}

/** 단일 선수(또는 팀)의 변동량. delta = K × marginFactor × (S − E). */
export function computeMatchDelta(params: {
    selfRating: number
    oppRating: number
    selfScore: number // 승 1 / 패 0 / 무 0.5
    k: number
    margin: number
}): number {
    const e = expectedScore(params.selfRating, params.oppRating)
    return params.k * params.margin * (params.selfScore - e)
}

/** 표시용 반올림 (소수점 3자리). */
export function roundRating(r: number): number {
    return Math.round(r * 1000) / 1000
}

export {
    K_BASE,
    K_PROVISIONAL,
    DEFAULT_RATING,
    PROVISIONAL_THRESHOLD,
    MARGIN_WEIGHT,
    MAX_RATING,
    MIN_RATING,
}
