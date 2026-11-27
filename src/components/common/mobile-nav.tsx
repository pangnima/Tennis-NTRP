'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { BrandLogo } from '@/components/common/brand-logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { logoutAction } from '@/lib/actions/auth'
import { buildSideItems, guideNavItem, isNavItemActive, type NavItem } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

type MobileNavProps = { userId?: string | null }

/** 서랍의 메뉴 한 줄 — 손가락으로 누르므로 lg(44px) */
const ROW = cn('flex items-center gap-3 rounded-md px-3 text-body2 font-medium transition-colors', PRESS_HEIGHT.lg)
const IDLE = 'text-muted-foreground hover:bg-muted hover:text-foreground'

/**
 * 모바일 서랍 — PC 사이드바와 같은 1뎁스 목록 + 사용 가이드 · 테마 · 로그아웃.
 * 자주 쓰는 다섯은 하단 탭이 맡으므로 여기는 "전체 메뉴"다. 로그아웃은 헤더에서 여기로 옮겼다 —
 * 알림 종 옆에 늘 떠 있어 잘못 누르기 쉬웠다.
 */
export function MobileNav({ userId = null }: MobileNavProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const items: NavItem[] = [...(userId ? buildSideItems(userId) : []), guideNavItem]

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className={cn('md:hidden flex w-11 items-center justify-center rounded-md hover:bg-muted transition-colors', PRESS_HEIGHT.lg)} aria-label="메뉴 열기">
                <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 gap-0" showCloseButton={false}>
                <SheetHeader className="h-14 flex-row items-center justify-between px-5 py-0 border-b">
                    <SheetTitle className="text-left leading-none"><BrandLogo size="sm" /></SheetTitle>
                    <SheetClose aria-label="메뉴 닫기" className={cn('inline-flex w-11 items-center justify-center rounded-md', PRESS_HEIGHT.lg, IDLE)}>
                        <X className="size-4" />
                    </SheetClose>
                </SheetHeader>
                <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
                    {items.map((item) => {
                        const active = isNavItemActive(item, pathname)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                aria-current={active ? 'page' : undefined}
                                className={cn(ROW, active ? 'bg-muted text-foreground' : IDLE)}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
                <div className="space-y-1 border-t border-border-subtle p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <ThemeToggle size="lg" />
                    {userId && (
                        <form action={logoutAction}>
                            <ActionButton type="submit" variant="ghost" size="lg" className="w-full justify-start gap-3 px-3">
                                <LogOut className="w-4 h-4" />
                                로그아웃
                            </ActionButton>
                        </form>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
