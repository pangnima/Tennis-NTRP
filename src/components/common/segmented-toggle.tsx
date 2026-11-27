'use client'

import { cn } from '@/lib/utils'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'

/**
 * 세그먼트 토글 — 단식/복식 등 2~N개 분기 선택.
 * 컨트롤드 컴포넌트. 트랙은 surface-2, 활성 세그먼트는 surface(card)로 떠오름.
 * `disabled`면 값은 보이되 바꿀 수 없다(남복의 비회원 성별처럼 정해진 값) — 누를 수 없는 컨트롤만 흐려진다.
 */
type SegmentedOption<T extends string> = {
    value: T
    label: string
}

type SegmentedToggleProps<T extends string> = {
    options: SegmentedOption<T>[]
    value: T
    onValueChange: (value: T) => void
    className?: string
    disabled?: boolean
    /** 묶음이 무엇을 고르는지 읽어 주는 말 */
    ariaLabel?: string
}

export function SegmentedToggle<T extends string>({
    options,
    value,
    onValueChange,
    className,
    disabled = false,
    ariaLabel,
}: SegmentedToggleProps<T>) {
    return (
        <div role="group" aria-label={ariaLabel} className={cn('inline-flex gap-0.5 rounded-md border border-border bg-secondary p-0.5', className)}>
            {options.map((opt) => {
                const active = opt.value === value
                return (
                    <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        disabled={disabled}
                        onClick={() => onValueChange(opt.value)}
                        className={cn(
                            PRESS_HEIGHT.sm, 'inline-flex items-center rounded-sm px-3 text-body2 font-medium transition-colors',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            active
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}
