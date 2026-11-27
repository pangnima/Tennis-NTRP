import { DataList } from '@/components/common/data-list'
import { MatchGuestAddButton } from '@/components/matches/match-guest-actions'
import { MatchHostTools } from '@/components/matches/match-host-tools'
import { MEMBER_HEAD, MatchGuestRow, MatchMemberRow, type MemberRowAction } from '@/components/matches/match-member-row'
import { TYPO } from '@/lib/design/tokens'
import { formatHeadcount, isMatchFull } from '@/lib/matches/fee'
import type { MatchGuest, MatchMember } from '@/lib/queries/matches'
import type { MatchType } from '@/types'

type Props = {
    matchId: string
    matchType: MatchType
    viewerId: string
    members: MatchMember[]
    /** 명단의 비회원(0108) — 회원 줄 뒤에 서고 인원에 함께 센다 */
    guests: MatchGuest[]
    isHost: boolean
    isMember: boolean
    confirmed: boolean
    isListed: boolean
    inviteToken: string | null
    /** 모집 마감 중 · 대기 중 신청 수 — 호스트 도구가 읽는다 */
    closed: boolean
    applicantCount: number
    /** 정원(0104) — 제목에 「참가자 2/4명」 */
    capacity: number
}

/**
 * 「참가자 N/정원명」(회원 + 비회원) — 제목 옆은 호스트의 사람 다루기([모집 마감]/[마감 해제]·[회원 초대]·[초대 링크 복사]·비공개면 [비밀번호 변경]),
 * 표의 줄 끝은 내 줄 [나가기] · 호스트가 보는 남의 줄 [내보내기] · 비회원 줄 [빼기](호스트·넣은 사람).
 * 표 아래 **[+ 비회원 추가]**는 참가자 누구나 — 정원이 찼거나 모집 마감이면 호스트에게만 보인다(직접 초대와 같은 규칙).
 * 확정된 매칭에서는 명단을 바꾸지 않는다.
 */
export function MatchMembersSection({
    matchId, matchType, viewerId, members, guests, isHost, isMember, confirmed, isListed, inviteToken, closed, applicantCount, capacity,
}: Props) {
    const headcount = members.length + guests.length
    const actionOf = (m: MatchMember): MemberRowAction => {
        if (confirmed || m.role === 'host') return null
        if (m.id === viewerId) return 'leave'
        return isHost ? 'remove' : null
    }
    const canAddGuest = isMember && !confirmed && (isHost || (!closed && !isMatchFull(capacity, headcount)))

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={TYPO.h3}>참가자 {formatHeadcount(headcount, capacity)}</h2>
                {isHost && !confirmed && (
                    <MatchHostTools
                        matchId={matchId}
                        viewerId={viewerId}
                        memberIds={members.map((m) => m.id)}
                        inviteToken={inviteToken}
                        isListed={isListed}
                        closed={closed}
                        applicantCount={applicantCount}
                    />
                )}
            </div>
            <DataList head={MEMBER_HEAD}>
                {members.map((m) => (
                    <MatchMemberRow key={m.id} member={m} isMe={m.id === viewerId} action={actionOf(m)} matchId={matchId} />
                ))}
                {guests.map((g) => (
                    <MatchGuestRow key={g.id} guest={g} canRemove={!confirmed && isMember && (isHost || g.addedBy === viewerId)} />
                ))}
            </DataList>
            {canAddGuest && <MatchGuestAddButton matchId={matchId} matchType={matchType} guestNames={guests.map((g) => g.name)} />}
        </section>
    )
}
