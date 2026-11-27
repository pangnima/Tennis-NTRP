import { redirect } from 'next/navigation'

import { EmptyState } from '@/components/common/empty-state'
import { PageContainer } from '@/components/common/page-container'
import { MatchGameBoard } from '@/components/matches/board/match-game-board'
import { MatchHeaderActions } from '@/components/matches/match-actions'
import { MatchApplicationList } from '@/components/matches/match-application-list'
import { MatchHeadline } from '@/components/matches/match-headline'
import { MatchMembersSection } from '@/components/matches/match-members-section'
import { MatchPasswordGate } from '@/components/matches/match-password-gate'
import { CARD_BASE, TYPO } from '@/lib/design/tokens'
import { guestKey, type PoolPlayer } from '@/lib/games/board'
import { isMatchFull } from '@/lib/matches/fee'
import { isRecruitmentClosed } from '@/lib/matches/when'
import {
    fetchHasApplied, fetchInviteToken, fetchMatchApplicants, fetchMatchById, fetchMatchGames, fetchMatchGuests, fetchMatchMembers,
} from '@/lib/queries/matches'
import { fetchUserById } from '@/lib/queries/users'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const metadata = { title: '매칭' }

type Props = { params: Promise<{ id: string }> }

/**
 * 매칭 상세 — 위에서 아래로 한 줄기: 언제·어디서 → (호스트) 참가 신청 → 참가자 → 게임 보드(대진 + 스코어).
 * 입구는 둘(0099): 공개 매칭은 제목 오른쪽 [참가 신청] → 호스트 승인, 비공개 매칭은 비밀번호 카드(맞으면 바로 참가).
 * 비공개 매칭의 명단·게임은 참가자에게만 보인다. 상태는 둘뿐(진행 중/확정됨)이다.
 * 참가자는 회원 + **명단의 비회원**(0108) — 인원·정원·1인당 금액이 둘을 함께 센다.
 */
export default async function MatchDetailPage({ params }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id } = await params
    const match = await fetchMatchById(id)
    if (!match) {
        return (
            <PageContainer>
                <EmptyState size="md" title="없는 매칭입니다" description="삭제됐거나 주소가 잘못됐습니다" />
            </PageContainer>
        )
    }

    const isHost = match.hostId === user.id
    const [members, guests, games, host, applicants, hasApplied] = await Promise.all([
        fetchMatchMembers(id),
        fetchMatchGuests(id),
        fetchMatchGames(id, !!match.confirmedAt),
        fetchUserById(match.hostId),
        isHost ? fetchMatchApplicants(id) : [],
        fetchHasApplied(id, user.id),
    ])
    const isMember = members.some((m) => m.id === user.id)
    const inviteToken = isHost ? await fetchInviteToken(id) : null
    const confirmed = !!match.confirmedAt
    const locked = !match.isListed && !isMember
    // 보드의 선수 풀 = 명단(회원 + 비회원). 탈퇴한 회원은 새 대진에 넣지 않는다(이미 게임에 있으면 보드가 게임에서 읽어 둔다)
    const roster: PoolPlayer[] = [
        ...members.filter((m) => !m.deleted).map((m): PoolPlayer => ({
            key: m.id, userId: m.id, name: m.name, ntrp: m.ntrp, personalNtrp: m.personalNtrp, statsHidden: m.statsHidden,
            hand: m.dominantHand, gender: m.gender, isMember: true,
        })),
        ...guests.map((g): PoolPlayer => ({ key: guestKey(g.name), name: g.name, ntrp: g.ntrp, hand: g.hand, gender: g.gender, isMember: false })),
    ]
    const closed = !!match.closedAt && !confirmed
    // 정원(0104) — 차면 신청·입장이 닫힌다. 비공개 매칭에 참가하기 전에는 인원을 셀 수 없다(입장할 때 DB가 판정)
    const headcount = locked ? null : members.length + guests.length
    const full = !confirmed && isMatchFull(match.capacity, headcount)

    return (
        <PageContainer>
            <MatchHeadline
                match={match} hostName={host?.name ?? ''} headcount={headcount} hideNotes={locked}
                actions={
                    <MatchHeaderActions
                        matchId={match.id} isHost={isHost} isMember={isMember} isListed={match.isListed} confirmed={confirmed}
                        scoredCount={games.filter((g) => g.sets.length > 0).length} hasApplied={hasApplied}
                        applicationClosed={isRecruitmentClosed(match, new Date(), headcount)}
                    />
                }
            />
            {confirmed && (
                <p className={cn(CARD_BASE, TYPO.body2Muted, 'p-4 break-keep')}>
                    호스트가 최종 확정한 매칭입니다. 게임을 추가하거나 고칠 수 없습니다. 기록이 틀렸다면 호스트에게 확정 취소를 요청해 주세요.
                </p>
            )}

            {locked ? (
                !confirmed && <MatchPasswordGate matchId={match.id} hostName={host?.name ?? '호스트'} closed={closed} />
            ) : (
                <>
                    {isHost && !confirmed && <MatchApplicationList matchId={match.id} applicants={applicants} full={full} />}
                    <MatchMembersSection
                        matchId={match.id} matchType={match.matchType} viewerId={user.id} members={members} guests={guests}
                        isHost={isHost} isMember={isMember} confirmed={confirmed} isListed={match.isListed} inviteToken={inviteToken}
                        closed={closed} applicantCount={applicants.length} capacity={match.capacity}
                    />
                    {/* 참가자는 고치는 보드, 확정된 매칭·비참가자는 같은 보드를 읽기 전용으로 — 확정해도 모양이 바뀌지 않는다 */}
                    {(isMember && !confirmed) || games.length > 0 ? (
                        <MatchGameBoard
                            matchId={match.id} matchType={match.matchType} durationMinutes={match.durationMinutes}
                            games={games} roster={roster} readOnly={!isMember || confirmed} meKey={isMember ? user.id : undefined}
                        />
                    ) : (
                        <section className="space-y-3">
                            <h2 className={TYPO.h3}>게임 0</h2>
                            <EmptyState title="아직 기록된 게임이 없습니다" description={confirmed ? '확정된 매칭입니다' : '참가자가 되면 대진을 짜고 스코어를 입력할 수 있습니다'} />
                        </section>
                    )}
                </>
            )}
        </PageContainer>
    )
}
