import { redirect } from 'next/navigation'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { MatchForm } from '@/components/matches/match-form'
import type { MatchFormValues } from '@/components/matches/use-match-form'
import { recentCourtNames, recordDefaults } from '@/lib/games/defaults'
import { defaultCapacity } from '@/lib/matches/fee'
import { DEFAULT_DURATION_MINUTES, nextMatchStart } from '@/lib/matches/when'
import { fetchUserGames } from '@/lib/queries/games'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '매칭 만들기' }

export default async function NewMatchPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const games = await fetchUserGames(user.id)
    const d = recordDefaults(games)
    // 기본 일시는 다음 정각 — 직접 기록의 기본값(오늘 현재 시)을 쓰면 만들자마자 이미 시작한 매칭이 된다
    const start = nextMatchStart()
    const initial: MatchFormValues = {
        title: '', matchType: 'men_doubles', playedAt: start.playedAt, playedTime: start.playedTime, duration: String(DEFAULT_DURATION_MINUTES),
        surface: d.surface, courtName: d.courtName, courtNo: '', courtFee: '', capacity: String(defaultCapacity('men_doubles')), notes: '', access: 'public', password: '', invitees: [],
    }
    return (
        <PageContainer>
            <PageHeader
                className="mx-auto w-full max-w-2xl"
                title="매칭 만들기"
                description="일정과 장소를 정하고 사람을 부릅니다. 스코어는 매칭 안에서 게임마다 기록합니다"
            />
            <div className="mx-auto w-full max-w-2xl">
                <MatchForm viewerId={user.id} initial={initial} recentCourtNames={recentCourtNames(games)} />
            </div>
        </PageContainer>
    )
}
