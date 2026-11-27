import { cn } from '@/lib/utils'
import { PRESS_HEIGHT } from './action-button-class'

/**
 * 칩·뱃지의 모양 — 높이·여백·글자·둥글기를 여기서만 정한다(docs/design-system.md §6).
 * 색은 따로 붙인다: 아래 두 톤 또는 뜻마다의 맵(종목 `getMatchTypeBadgeClass` · 역할 `member-badges` · 결과 `result-badge` · 티어 `TIER_STYLE`).
 *
 * | size  | 높이 | 쓰임 |
 * | micro | 18   | 꼬리표·카운트 — 「비회원」·「N연승」·성별 |
 * | chip  | 24   | 정보 칩 — 종목·상태·역할·결과·티어·NTRP (기본) |
 * | sm    | 32   | 고르는/지우는 칩 — 고른 회원 ✕·경기 기록 참가자 |
 */
export type ChipSize = 'micro' | 'chip' | 'sm'

const SIZE: Record<ChipSize, string> = {
    micro: 'h-4.5 px-1.5 text-micro leading-none',
    chip: 'h-6 px-2 text-caption leading-none',
    sm: cn(PRESS_HEIGHT.sm, 'px-3 text-caption'),
}

const BASE = 'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border'

export function chipClass({ size = 'chip', className }: { size?: ChipSize; className?: string } = {}): string {
    return cn(BASE, SIZE[size], className)
}

/** 단계표 — `/styleguide`와 문서가 그대로 그린다 */
export const CHIP_SCALE: ReadonlyArray<{ size: ChipSize; px: number; use: string }> = [
    { size: 'micro', px: 18, use: '꼬리표·카운트 — 「비회원」·「N연승」·성별' },
    { size: 'chip', px: 24, use: '정보 칩 — 종목·상태·역할·결과·티어·NTRP' },
    { size: 'sm', px: 32, use: '고르는/지우는 칩 — 고른 회원 ✕·경기 기록 참가자' },
]

/** 중립 — 색으로 뜻을 싣지 않는 칩(확정됨·모집 마감·손잡이·NTRP). 담긴 글자는 값이라 기본색 */
export const CHIP_NEUTRAL = 'border-border text-foreground'
/** 주의 — 기다리는 중(「신청 중」) */
export const CHIP_ATTENTION = 'border-spot/50 text-spot'
