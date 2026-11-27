'use client'

import { useEffect, useState } from 'react'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
    /** rail(접힘) 상태 — 아이콘만 중앙 정렬하고 라벨은 페이드 아웃 */
    collapsed?: boolean
    /** 놓인 자리의 메뉴 행과 같은 단계 — PC 사이드바 md(36px), 모바일 서랍 lg(44px) */
    size?: 'md' | 'lg'
}

export function ThemeToggle({ collapsed = false, size = 'md' }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setMounted(true) }, [])

    if (!mounted) return <div className={PRESS_HEIGHT[size]} />

    const isDark = theme === 'dark'

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? '라이트 모드' : '다크 모드'}
            className={cn(
                PRESS_HEIGHT[size], 'flex items-center rounded-lg text-body2 font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
                collapsed ? 'gap-0 justify-center w-9 mx-auto px-0' : 'gap-3 w-full px-3'
            )}
        >
            {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            <span
                className={cn(
                    'overflow-hidden whitespace-nowrap transition-all duration-200',
                    collapsed ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
                )}
            >
                {isDark ? '라이트 모드' : '다크 모드'}
            </span>
        </button>
    )
}
