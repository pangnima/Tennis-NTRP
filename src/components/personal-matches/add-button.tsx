'use client'

import { Plus } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'

type AddButtonProps = {
    label: string
    onClick: () => void
    disabled?: boolean
}

/**
 * 리스트(게임·세트) 하단의 풀폭 추가 버튼 — 폼 안의 주 조작이라 lg(44px).
 * 채운 바탕 + 실선 테두리로 "누르는 것"임을 분명히 한다(점선·흐린 글자는 눌리는지 헷갈린다).
 */
export function AddButton({ label, onClick, disabled = false }: AddButtonProps) {
    return (
        <ActionButton size="lg" onClick={onClick} disabled={disabled} className="w-full border-input bg-muted hover:border-ring hover:bg-muted/70">
            <Plus className="size-4" aria-hidden />
            {label}
        </ActionButton>
    )
}
