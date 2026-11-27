import { redirect } from 'next/navigation'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GameForm } from '@/components/record/game-form'
import { recentCourtNames, recordDefaults } from '@/lib/games/defaults'
import { fetchUserGames } from '@/lib/queries/games'
import { fetchUserById } from '@/lib/queries/users'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '경기 기록' }

type Props = { searchParams: Promise<{ match?: string }> }

/**
 * 경기 기록 — 매칭 없이 친 경기를 한 장에 남기는 폼. 매칭 만들기와 같은 구성(경기 정보 → 누구와 → 게임)이고,
 * 참가자 여러 명이 번갈아 친 게임을 줄마다 대진·스코어로 적는다(0105). 회원·비회원을 가리지 않고, 저장하면 곧 반영된다.
 * 매칭 안의 게임은 여기서 받지 않는다 — 매칭 화면의 게임 보드가 대진과 스코어를 함께 받는다(옛 `?match=` 주소는 그리로 보낸다).
 */
export default async function RecordPage({ searchParams }: Props) {
    const { match: matchId } = await searchParams
    if (matchId) redirect(`/matches/${encodeURIComponent(matchId)}`)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [me, games] = await Promise.all([fetchUserById(user.id), fetchUserGames(user.id)])
    const defaults = recordDefaults(games)
    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl"
                title="경기 기록"
                description="매칭 없이 친 경기를 적습니다. 저장하면 참가한 회원 모두의 전적에 바로 반영되고, 틀린 스코어는 참가자 누구나 고칠 수 있습니다"
            />
            <div className="mx-auto w-full max-w-2xl">
                <GameForm
                    recentCourtNames={recentCourtNames(games)}
                    defaults={{ viewerId: user.id, viewerName: me?.name ?? '나', matchType: 'singles', ...defaults, returnTo: '/games' }}
                />
            </div>
        </PageContainer>
    )
}
