import { redirect } from 'next/navigation'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { MatchForm } from '@/components/matches/match-form'
import type { MatchFormValues } from '@/components/matches/use-match-form'
import { recentCourtNames } from '@/lib/games/defaults'
import { formatAmountInput } from '@/lib/matches/fee'
import { fetchUserGames } from '@/lib/queries/games'
import { fetchMatchById, fetchMatchGames } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '매칭 수정' }

type Props = { params: Promise<{ id: string }> }

/**
 * 매칭 정보 수정 — 호스트만, 확정 전에만(아니면 매칭 화면으로). 만들기와 같은 폼을 지금 값으로 연다.
 * 게임이 있으면 종목을 잠근다(보드의 자리 수가 종목을 따른다 — DB `match_type_locked`). 비밀번호는 바꿀 때만 적는다.
 * 일시·표면·코트를 바꾸면 매칭 안 게임의 값도 따라간다(DB `update_match`).
 */
export default async function EditMatchPage({ params }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id } = await params
    const match = await fetchMatchById(id)
    if (!match) redirect('/matches')
    if (match.hostId !== user.id || match.confirmedAt) redirect(`/matches/${id}`)

    const [games, myGames] = await Promise.all([fetchMatchGames(id, false), fetchUserGames(user.id)])
    const initial: MatchFormValues = {
        title: match.title ?? '', matchType: match.matchType, playedAt: match.playedAt, playedTime: match.playedTime ?? '',
        duration: String(match.durationMinutes), surface: match.surface ?? '', courtName: match.courtName ?? '', courtNo: match.courtNo ?? '',
        courtFee: match.courtFee == null ? '' : formatAmountInput(String(match.courtFee)), capacity: String(match.capacity), notes: match.notes ?? '',
        access: match.isListed ? 'public' : 'private', password: '', invitees: [],
    }

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl"
                title="매칭 수정"
                description="방 제목·일정·장소·공개 범위를 고칩니다. 참가자 초대는 매칭 화면에서 합니다"
            />
            <div className="mx-auto w-full max-w-2xl">
                <MatchForm
                    viewerId={user.id} initial={initial} recentCourtNames={recentCourtNames(myGames)}
                    edit={{ matchId: id, typeLocked: games.length > 0, wasPrivate: !match.isListed }}
                />
            </div>
        </PageContainer>
    )
}
