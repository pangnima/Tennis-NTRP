import { notFound, redirect } from 'next/navigation'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GameEditForm } from '@/components/games/game-edit-form'
import { recentCourtNames } from '@/lib/games/defaults'
import { canEditGame } from '@/lib/games/permissions'
import { fetchGameById, fetchUserGames } from '@/lib/queries/games'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '경기 수정' }

type Props = { params: Promise<{ id: string }> }

/**
 * 스코어 수정 — **매칭 없이 친 직접 기록 전용**. 잠기기 전이면 참가 회원 누구나, 자격이 없으면 돌려보낸다.
 * 매칭 게임은 매칭 화면의 게임 보드에서 그 자리의 [수정]으로 고친다(같은 UI) — 이 주소로 오면 매칭으로 보낸다.
 */
export default async function EditGamePage({ params }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id } = await params
    const game = await fetchGameById(id)
    if (!game) notFound()
    if (game.matchId) redirect(`/matches/${game.matchId}`)

    const myGames = await fetchUserGames(user.id)
    if (!canEditGame(game, user.id, {})) redirect('/games')

    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl"
                title="경기 수정"
                description="고치면 다른 참가자에게 알림이 갑니다. 참가자를 바꾸려면 삭제하고 다시 기록해 주세요"
            />
            <div className="mx-auto w-full max-w-2xl">
                <GameEditForm game={game} viewerId={user.id} recentCourtNames={recentCourtNames(myGames)} returnTo="/games" />
            </div>
        </PageContainer>
    )
}
