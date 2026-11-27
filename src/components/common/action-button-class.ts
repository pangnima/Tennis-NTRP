import { cn } from '@/lib/utils'

/**
 * **누르는 것의 높이 다섯 단계** — 버튼뿐 아니라 칩·토글·탭·메뉴 행이 모두 이 표에서 고른다(`PRESS_HEIGHT`).
 * 자리마다 손으로 높이를 적지 않는다.
 *
 * | 단계 | 높이 | 쓰는 자리 |
 * |---|---|---|
 * | xs | 28px | 칩·필 안의 보조 동작, 입력 줄의 작은 삭제 |
 * | sm | 32px | **섹션 제목 옆·카드·목록 행 안의 행동**(초대·수정·확정·삭제), 필터 칩, 카드 머리의 세그먼트 토글 |
 * | md | 36px | **페이지 헤더의 행동**(주 행동 포함 — [+ 경기 기록]·[+ 게임 기록]), 탭, PC 메뉴 행 |
 * | lg | 44px | 폼 제출·팝업 버튼·폼 안의 선택 토글(모바일 터치 기준) |
 * | xl | 56px | 홈의 큰 진입 버튼, 모바일 하단 탭 |
 *
 * **한 줄에 놓인 버튼은 높이 단계 하나**다 — 위계는 높이가 아니라 모양(채움/테두리/글자)으로 만든다. 매칭 상세가
 * 한 줄에 44px·36px·글자만 버튼을 섞었다가 "체계가 안 맞는다"는 피드백을 받았다.
 *
 * 순수 모듈로 둔 이유: 클래스만 필요한 자리(다른 컴포넌트의 트리거)가 있고, vitest가 단계별 높이를 고정한다.
 */
export type ActionSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** 단계 → 높이 클래스. 버튼이 아닌 누름 컴포넌트(칩·토글·탭)도 이 값을 읽는다 */
export const PRESS_HEIGHT: Record<ActionSize, string> = { xs: 'h-7', sm: 'h-8', md: 'h-9', lg: 'h-11', xl: 'h-14' }
/** 단계표 — `/styleguide`와 문서가 그대로 그린다 */
export const PRESS_SCALE: ReadonlyArray<{ size: ActionSize; px: number; use: string }> = [
    { size: 'xs', px: 28, use: '칩 안의 보조 동작, 입력 줄의 작은 삭제' },
    { size: 'sm', px: 32, use: '섹션 제목 옆·카드·목록 행 안의 행동, 필터 칩, 세그먼트 토글' },
    { size: 'md', px: 36, use: '페이지 헤더의 행동(주 행동 포함), 탭, PC 메뉴 행' },
    { size: 'lg', px: 44, use: '폼 제출, 팝업 버튼, 폼 안의 선택 토글' },
    { size: 'xl', px: 56, use: '홈의 큰 진입 버튼, 모바일 하단 탭' },
]

/**
 * 모양 다섯 가지 — 무엇을 하는 버튼인지가 모양을 정한다.
 * solid = 옐로우 채움(이 화면에서 눌러야 할 것) · outline = 테두리(보조) · ghost = 글자만(낮은 강조)
 * danger = 빨간 글자(**표·카드 행 안 전용** — 줄마다 반복되므로 채우지 않는다) · dangerFill = 연한 빨강 채움(행 밖의 위험 버튼 — 페이지 헤더·팝업·설정)
 */
export type ActionVariant = 'solid' | 'outline' | 'ghost' | 'danger' | 'dangerFill'
export const ACTION_VARIANTS: ReadonlyArray<{ variant: ActionVariant; use: string }> = [
    { variant: 'solid', use: '이 화면에서 눌러야 할 것(저장·기록·참가)' },
    { variant: 'outline', use: '보조 행동(취소·수정·초대)' },
    { variant: 'ghost', use: '낮은 강조(로그아웃·접기)' },
    { variant: 'danger', use: '표·카드 행 안의 삭제·나가기' },
    { variant: 'dangerFill', use: '행 밖의 위험 버튼 — 헤더의 매칭 삭제, 팝업의 삭제·탈퇴 확정' },
]

const TEXT: Record<ActionSize, string> = {
    xs: 'gap-1 rounded-sm px-2 text-caption',
    sm: 'gap-1 rounded-md px-3 text-caption',
    md: 'gap-1.5 rounded-md px-3.5 text-body2',
    lg: 'gap-1.5 rounded-md px-4 text-body2',
    xl: 'gap-2 rounded-lg px-5 text-body',
}
/** 아이콘 전용 — 폭 = 높이 */
const SQUARE: Record<ActionSize, string> = { xs: 'w-7 rounded-sm', sm: 'w-8 rounded-md', md: 'w-9 rounded-md', lg: 'w-11 rounded-md', xl: 'w-14 rounded-lg' }

const VARIANT: Record<ActionVariant, string> = {
    solid: 'bg-spot-solid text-spot-foreground hover:bg-spot-solid/90',
    outline: 'border border-border bg-card text-foreground hover:border-input',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'text-destructive hover:bg-destructive/10',
    dangerFill: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
}

const BASE = 'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50'

export type ActionStyle = { size?: ActionSize; variant?: ActionVariant; square?: boolean; className?: string }

export function actionButtonClass({ size = 'md', variant = 'outline', square = false, className }: ActionStyle = {}): string {
    return cn(BASE, PRESS_HEIGHT[size], square ? SQUARE[size] : TEXT[size], VARIANT[variant], className)
}
