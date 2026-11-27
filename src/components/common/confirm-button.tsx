'use client'

import { useState, useTransition, type ReactNode } from 'react'

import { ActionButton } from '@/components/common/action-button'
import type { ActionSize, ActionVariant } from '@/components/common/action-button-class'
import { fieldMessageClass } from '@/components/common/field-class'
import {
    AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FORM_ACTION_ROW, FORM_CANCEL, FORM_SUBMIT, TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

type Props = {
    /** 트리거 버튼의 내용 */
    children: ReactNode
    /** 트리거의 단계와 모양 — 놓인 자리가 정한다(행 안이면 sm, 행동 줄이면 md) */
    size?: ActionSize
    variant?: ActionVariant
    /** 같은 글자 버튼이 줄마다 반복될 때 무엇을 하는지 읽어 주는 말(예: 「2게임 삭제」). 트리거는 언제나 글자다 */
    ariaLabel?: string
    className?: string
    /** 아직 누를 수 없을 때(고른 것이 없음 등) — 트리거만 막는다 */
    disabled?: boolean
    title: string
    description?: ReactNode
    confirmLabel: string
    /** 삭제처럼 되돌릴 수 없으면 destructive — 팝업의 확인 버튼이 빨강 채움이 된다 */
    tone?: 'default' | 'destructive'
    /** 에러 문구를 돌려주면 팝업을 연 채 보여 주고, null이면 닫는다 */
    onConfirm: () => Promise<string | null>
}

/**
 * 확인을 한 번 묻는 버튼 — 네이티브 `confirm()`의 자리. 브라우저 기본 창은 문구를 꾸밀 수 없고 모바일에서
 * 화면 맥락을 가리며, 실패했을 때 이유를 그 자리에 보여 줄 수 없다.
 * 트리거도 팝업의 두 버튼도 `ActionButton`이다(팝업은 lg — 손가락으로 누르는 결정).
 */
export function ConfirmButton({
    children, size = 'md', variant = 'outline', ariaLabel, className, disabled, title, description, confirmLabel, tone = 'default', onConfirm,
}: Props) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function confirm() {
        startTransition(async () => {
            const result = await onConfirm()
            setError(result)
            if (!result) setOpen(false)
        })
    }

    return (
        <>
            <ActionButton
                size={size} variant={variant} aria-label={ariaLabel} className={className} disabled={disabled}
                onClick={() => { setError(null); setOpen(true) }}
            >
                {children}
            </ActionButton>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className={cn(TYPO.h4, 'break-keep')}>{title}</AlertDialogTitle>
                        {description && <AlertDialogDescription className={cn(TYPO.body2Muted, 'break-keep')}>{description}</AlertDialogDescription>}
                    </AlertDialogHeader>
                    {error && <p role="alert" className={fieldMessageClass('destructive')}>{error}</p>}
                    {/* 버튼 줄은 FormActions와 같은 순서 — 주 행동 왼쪽 · 취소 오른쪽(docs/design-system.md §7) */}
                    <div className={FORM_ACTION_ROW}>
                        <ActionButton
                            size="lg" variant={tone === 'destructive' ? 'dangerFill' : 'solid'} className={FORM_SUBMIT}
                            disabled={isPending} onClick={confirm}
                        >
                            {isPending ? '처리 중...' : confirmLabel}
                        </ActionButton>
                        <ActionButton size="lg" className={FORM_CANCEL} disabled={isPending} onClick={() => setOpen(false)}>취소</ActionButton>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
