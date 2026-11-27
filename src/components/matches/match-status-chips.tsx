import { NEUTRAL_PILL, PILL_BASE } from '@/lib/dashboard/tokens'
import { isMatchFull } from '@/lib/matches/fee'
import type { MatchListItem } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'

/**
 * 목록 줄의 상태 칩 — **예외만** 단다. 「진행 중」·「모집 중」은 기본이라 말하지 않는다.
 * 확정됨 | 모집 마감(호스트가 마감했거나 **정원이 찼다**, 0104) · 참가 중(남이 만든 매칭, [전체]만) · 신청 중.
 * 비공개는 칩이 아니라 제목 앞 자물쇠, 내가 만든 매칭은 칩이 아니라 줄 배경·호스트 칸 색(제목 자리를 아끼려고).
 */
export function MatchStatusChips({ match, showJoined }: { match: MatchListItem; showJoined: boolean }) {
    const chip = 'shrink-0'
    return (
        <>
            {match.confirmedAt
                ? <span className={cn(NEUTRAL_PILL, chip)}>확정됨</span>
                : (match.closedAt || isMatchFull(match.capacity, match.memberCount)) && <span className={cn(NEUTRAL_PILL, chip)}>모집 마감</span>}
            {!match.hosted && showJoined && match.joined && <span className={cn(PILL_BASE, chip, 'border-primary/40 text-primary')}>참가 중</span>}
            {match.applied && !match.joined && <span className={cn(PILL_BASE, chip, 'border-spot/50 text-spot')}>신청 중</span>}
        </>
    )
}
