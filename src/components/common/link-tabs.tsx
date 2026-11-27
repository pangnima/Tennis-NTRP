import type { ReactNode } from 'react'
import Link from 'next/link'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type LinkTabItem = {
    key: string
    label: string
    href: string
    /** 0이면 배지를 붙이지 않는다 — 행동이 필요한 탭에만 숫자를 보여주기 위함 */
    count?: number
}

type Props = {
    items: LinkTabItem[]
    activeKey: string
    ariaLabel: string
    /** 탭 줄 오른쪽 자리 — 같은 목록을 거르는 세그먼트 토글(`LinkSegments`). 좁으면 탭 아래 줄로 내려간다 */
    trailing?: ReactNode
}

/**
 * URL 파라미터로 전환하는 탭 바 (서버 컴포넌트) — **화면을 가르는 한 축**에 쓴다(매칭 리스트의 전체/내 매칭,
 * 경기 결과의 구분). 같은 목록을 거르는 나머지 축은 `trailing`에 세그먼트 토글로 둔다.
 *
 * '내 차례 있음'을 알리던 `emphasis`는 Week 45에 지웠다 — 관계 축이 라우트로 나가면서
 * 그 신호는 사이드바 뱃지가 맡는다(탭 배지는 `count>0`일 때만 그려져 참여 방이 0이면
 * 강조가 아예 나타나지 않는 구멍도 있었다).
 */
export function LinkTabs({ items, activeKey, ariaLabel, trailing }: Props) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-4 border-b border-border">
            <nav aria-label={ariaLabel} className="flex">
                {items.map((item) => {
                    const active = item.key === activeKey
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                PRESS_HEIGHT.md, 'inline-flex items-center gap-1.5 px-3 text-body2 whitespace-nowrap border-b-2 -mb-px transition-colors',
                                active
                                    ? 'border-primary text-foreground font-medium'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {item.label}
                            {!!item.count && item.count > 0 && (
                                <Badge variant="outline" className="text-caption text-foreground border-border">
                                    {item.count}
                                </Badge>
                            )}
                        </Link>
                    )
                })}
            </nav>
            {trailing && <div className="flex flex-wrap items-center gap-2 py-1.5">{trailing}</div>}
        </div>
    )
}
