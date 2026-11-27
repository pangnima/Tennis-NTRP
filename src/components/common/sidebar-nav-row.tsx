'use client'

import Link from 'next/link'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'

import type { NavItem } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

type SidebarNavRowProps = { item: NavItem; active: boolean; collapsed: boolean }

/** 사이드바 메뉴 한 줄 — 접히면 아이콘만(라벨은 aria-label로). */
export function SidebarNavRow({ item, active, collapsed }: SidebarNavRowProps) {
    const { href, label, icon: Icon } = item
    return (
        <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(
                PRESS_HEIGHT.md, 'relative flex items-center rounded-lg text-body2 font-medium transition-colors',
                collapsed ? 'gap-0 justify-center px-0 w-9 mx-auto' : 'gap-3 px-3',
                active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <span className={cn('overflow-hidden whitespace-nowrap transition-all duration-200', collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100')}>
                {label}
            </span>
        </Link>
    )
}
