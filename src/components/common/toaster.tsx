'use client'

import type { CSSProperties } from 'react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

/**
 * 토스트 자리 — `(main)` 레이아웃에 하나. 부르는 쪽은 `notify`(lib/feedback/notify.ts)만 쓴다.
 * 색은 역할 토큰을 그대로 넘긴다(카드 면 · 기본 글자 · 1px 선). 모바일은 하단 탭(56px + 홈 인디케이터) 위에 뜬다.
 */
const TOKENS = {
    '--normal-bg': 'var(--popover)',
    '--normal-text': 'var(--popover-foreground)',
    '--normal-border': 'var(--border)',
    '--success-bg': 'var(--popover)',
    '--success-text': 'var(--popover-foreground)',
    '--success-border': 'var(--border)',
} as CSSProperties

export function Toaster() {
    const { resolvedTheme } = useTheme()
    return (
        <Sonner
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            position="bottom-center"
            duration={3000}
            mobileOffset={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
            style={TOKENS}
            toastOptions={{ classNames: { toast: 'text-body2 font-medium', icon: 'text-win' } }}
        />
    )
}
