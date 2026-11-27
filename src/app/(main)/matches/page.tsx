import { redirect } from 'next/navigation'

import { ActionButton } from '@/components/common/action-button'
import { DataList, DataListDivider } from '@/components/common/data-list'
import { EmptyState } from '@/components/common/empty-state'
import { LinkTabs } from '@/components/common/link-tabs'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { MATCH_HEAD, MatchCard } from '@/components/matches/match-card'
import { splitMatchesByEnd } from '@/lib/matches/when'
import { NAV_LABEL } from '@/lib/nav-items'
import { fetchMatchList } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: NAV_LABEL.matches }

type Props = { searchParams: Promise<{ tab?: string; error?: string }> }

const TABS = [
    { key: 'all', label: '전체', href: '/matches' },
    { key: 'mine', label: '내 매칭', href: '/matches?tab=mine' },
]

/**
 * 매칭 리스트 — 큰 묶음 제목 없이 **임박한 일정부터 한 목록**이다.
 *   · [전체]: 일정이 끝나지 않은 매칭만(고르러 오는 곳이라 끝난 매칭은 사라진다 — 모집 마감된 매칭도 끝날 때까지 칩을 달고 보인다)
 *   · [내 매칭]: 예정(임박순) 다음에 얇은 구분 줄 「지난 매칭」을 두고 지난 것(최근순)을 잇는다(기준은 종료 시각) — 경기 뒤 게임 기록과
 *     최종 확정이 남아 있다. 지난 매칭을 흐리게 하지 않는다(읽어야 하는 값이다).
 */
export default async function MatchesPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { tab, error } = await searchParams
    const mine = tab === 'mine'
    const { upcoming, past: allPast } = splitMatchesByEnd(await fetchMatchList(user.id, mine ? 'mine' : 'all'))
    const past = mine ? allPast : []
    const create = <ActionButton href="/matches/new" variant="solid" size="md">+ 매칭 만들기</ActionButton>

    return (
        <PageContainer>
            <PageHeader
                title={NAV_LABEL.matches}
                description="함께 칠 사람을 모으는 곳입니다. 참가한 뒤 그 안에서 게임을 기록합니다"
                actions={create}
            />
            {error === 'invite' && (
                <p role="alert" className="text-body2 text-destructive">유효하지 않은 초대 링크이거나, 이미 확정됐거나 모집이 마감된 매칭입니다.</p>
            )}
            <LinkTabs items={TABS} activeKey={mine ? 'mine' : 'all'} ariaLabel="매칭 범위" />
            {upcoming.length + past.length === 0 ? (
                <EmptyState
                    size="md"
                    title={mine ? '참가한 매칭이 없습니다' : '예정된 매칭이 없습니다'}
                    description="직접 매칭을 만들어 사람을 불러 보세요"
                    actions={create}
                />
            ) : (
                <DataList head={MATCH_HEAD}>
                    {upcoming.map((m) => <MatchCard key={m.id} match={m} showJoined={!mine} />)}
                    {past.length > 0 && <DataListDivider count={`${past.length}건`}>지난 매칭</DataListDivider>}
                    {past.map((m) => <MatchCard key={m.id} match={m} showJoined={false} />)}
                </DataList>
            )}
        </PageContainer>
    )
}
