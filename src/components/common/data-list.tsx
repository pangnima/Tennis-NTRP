import type { ReactNode } from 'react'

import { TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/** 열 제목 한 칸 — 좁은 자리에서 숨는 열은 행의 칸과 **같은 숨김 클래스**를 함께 준다(제목만 남으면 칸이 밀린다) */
export type HeadCell = string | { label: string; className: string }

type Props = {
    /** 열 제목 줄 — 행과 **같은 열 상수**(grid-template)를 받아야 칸이 맞는다. 표 모드에서만 보인다 */
    head?: { cols: string; labels: ReadonlyArray<HeadCell> }
    children: ReactNode
    className?: string
    /**
     * **묶음 목록** — 자식이 줄이 아니라 묶음(카드 한 장씩)일 때. 넓은 자리에서도 한 테두리로 묶지 않고 간격을 두고 쌓는다
     * (경기 결과: 묶음 하나가 카드 한 장). 묶음이 떨어져 있어 맨 위 한 줄의 열 제목은 두지 않는다 — `head`는 무시한다.
     */
    grouped?: boolean
}

/**
 * 표 모드의 밀도 — 좌우 20px · 칸 사이 16px · 행 높이 56px. 열 제목 줄·구분 줄·모든 행이 이 세 값을 읽는다.
 * 행마다 높이를 손으로 적지 않는다(48px 시절 "좁고 답답하다"는 피드백을 받았고, 고칠 곳이 네 군데였다).
 */
export const ROW_PAD = '@4xl:px-5'
export const ROW_GRID = '@4xl:grid @4xl:items-center @4xl:gap-x-4'
export const ROW_BOX = '@4xl:min-h-14 @4xl:py-2'

/**
 * 카드 모드의 행동 자리 — **행동이 1~2개면 머리 줄 오른쪽**(사진 32px = sm 버튼 32px라 카드가 커지지 않는다),
 * 3개 이상이면 맨 아래 행동 줄(경기 결과 카드). 카드를 2열 grid로 놓고:
 *   · 첫 칸(사람 등)은 1줄 왼쪽 · `CARD_WIDE`(둘째 줄 묶음)는 두 칸을 다 쓴다 · `CARD_HEAD_ACTION`(행동)은 1줄 오른쪽
 * DOM 순서는 표 순서 그대로라(행동이 마지막) 키보드 순서가 표와 같다. 모두 `@max-4xl:`라 표 모드에는 닿지 않는다.
 */
export const CARD_GRID = '@max-4xl:grid @max-4xl:grid-cols-[minmax(0,1fr)_auto] @max-4xl:items-center @max-4xl:gap-x-3 @max-4xl:gap-y-2'
export const CARD_WIDE = '@max-4xl:col-span-2'
export const CARD_HEAD_ACTION = '@max-4xl:col-start-2 @max-4xl:row-start-1'

/**
 * 목록의 그릇 — **놓인 자리가 넓으면 표, 좁으면 카드**(container query, 화면 폭이 아니라 자리의 폭을 본다).
 *   · 넓은 자리(896px 이상): 한 테두리 안에 구분선으로 나뉜 행 + 맨 위 열 제목 줄
 *   · 좁은 자리: 행마다 카드가 간격을 두고 쌓이고 열 제목은 숨는다
 *
 * 행은 `MatchCard`·`GameCard`처럼 자기 열 상수를 가진 컴포넌트다. 행마다 독립 grid라서 **열 폭은 전부 고정값이거나 fr**이어야
 * 한다(`auto`를 쓰면 내용 길이에 따라 행마다 칸이 어긋난다 — 한 번 겪은 정렬 문제의 원인).
 * 카드 전용 장식은 행이 `@max-4xl:`로만 건다: 표 모드에서 "걸었다가 지우는" 클래스 쌍을 두지 않는다.
 */
const LIST_TABLE = '@4xl:gap-0 @4xl:divide-y @4xl:divide-border @4xl:overflow-hidden @4xl:rounded-lg @4xl:border @4xl:border-border @4xl:bg-card'

export function DataList({ head, children, className, grouped = false }: Props) {
    return (
        <div className={cn('@container', className)}>
            <div className={cn('flex flex-col gap-3', !grouped && LIST_TABLE)}>
                {head && !grouped && (
                    <div aria-hidden className={cn('hidden @4xl:py-3 @4xl:bg-muted/40', ROW_GRID, ROW_PAD, head.cols, TYPO.label)}>
                        {head.labels.map((cell, i) => (
                            <span key={i} className={cn('truncate', typeof cell === 'string' ? undefined : cell.className)}>
                                {typeof cell === 'string' ? cell : cell.label}
                            </span>
                        ))}
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}

/**
 * 표 안의 구분 줄(예: 「2026년 11월 · 10경기」) — 큰 섹션 제목이 아니라 목록의 일부다.
 * 태그는 문서 아웃라인을 위해 h2, 모양은 14px 한 줄. 카드 모드에서는 카드 묶음 위의 작은 이름표가 된다.
 */
export function DataListDivider({ children, count }: { children: ReactNode; count?: string }) {
    return (
        <h2 className={cn(TYPO.body2Strong, 'flex items-baseline gap-2 pt-2 @4xl:py-2.5 @4xl:bg-muted/40', ROW_PAD)}>
            {children}
            {count && <span className={TYPO.caption}>{count}</span>}
        </h2>
    )
}

/**
 * 묶음 목록(`grouped`)의 **이름표**(예: 「2026년 11월 · 14게임 9승 5패」) — 카드 밖에 서서 그 아래 묶음들을 한 덩어리로 가른다.
 * 바탕·테두리가 없고, 위쪽 여백이 묶음 사이 간격보다 넓어(12 + 16px) 달이 바뀌는 자리가 공간으로 보인다.
 */
export function DataListGroupLabel({ children, count }: { children: ReactNode; count?: string }) {
    return (
        <h2 className={cn(TYPO.body2Strong, 'flex items-baseline gap-2 px-1 pt-4 first:pt-0')}>
            {children}
            {count && <span className={cn(TYPO.caption, 'tabular-nums')}>{count}</span>}
        </h2>
    )
}
