import { chipClass } from '@/components/common/chip-class'
import Link from 'next/link'
import { Lock } from 'lucide-react'

import { ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { MatchStatusChips } from '@/components/matches/match-status-chips'
import { PrivateMatchLink } from '@/components/matches/private-match-link'
import { getMatchTypeBadgeClass, MATCH_TYPE_LABELS } from '@/lib/design/match-type-style'
import { SURFACE_LABELS } from '@/lib/design/surface'
import { TYPO } from '@/lib/design/tokens'
import { formatDayWithWeekday } from '@/lib/format'
import { formatCourt } from '@/lib/matches/court'
import { formatHeadcount, formatPerPerson } from '@/lib/matches/fee'
import { displayMatchTitle } from '@/lib/matches/title'
import { formatMatchHours } from '@/lib/matches/when'
import type { MatchListItem } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'

/**
 * 표 모드의 열 — 열 제목 줄과 행이 같이 읽는다. 전부 고정 폭 또는 fr(행마다 독립 grid라 auto는 어긋난다).
 * **제목이 남는 폭을 전부** 갖고 말줄임 없이 다 보인다(40자 제한 — 길면 칸 안에서 줄바꿈). 경기장·호스트·1인당·참가는 좁은 고정 폭(넘치면 말줄임).
 */
export const MATCH_COLS = '@4xl:grid-cols-[3.25rem_5.5rem_6.5rem_minmax(0,1fr)_10.5rem_5.5rem_5.5rem_4rem]'
export const MATCH_HEAD = { cols: MATCH_COLS, labels: ['종목', '날짜', '시간', '제목', '경기장', '호스트', '1인당', '참가'] } as const

/** 카드 모드 전용 장식 — 표 모드에는 걸리지 않는다(그릇인 DataList가 테두리와 구분선을 맡는다) */
const CARD_ONLY = '@max-4xl:rounded-lg @max-4xl:border @max-4xl:border-border @max-4xl:bg-card @max-4xl:p-4'
/**
 * 내가 만든 매칭 = **옅은 민트 줄**(참가자 표의 내 줄과 같은 색 — 「내 것 = 옅은 민트」). 카드 모드는 카드 바탕을 덮는다.
 * 뒤에 와야 `CARD_ONLY`의 카드 바탕을 이긴다.
 */
const HOSTED_ROW = 'bg-self/10 @max-4xl:bg-self/10 hover:bg-self/15'
/** 날짜·시간 — 카드에서는 16px 굵게(그 카드의 제목), 표에서는 다른 칸과 같은 14px */
const WHEN = cn(TYPO.bodyStrong, 'tabular-nums @4xl:text-body2 @4xl:font-medium')
/** 카드 모드에서만 붙는 이름표(「호스트」·「참가」) — 표 모드에서는 열 제목이 그 일을 한다 */
const CARD_LABEL = 'text-muted-foreground @4xl:hidden'

type Props = {
    match: MatchListItem
    /** 「참가 중」 칩 — 내 매칭 탭에서는 전부 참가 중이라 끈다 */
    showJoined?: boolean
}

/**
 * 매칭 한 건 — `DataList` 안에서 그린다. 순서는 **종목 │ 날짜 │ 시간 │ 제목 │ 경기장 │ 호스트 │ 1인당 │ 참가**.
 *   · 표 모드: 글자는 14px 하나. 주 정보(날짜·시간·제목)만 굵다. 제목 앞 자물쇠 = 비공개
 *   · 카드 모드: 종목·날짜·시간 / 제목 + 칩 / 경기장 / 호스트·1인당·참가
 * 내가 만든 매칭은 줄 배경이 옅은 민트, 호스트 칸 이름이 민트·굵게. 「1인당」 = 코트비 ÷ 정원(안 적었으면 「미정」, 0원은 「무료」 — 총액은 매칭룸 머리에). 참가 칸은 「2/4명」(참가/정원, 0104) — 비공개 매칭에 참가하지 않았으면 인원을 셀 수 없어 「-/4명」.
 * 비밀번호를 넣을 수 있는 비공개 줄(참가 전·확정 전·마감 아님)은 누르면 비밀번호 팝업이 열린다(`PrivateMatchLink`).
 */
export function MatchCard({ match, showJoined = true }: Props) {
    const place = [formatCourt(match.courtName, match.courtNo), match.surface && SURFACE_LABELS[match.surface]].filter(Boolean).join(' · ') || '장소 미정'
    const title = displayMatchTitle(match)
    const className = cn(
        'flex flex-col gap-2 transition-colors', CARD_ONLY, ROW_GRID, ROW_PAD, ROW_BOX, MATCH_COLS,
        match.hosted ? HOSTED_ROW : 'hover:bg-muted/50',
    )
    const body = (
        <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 @4xl:contents">
                <span className={cn(chipClass(), 'justify-self-start', getMatchTypeBadgeClass(match.matchType))}>{MATCH_TYPE_LABELS[match.matchType]}</span>
                <span className={WHEN}>{formatDayWithWeekday(match.playedAt)}</span>
                <span className={WHEN}>{formatMatchHours(match.playedTime, match.durationMinutes) || '시간 미정'}</span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 @4xl:flex-nowrap">
                <span className={cn(TYPO.body2Strong, 'flex min-w-0 items-center gap-1.5')}>
                    {!match.isListed && <><Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /><span className="sr-only">비공개</span></>}
                    {/* 방 제목은 40자 제한이라 말줄임 없이 다 보인다(길면 칸 안에서 줄바꿈 — 오너 결정 11-26) */}
                    <span className="min-w-0 break-keep">{title}</span>
                </span>
                <MatchStatusChips match={match} showJoined={showJoined} />
            </div>
            <span className={cn(TYPO.body2, 'min-w-0 truncate')}>{place}</span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 @4xl:contents">
                {/* 카드의 「호스트」는 열 제목 대신인 이름표(모든 줄). 내가 만든 매칭은 이름이 민트·굵게 */}
                <span className={cn(TYPO.body2, 'min-w-0 truncate', match.hosted && 'font-semibold text-self')}>
                    <span className={cn(CARD_LABEL, 'font-normal')}>호스트 </span>{match.hostName}
                </span>
                <span className={cn(TYPO.body2, 'shrink-0 tabular-nums')}><span className={CARD_LABEL}>· 1인당 </span>{formatPerPerson(match)}</span>
                <span className={cn(TYPO.body2, 'shrink-0 tabular-nums')}><span className={CARD_LABEL}>· 참가 </span>{formatHeadcount(match.memberCount, match.capacity)}</span>
            </div>
        </>
    )

    const passwordEntry = !match.isListed && !match.joined && !match.confirmedAt && !match.closedAt
    return passwordEntry
        ? <PrivateMatchLink matchId={match.id} hostName={match.hostName} title={title} className={className}>{body}</PrivateMatchLink>
        : <Link href={`/matches/${match.id}`} className={className}>{body}</Link>
}
