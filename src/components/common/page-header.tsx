import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { TYPO } from '@/lib/dashboard/tokens'

type PageHeaderProps = {
    /** 페이지 대제목 (H1) — 페이지당 하나 */
    title: ReactNode
    /** 제목 아래의 **값** 한 줄(장소처럼 읽어야 하는 정보) — 기본색. 설명 문구는 `description`에 */
    info?: ReactNode
    /** 제목 아래 한 줄 설명 (Body2 muted) — 값이 아니라 안내 문구 */
    description?: ReactNode
    /** 제목 위 소형 대문자 라벨 (eyebrow) */
    eyebrow?: ReactNode
    /** 제목 옆 상태 칩 — eyebrow(정적 분류)와 달리 지금 상태를 말한다 (예: 매칭 룸 진행 단계) */
    badge?: ReactNode
    /** 우측 액션 영역 (버튼 등) — 좁은 화면에서는 아래로 감싼다. PC에서는 제목이 길어도 오른쪽 위에 남는다 */
    actions?: ReactNode
    /** 제목 블록 맨 아래의 덧붙임(매칭 메모처럼 그 페이지의 **값**) — 값이므로 기본색으로 그리는 쪽이 넘긴다 */
    note?: ReactNode
    className?: string
}

/**
 * 페이지 최상단 헤더 공용 컴포넌트.
 * h1 = TYPO.h1(28→36px clamp)로 고정해 페이지별 사이즈·굵기 편차를 없앤다.
 * 레이아웃(PageContainer)과 역할을 분리 — 이 컴포넌트는 제목 블록만 담당.
 */
export function PageHeader({ title, info, description, eyebrow, badge, actions, note, className }: PageHeaderProps) {
    return (
        <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
            {/* md 이상은 제목 칸이 남는 폭만 쓴다 — 긴 제목(매칭 방 제목)이 버튼을 아래 줄로 밀지 않게 */}
            <div className="min-w-0 md:flex-1">
                {eyebrow && <p className={TYPO.eyebrow}>{eyebrow}</p>}
                <div className={cn('flex flex-wrap items-center gap-2', eyebrow && 'mt-2')}>
                    <h1 className={cn(TYPO.h1, 'break-keep')}>{title}</h1>
                    {badge}
                </div>
                {info && <p className={cn(TYPO.body2, 'mt-1 break-keep')}>{info}</p>}
                {description && <p className={cn(TYPO.body2Muted, 'mt-1 break-keep')}>{description}</p>}
                {note && <div className="mt-2">{note}</div>}
            </div>
            {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    )
}
