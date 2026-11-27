'use client'

import type { ReactNode } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/**
 * 짧은 입력 팝업 — 칸 1~2개(비밀번호 입력·변경, 회원 초대). 그보다 길면 전체 화면 페이지로 만든다
 * (docs/design-system.md §7). 확인만 묻는 팝업은 `ConfirmButton`.
 *
 * 모양을 여기서 정한다: 제목 h4 · 설명 body2Muted · 폭 두 단계 · 닫기 ✕ 없음(취소 버튼이 맡는다) ·
 * 버튼 줄은 `footer`에 `FormActions`(주 행동 왼쪽 · 취소 오른쪽)를 넣는다.
 */
const WIDTH = { sm: 'sm:max-w-sm', md: 'sm:max-w-md' } as const

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: ReactNode
    description?: ReactNode
    /** sm 384px(비밀번호) · md 448px(회원 초대처럼 목록이 들어갈 때) */
    width?: keyof typeof WIDTH
    children?: ReactNode
    footer?: ReactNode
}

export function AppDialog({ open, onOpenChange, title, description, width = 'sm', children, footer }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(WIDTH[width], 'max-h-[85vh] overflow-y-auto')} showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className={cn(TYPO.h4, 'break-keep')}>{title}</DialogTitle>
                    {description && <DialogDescription className={cn(TYPO.body2Muted, 'break-keep')}>{description}</DialogDescription>}
                </DialogHeader>
                {children}
                {footer && <div className="pt-1">{footer}</div>}
            </DialogContent>
        </Dialog>
    )
}
