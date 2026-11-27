import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { EmptyState } from '@/components/common/empty-state'
import { PageContainer } from '@/components/common/page-container'
import { MatchGameBoard } from '@/components/matches/board/match-game-board'
import { InviteJoinPanel } from '@/components/matches/invite/invite-join-panel'
import { InviteRoster } from '@/components/matches/invite/invite-roster'
import { MatchHeadline } from '@/components/matches/match-headline'
import { TYPO } from '@/lib/design/tokens'
import { inviteJoinBlocked } from '@/lib/matches/invite'
import { displayMatchTitle } from '@/lib/matches/title'
import { fetchInvitedMatch } from '@/lib/queries/invite'
import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ token: string }> }

/** 메신저에 붙였을 때 방 제목이 보이게 — 링크를 가진 사람만 여는 화면이라 검색에는 올리지 않는다 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params
    const view = await fetchInvitedMatch(token)
    return { title: view ? `${displayMatchTitle(view.match)} · 초대` : '초대 링크', robots: { index: false, follow: false } }
}

/**
 * 초대받은 매칭(0108) — **로그인 없이** 열린다(보호 라우트가 아니다, `/guide`처럼 비로그인 셸).
 * 초대 링크(`/matches/join/<token>`)를 연 비로그인 방문자가 여기로 온다: 매칭 요약 → [회원으로 참가]/[비회원으로 참가] →
 * 참가자(이름·성별·구분) → 대진·스코어(읽기 전용 보드). 비회원으로 등록한 사람이 대진을 확인하러 다시 여는 화면이기도 하다.
 * 로그인한 회원이 열면 지금처럼 바로 참가시킨다. 매칭 종료 7일 뒤에는 닫힌다(DB).
 */
export default async function InvitePage({ params }: Props) {
    const { token } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect(`/matches/join/${token}`)

    const view = await fetchInvitedMatch(token)
    if (!view) {
        return (
            <PageContainer>
                <EmptyState size="md" title="열 수 없는 초대 링크입니다" description="주소가 잘못됐거나 끝난 지 오래된 매칭입니다. 호스트에게 링크를 다시 받아 주세요." />
            </PageContainer>
        )
    }
    const { match, hostName, roster, games, pool, me } = view

    return (
        <PageContainer>
            {/* eyebrow의 넓은 자간은 영문 대문자용이라 한글에는 푼다 */}
            <MatchHeadline match={match} hostName={hostName} headcount={roster.length} eyebrow={<span className="tracking-normal">초대받은 매칭</span>} />
            <InviteJoinPanel
                token={token} matchType={match.matchType} hostName={hostName}
                takenKeys={roster.map((r) => r.key)} guestNames={roster.filter((r) => r.kind === 'guest').map((r) => r.name)}
                blocked={inviteJoinBlocked(view)} confirmed={!!match.confirmedAt} me={me}
            />
            <InviteRoster roster={roster} capacity={match.capacity} meKey={me?.key} />
            {games.length > 0 ? (
                <MatchGameBoard
                    matchId={match.id} matchType={match.matchType} durationMinutes={match.durationMinutes}
                    games={games} roster={pool} readOnly meKey={me?.key}
                />
            ) : (
                <section className="space-y-3">
                    <h2 className={TYPO.h3}>게임 0</h2>
                    <EmptyState title="아직 대진이 없습니다" description="참가자가 대진을 짜면 여기에 보입니다" />
                </section>
            )}
        </PageContainer>
    )
}
