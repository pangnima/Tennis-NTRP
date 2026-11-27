'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { BrandLogo, WORDMARK_CLASS } from '@/components/common/brand-logo'
import { NavCreateLink } from '@/components/common/nav-create-link'
import { useSidebar } from '@/components/common/sidebar-context'
import { SidebarNavRow } from '@/components/common/sidebar-nav-row'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { buildSideItems, guideNavItem, HOME_PATH, isNavItemActive } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

type SidebarProps = { userId?: string | null }

/**
 * PC 사이드바(md 이상) — 모바일은 하단 탭(`MobileTabBar`)이 같은 메뉴를 맡는다.
 * 맨 위 노란 버튼이 「경기 기록」이고, 그 아래는 1뎁스 목록, 구분선 아래 사용 가이드.
 */
export function Sidebar({ userId }: SidebarProps) {
    const pathname = usePathname()
    const { collapsed } = useSidebar()
    const items = userId ? buildSideItems(userId) : []
    const divider = 'border-border-subtle'

    return (
        <aside className={cn('hidden md:flex flex-col shrink-0 border-r bg-card transition-[width] duration-200', divider, collapsed ? 'w-16' : 'w-60')}>
            <div className={cn('h-14 flex items-center border-b transition-[padding] duration-200', divider, collapsed ? 'justify-center px-2' : 'px-5')}>
                <Link href={userId ? HOME_PATH : '/'} className="flex items-center gap-2.5 min-w-0" aria-label="BASELINE 홈">
                    <BrandLogo wordmark={false} size="sm" className="shrink-0" />
                    <span className={cn('overflow-hidden whitespace-nowrap transition-all duration-200 text-body', WORDMARK_CLASS, collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100')}>
                        BASELINE
                    </span>
                </Link>
            </div>

            <nav className={cn('flex-1 min-h-0 p-3 space-y-1', collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden')}>
                {userId && <div className="mb-3"><NavCreateLink collapsed={collapsed} /></div>}
                {items.map((item) => (
                    <SidebarNavRow key={item.href} item={item} active={isNavItemActive(item, pathname)} collapsed={collapsed} />
                ))}
                <div className={cn(items.length > 0 && cn('mt-2 border-t pt-2', divider))}>
                    <SidebarNavRow item={guideNavItem} active={isNavItemActive(guideNavItem, pathname)} collapsed={collapsed} />
                </div>
            </nav>

            <div className={cn('border-t transition-[padding] duration-200', divider, collapsed ? 'p-2' : 'p-3')}>
                <ThemeToggle collapsed={collapsed} />
            </div>
        </aside>
    )
}
