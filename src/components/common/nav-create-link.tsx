import { Plus } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { NAV_LABEL, RECORD_PATH } from '@/lib/nav-items'

type NavCreateLinkProps = { collapsed?: boolean; onNavigate?: () => void }

/** 사이드바 맨 위의 채움 버튼 — 「경기 기록」. 접힌 사이드바에서는 + 아이콘만(정사각). */
export function NavCreateLink({ collapsed = false, onNavigate }: NavCreateLinkProps) {
    return (
        <ActionButton
            href={RECORD_PATH}
            onClick={onNavigate}
            variant="solid"
            size="md"
            square={collapsed}
            aria-label={collapsed ? NAV_LABEL.record : undefined}
            className={collapsed ? 'mx-auto flex' : 'w-full'}
        >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            {!collapsed && NAV_LABEL.record}
        </ActionButton>
    )
}
