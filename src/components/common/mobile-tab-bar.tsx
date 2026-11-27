'use client'

import Link from 'next/link'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { usePathname } from 'next/navigation'

import { buildTabItems, isNavItemActive, RECORD_PATH } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

/**
 * 모바일 하단 탭 — 엄지가 닿는 자리에 다섯 갈래를 둔다(md 이상에서는 사이드바가 맡아 숨는다).
 * 가운데 「경기 기록」만 채움색이다 — 이 서비스에서 가장 자주 하는 한 가지라 눌러야 할 곳이 형태로 보이게 한다.
 * 탭 높이 56px + 홈 인디케이터 여백. 본문은 레이아웃이 같은 높이만큼 아래 여백을 둔다.
 */
export function MobileTabBar({ userId }: { userId: string }) {
    const pathname = usePathname()
    return (
        <nav
            aria-label="주 메뉴"
            className="md:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-foreground/10 bg-card pb-[env(safe-area-inset-bottom)]"
        >
            {buildTabItems(userId).map((item) => {
                const active = isNavItemActive(item, pathname)
                const primary = item.href === RECORD_PATH
                const Icon = item.icon
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            PRESS_HEIGHT.xl, 'flex flex-col items-center justify-center gap-1 text-micro font-medium transition-colors',
                            active ? 'text-foreground' : 'text-muted-foreground',
                        )}
                    >
                        <span className={cn('flex h-7 w-10 items-center justify-center rounded-full', primary && 'bg-spot-solid text-spot-foreground')}>
                            <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        {item.tabLabel ?? item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
