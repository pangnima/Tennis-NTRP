import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'

import { PageHeader } from '@/components/common/page-header'
import { getMatchTypeBadgeClass, MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { NEUTRAL_PILL, PILL_BASE, TYPO } from '@/lib/dashboard/tokens'
import { formatCourt } from '@/lib/matches/court'
import { formatFeeLine, isMatchFull } from '@/lib/matches/fee'
import { displayMatchTitle } from '@/lib/matches/title'
import { formatMatchWhen, MATCH_STATUS_LABEL, matchStatus } from '@/lib/matches/when'
import { cn } from '@/lib/utils'
import type { TennisMatch } from '@/types'

type Props = {
    match: TennisMatch
    hostName: string
    /** 참가 인원(회원 + 명단의 비회원) — 비공개 매칭에 참가하기 전에는 셀 수 없어 null */
    headcount: number | null
    /** 메모를 가린다 — 비공개 매칭에 참가하기 전 */
    hideNotes?: boolean
    eyebrow?: ReactNode
    actions?: ReactNode
}

/**
 * 매칭의 머리 한 덩어리 — 큰 제목(방 제목, 없으면 일시)·칩 / 일시·장소·호스트 / 코트비·1인당·정원 / 메모.
 * **매칭 상세와 초대 링크 화면이 같이 쓴다**(0108) — 초대받은 사람이 보는 요약이 참가자가 보는 머리와 어긋나지 않게.
 * 비용·정원은 신청 전에 알아야 하는 값이라 일시 줄 바로 아래, 비공개 매칭도 참가 전에 보인다.
 */
export function MatchHeadline({ match, hostName, headcount, hideNotes = false, eyebrow, actions }: Props) {
    const confirmed = !!match.confirmedAt
    const when = formatMatchWhen(match)
    const place = [formatCourt(match.courtName, match.courtNo) || '장소 미정', match.surface && SURFACE_LABELS[match.surface]].filter(Boolean).join(' · ')
    const closed = !confirmed && (!!match.closedAt || isMatchFull(match.capacity, headcount))

    return (
        <PageHeader
            eyebrow={eyebrow}
            // 큰 제목 = 방 제목(0101). 제목이 없는 예전 매칭은 일시가 제목이다
            title={match.title ? displayMatchTitle(match) : when}
            badge={
                <span className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(PILL_BASE, getMatchTypeBadgeClass(match.matchType))}>{MATCH_TYPE_LABELS[match.matchType]}</span>
                    <span className={NEUTRAL_PILL}>{MATCH_STATUS_LABEL[matchStatus(match)]}</span>
                    {closed && <span className={NEUTRAL_PILL}>모집 마감</span>}
                    {!match.isListed && <span className={cn(NEUTRAL_PILL, 'gap-1')}><Lock className="h-3 w-3" aria-hidden />비공개</span>}
                </span>
            }
            info={[match.title && when, place, `호스트 ${hostName}`].filter(Boolean).join(' · ')}
            note={
                <div className="space-y-2">
                    <p className={cn(TYPO.body2, 'break-keep')}>{formatFeeLine(match, headcount)}</p>
                    {match.notes && !hideNotes && (
                        <p className={cn(TYPO.body2, 'whitespace-pre-line break-keep')}>
                            <span className="mr-2 text-muted-foreground">메모</span>{match.notes}
                        </p>
                    )}
                </div>
            }
            actions={actions}
        />
    )
}
