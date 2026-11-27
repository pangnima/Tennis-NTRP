import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { cn } from '@/lib/utils'

/**
 * **칸(입력·선택)의 규칙 하나** — 버튼(`action-button-class.ts`)·글자(`TYPO`)처럼 칸도 한 곳에서 정한다(`docs/design-system.md §5`).
 * 로그인·가입·프로필·경기 기록·매칭이 칸 모양 두 벌(≈50px + 작은 대문자 라벨 / 48px + 본문 라벨)에 높이 세 가지(44·48·50)를
 * 섞어 쓰다가 "사이즈가 다르다"는 피드백을 받았다(11-26).
 *
 * | 단계 | 높이 | 쓰는 자리 |
 * |---|---|---|
 * | lg | 44px | **폼의 칸**(기본) — 같은 줄의 선택 토글·폼 제출 버튼과 같은 높이 |
 * | md | 36px | 표·패널 안의 작은 칸(보드 스코어·비회원 추가 줄·1인당 게임 수) — 옆의 sm·md 버튼과 줄을 맞춘다 |
 *
 * 높이는 누름 단계표(`PRESS_HEIGHT`)에서 읽는다 — 칸과 그 옆 버튼·토글이 같은 표를 쓴다.
 * 글자는 언제나 16px(`text-body`) — iOS Safari가 16px 미만 칸에 포커스하면 화면을 확대한다.
 */
export type FieldSize = 'md' | 'lg'

export const FIELD_HEIGHT: Record<FieldSize, string> = { lg: PRESS_HEIGHT.lg, md: PRESS_HEIGHT.md }
/** 단계표 — `/styleguide`와 문서가 그대로 그린다 */
export const FIELD_SCALE: ReadonlyArray<{ size: FieldSize; px: number; use: string }> = [
    { size: 'lg', px: 44, use: '폼의 칸(기본) — 같은 줄의 선택 토글·폼 제출 버튼과 같은 높이' },
    { size: 'md', px: 36, use: '표·패널 안의 작은 칸 — 보드 스코어·비회원 추가 줄·1인당 게임 수' },
]

const BASE = cn(
    'w-full min-w-0 rounded-lg border border-input bg-field px-3 text-body text-foreground',
    'placeholder:text-muted-foreground outline-none transition-colors focus:border-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
)

export type FieldStyle = { size?: FieldSize; multiline?: boolean; className?: string }

/** 칸 한 모양 — 한 줄 칸은 높이 고정, 여러 줄(textarea)은 위아래 여백으로 자란다 */
export function fieldClass({ size = 'lg', multiline = false, className }: FieldStyle = {}): string {
    return cn(BASE, multiline ? 'resize-none py-2.5' : FIELD_HEIGHT[size], className)
}

/** 바꿀 수 없는 값을 칸 모양으로 보여 줄 때(프로필의 이름·아이디·NTRP) — 같은 높이, 회색 바탕, 값은 기본색 */
export const FIELD_READONLY = cn(
    'flex w-full min-w-0 items-center rounded-lg border border-input bg-muted/50 px-3 text-body text-foreground',
    FIELD_HEIGHT.lg,
)

/** 라벨 — 본문 크기 굵게, 보조색(글자색 규칙: 필드 이름표 = 보조) */
export const FIELD_LABEL = 'mb-2 block text-body font-medium text-muted-foreground'

/** 칸 아래 한 줄 — 도움말(보조) · 오류(destructive) · 주의(spot) */
export type FieldTone = 'muted' | 'destructive' | 'warning'
const TONE: Record<FieldTone, string> = { muted: 'text-muted-foreground', destructive: 'text-destructive', warning: 'text-spot' }
export function fieldMessageClass(tone: FieldTone = 'muted', className?: string): string {
    return cn('mt-1.5 text-caption break-keep', TONE[tone], className)
}

/** `EnumSelect`(shadcn Select 트리거)를 칸과 같은 높이·모양으로 — `data-[size=default]`가 트리거 기본 높이를 덮는다 */
export const FIELD_SELECT_TRIGGER = cn(
    'w-full rounded-lg border-input bg-field px-3 text-body focus:border-ring',
    FIELD_HEIGHT.lg, 'data-[size=default]:h-11',
)
