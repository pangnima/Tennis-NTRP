import Link from 'next/link'

import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { cn } from '@/lib/utils'

export type LinkSegment = { key: string; label: string; href: string }

type Props = { items: LinkSegment[]; activeKey: string; ariaLabel: string }

/**
 * 세그먼트 토글의 **링크 판본** — 같은 목록을 거르는 축에 쓴다(경기 결과의 종목·승패). 주소가 곧 상태라
 * 새로고침·공유에 그대로 남는다. 모양은 `SegmentedToggle`과 같다(트랙 위에 활성 칸이 떠오른다, 칸 높이 32px).
 * 화면을 가르는 한 축은 밑줄 탭(`LinkTabs`) — 탭 줄 오른쪽에 이 토글을 둔다.
 * 첫 칸의 글자가 축의 이름을 말한다(「종목 전체」) — 토글이 여럿이어도 「전체」가 겹치지 않는다.
 */
export function LinkSegments({ items, activeKey, ariaLabel }: Props) {
    return (
        <nav aria-label={ariaLabel} className="inline-flex gap-0.5 rounded-md border border-border bg-secondary p-0.5">
            {items.map((item) => {
                const active = item.key === activeKey
                return (
                    <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                            PRESS_HEIGHT.sm, 'inline-flex items-center rounded-sm px-3 text-body2 font-medium whitespace-nowrap transition-colors',
                            active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
