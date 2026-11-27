import type { CourtSurface } from '@/types'

/**
 * 코트 표면(surface) 공통 라벨 정의.
 * grass = '인조잔디'로 통일 (한국 테니스 클럽 환경 반영).
 */
export const SURFACE_LABELS: Record<string, string> = {
    hard: '하드',
    clay: '클레이',
    grass: '인조잔디',
    other: '기타',
    unknown: '미지정',
}

/**
 * 코트 표면별 막대 그래프 색상 (실제 코트 색 직관 반영).
 * 하드=블루, 클레이=적갈, 인조잔디=그린, 기타=슬레이트(L3 --surface-*), 미지정=뮤트.
 * 결과색(win·loss)과 겹치지 않는다 (docs/design-system.md §1).
 */
export const SURFACE_BAR_CLASS: Record<string, string> = {
    hard: 'bg-surface-hard',
    clay: 'bg-surface-clay',
    grass: 'bg-surface-turf',
    other: 'bg-surface-other',
    unknown: 'bg-muted-foreground/40',
}

/** 폼 Select에서 사용하는 입력용 옵션 배열 (SURFACE_LABELS과 라벨 일치). */
export const SURFACE_OPTIONS: { value: CourtSurface; label: string }[] = [
    { value: 'hard', label: '하드' },
    { value: 'clay', label: '클레이' },
    { value: 'grass', label: '인조잔디' },
    { value: 'other', label: '기타' },
]
