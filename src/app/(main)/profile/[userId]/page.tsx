import { notFound, redirect } from 'next/navigation'

import { LinkTabs } from '@/components/common/link-tabs'
import { PageContainer } from '@/components/common/page-container'
import { MemberProfileHeader } from '@/components/profile/member-profile-header'
import { PersonalAnalyticsSection } from '@/components/profile/personal-analytics-section'
import type { ProfileSummary } from '@/components/profile/profile-summary-row'
import { WeakPasswordNotice } from '@/components/profile/weak-password-notice'
import { StatsQuadGrid } from '@/components/stats/stats-quad-grid'
import { aggregateRecentForm } from '@/lib/analytics/form'
import { WEAK_PASSWORD_NOTICE } from '@/lib/auth/password-policy'
import { TYPO } from '@/lib/dashboard/tokens'
import { NAV_LABEL, statsHref } from '@/lib/nav-items'
import { fetchAnalyticsBundle } from '@/lib/queries/analytics'
import { fetchUserById } from '@/lib/queries/users'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { combinePlayerStats, EMPTY_PLAYER_STATS, type PlayerStats } from '@/lib/stats'
import { createClient } from '@/lib/supabase/server'
import type { MatchType } from '@/types'

type Props = {
    params: Promise<{ userId: string }>
    searchParams: Promise<{ notice?: string }>
}

type QuarterStats = { singles: PlayerStats; menDoubles: PlayerStats; womenDoubles: PlayerStats; mixedDoubles: PlayerStats }

// 헤더 요약: 승률 링 + 보조 행. 주력 종목 = 경기 수 최다 종류.
function deriveSummary(stats: QuarterStats): ProfileSummary {
    const overall = combinePlayerStats(stats.singles, stats.menDoubles, stats.womenDoubles, stats.mixedDoubles)
    const counts: Array<[MatchType, number]> = [
        ['singles', stats.singles.totalMatches],
        ['men_doubles', stats.menDoubles.totalMatches],
        ['women_doubles', stats.womenDoubles.totalMatches],
        ['mixed_doubles', stats.mixedDoubles.totalMatches],
    ]
    const top = counts.reduce((a, b) => (b[1] > a[1] ? b : a))
    return {
        winRate: overall.winRate,
        wins: overall.wins,
        losses: overall.losses,
        draws: overall.draws,
        topMatchType: top[1] > 0 ? top[0] : undefined,
    }
}

/**
 * 통계 — 본인이면 「통계」 메뉴의 착지(탭 [내 통계 / 랭킹]), 타인이면 공개 요약.
 * 재료는 그 사람이 뛴 게임 전부(get_user_games → toPersonalMatches)이고, 통계 비공개·탈퇴는 RPC가 빈 배열을 준다.
 */
export default async function MemberProfilePage({ params, searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) redirect('/login')

    const { userId } = await params
    const { notice } = await searchParams
    const target = await fetchUserById(userId)
    if (!target) notFound()

    const isSelf = authUser.id === userId

    // 탈퇴한 회원의 URL — 익명화된 행이라 통계도 메타도 없다. 헤더만 배지와 함께 그린다
    if (target.deletedAt) {
        return (
            <PageContainer>
                <MemberProfileHeader user={target} />
                <p className="text-body2 text-foreground">탈퇴한 회원입니다.</p>
            </PageContainer>
        )
    }

    if (!isSelf && target.statsHidden) {
        return (
            <PageContainer>
                <MemberProfileHeader user={target} />
                <StatsQuadGrid
                    gender={target.gender}
                    singles={EMPTY_PLAYER_STATS}
                    menDoubles={EMPTY_PLAYER_STATS}
                    womenDoubles={EMPTY_PLAYER_STATS}
                    mixedDoubles={EMPTY_PLAYER_STATS}
                    privacy="locked"
                    showSets={false}
                />
            </PageContainer>
        )
    }

    const bundle = await fetchAnalyticsBundle(userId)
    // 최근 폼은 통계 분해본(personalGames)으로 — 세트 하나가 게임 하나다
    const form = aggregateRecentForm({ personalMatches: bundle.personalGames })
    const snapshot = replayPersonalRatings(bundle.personalGames, target.ntrp ?? null, (id) => bundle.userMap.get(id)?.ntrp)
    const personalRating = snapshot.matchesPlayed > 0
        ? { rating: snapshot.rating, provisional: snapshot.provisional, matchesPlayed: snapshot.matchesPlayed }
        : undefined

    return (
        <PageContainer>
            {isSelf && (
                <LinkTabs
                    ariaLabel="통계 범위"
                    activeKey="stats"
                    items={[
                        { key: 'stats', label: `내 ${NAV_LABEL.stats}`, href: statsHref(userId) },
                        { key: 'ranking', label: NAV_LABEL.ranking, href: '/ranking' },
                    ]}
                />
            )}
            <div className="space-y-2">
                {isSelf && <p className={TYPO.eyebrow}>{NAV_LABEL.stats}</p>}
                <MemberProfileHeader
                    user={target}
                    summary={deriveSummary(bundle.stats)}
                    recentForm={isSelf ? form : undefined}
                    personalRating={personalRating}
                />
            </div>
            {isSelf && notice === WEAK_PASSWORD_NOTICE && <WeakPasswordNotice />}
            <PersonalAnalyticsSection bundle={bundle} me={target} viewer={isSelf ? undefined : 'public'} />
        </PageContainer>
    )
}
