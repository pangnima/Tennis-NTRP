import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type PageContainerProps = {
    children: ReactNode
    /** 특수한 경우에만 세로 리듬 등 보강 (기본 space-y-6) */
    className?: string
}

/**
 * 페이지 콘텐츠 공용 컨테이너.
 * 세로 리듬 space-y-6 + **본문 최대 폭 max-w-7xl = 1280px**(가운데 정렬, 11-26에 1152 → 1280 — 매칭 리스트에 「1인당」 열을 넣으며 제목 칸을 지키려고) — 넓은 모니터에서 한 줄 목록의 정보와 버튼이
 * 화면 끝까지 벌어지지 않게 한다. 폼 화면처럼 더 좁아야 하는 곳은 className으로 덮는다(max-w-2xl 등).
 */
export function PageContainer({ children, className }: PageContainerProps) {
    return <div className={cn('mx-auto w-full max-w-7xl space-y-6', className)}>{children}</div>
}
