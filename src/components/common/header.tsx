'use client'

import Link from 'next/link'
import { LogOut, PanelLeft, Shield } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { BrandLogo } from '@/components/common/brand-logo'
import { MobileNav } from '@/components/common/mobile-nav'
import { useSidebar } from '@/components/common/sidebar-context'
import { UserAvatar } from '@/components/common/user-avatar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { chipClass, CHIP_ATTENTION } from '@/components/common/chip-class'
import { logoutAction } from '@/lib/actions/auth'
import { TYPO } from '@/lib/design/tokens'
import { HOME_PATH, SETTINGS_PATH } from '@/lib/nav-items'
import type { NotificationInbox } from '@/lib/queries/notifications'

type UserDisplay = { id: string; name: string; nickname: string; role: string; profileImage?: string | null }

type HeaderProps = { userDisplay?: UserDisplay | null; userId?: string | null; inbox?: NotificationInbox | null }

/**
 * 전역 헤더 — 모바일: 서랍 · 가운데 로고 · 알림 종 / PC: 사이드바 토글 · 알림 종 · 내 정보 · 로그아웃.
 * 모바일의 로그아웃은 서랍으로 갔다(종 옆에서 잘못 누르기 쉬웠다). 「내 정보」는 PC에서 여기 아바타가,
 * 모바일에서는 하단 탭이 맡는다(PC 사이드바에는 없다).
 */
export function Header({ userDisplay = null, userId = null, inbox = null }: HeaderProps) {
    const { collapsed, toggle } = useSidebar()

    return (
        <header className="relative min-h-14 border-b border-border-subtle bg-card flex items-center px-2 md:px-6 shrink-0 gap-3 pt-[env(safe-area-inset-top)]">
            <MobileNav userId={userId} />
            <ActionButton
                variant="ghost"
                size="md"
                square
                onClick={toggle}
                aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
                aria-pressed={collapsed}
                className="hidden md:inline-flex"
            >
                <PanelLeft className="w-5 h-5" />
            </ActionButton>
            <Link
                href={userId ? HOME_PATH : '/'}
                aria-label="BASELINE 홈"
                className="md:hidden absolute left-1/2 -translate-x-1/2 top-[env(safe-area-inset-top)] bottom-0 flex items-center"
            >
                <BrandLogo size="sm" />
            </Link>
            <div className="flex-1" />
            <nav className="flex items-center gap-2">
                {userDisplay ? (
                    <>
                        {inbox && <NotificationBell inbox={inbox} />}
                        <Link href={SETTINGS_PATH} className="hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <UserAvatar size="sm" name={userDisplay.name} nickname={userDisplay.nickname} image={userDisplay.profileImage} userId={userId} />
                            <span className={TYPO.body2Strong}>{userDisplay.name}</span>
                            {userDisplay.role === 'admin' && (
                                <span className={chipClass({ size: 'micro', className: CHIP_ATTENTION })}>
                                    <Shield className="size-2.5" />
                                    관리자
                                </span>
                            )}
                        </Link>
                        <form action={logoutAction} className="hidden md:block">
                            <ActionButton type="submit" variant="ghost" size="sm">
                                <LogOut className="w-3.5 h-3.5" />
                                로그아웃
                            </ActionButton>
                        </form>
                    </>
                ) : (
                    <ActionButton href="/login" variant="solid" size="md">로그인</ActionButton>
                )}
            </nav>
        </header>
    )
}
