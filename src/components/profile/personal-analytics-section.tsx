import { Suspense } from 'react'
import type { AnalyticsBundle } from '@/lib/queries/analytics'
import type { User } from '@/types'
import { StatsQuadGrid } from '@/components/stats/stats-quad-grid'
import { StatsPrivacyToggle } from '@/components/stats/stats-privacy-toggle'
import { HeadToHeadCard } from '@/components/stats/head-to-head-card'
import { SurfaceStatsCard } from '@/components/stats/surface-stats-card'
import { NtrpDifferentialCard } from '@/components/stats/ntrp-differential-card'
import { StrengthWeaknessCard } from '@/components/stats/strength-weakness-card'
import { PersonalRatingTrendCard } from '@/components/stats/personal-rating-trend-card'
import { WinRateTrendCard } from '@/components/stats/win-rate-trend-card'
import { ActivityHourHeatmapCard } from '@/components/stats/activity-hour-heatmap-card'
import { RivalAnalysisCard } from '@/components/stats/rival-analysis-card'
import { PartnerChemistryCard } from '@/components/stats/partner-chemistry-card'
import { OpponentHandStatsCard } from '@/components/stats/opponent-hand-stats-card'
import { DoublesCourtStatsCard } from '@/components/stats/doubles-court-stats'
import { aggregateBySurface } from '@/lib/analytics/surface'
import { aggregateByDoublesCourtSide } from '@/lib/analytics/doubles-court'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { aggregateByOpponentHand } from '@/lib/analytics/opponent-hand'
import { diagnoseStrengthsWeaknesses } from '@/lib/analytics/diagnostics'
import {
    listMatchYears,
    aggregateWeekdayStats,
    aggregateWeekOfYearStats,
    aggregateMonthOfYearStats,
} from '@/lib/analytics/trend-stats'
import { aggregateHourHeatmap } from '@/lib/analytics/hour-heatmap'
import { selectRivals } from '@/lib/analytics/rival'
import { aggregatePartnerChemistry } from '@/lib/analytics/partner-chemistry'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { effectiveNtrp } from '@/lib/rating/display'
import { todayIsoKst } from '@/lib/format'
import { TYPO } from '@/lib/dashboard/tokens'
import { EmptyState } from '@/components/common/empty-state'
import { ActionButton } from '@/components/common/action-button'
import { NAV_LABEL, RECORD_PATH } from '@/lib/nav-items'

type Props = {
    bundle: AnalyticsBundle
    me: User
    /**
     * `self`는 본인 프로필(공개 토글·빈 상태 CTA·[+ 직접 기록]), `public`은 타인이 보는 공개 전적(F-24) —
     * 카드는 같은 한 벌이고 손댈 수 있는 것만 뺀다. 통계 비공개는 페이지가 이 섹션 대신 잠긴 4카드를 그린다.
     */
    viewer?: 'self' | 'public'
}

/**
 * 개인 분석 풀버전 섹션 — 본인 프로필과 타인의 공개 전적(F-24)이 같은 카드 한 벌을 쓴다.
 */
export async function PersonalAnalyticsSection({ bundle, me, viewer = 'self' }: Props) {
    const isSelf = viewer === 'self'

    // 기록이 없으면 빈 카드 열두 장을 늘어놓지 않는다 — 무엇을 하면 채워지는지 한 장으로 말한다
    if (bundle.personalGames.length === 0) {
        return (
            <EmptyState
                size="md"
                image="/empty/record-empty.svg"
                title={isSelf ? '아직 기록한 경기가 없습니다' : '아직 기록된 경기가 없습니다'}
                description={isSelf ? '경기를 기록하면 승률·강약점·맞대결·레이팅 추이가 여기에 채워집니다' : undefined}
                actions={isSelf ? <ActionButton href={RECORD_PATH} variant="solid" size="md">+ {NAV_LABEL.record}</ActionButton> : undefined}
            />
        )
    }
    // 집계는 전부 통계용 분해본(세트 1개 = 게임 1개)을 읽는다
    const games = { personalMatches: bundle.personalGames }

    const surfaceStats = aggregateBySurface(games)
    // NTRP 차이 분석은 진화 NTRP(personalNtrp 우선) 기준 — 실제 실력 대비 성적.
    const ntrpUserMap = new Map([...bundle.userMap.entries()].map(([id, u]) => [id, { ntrp: effectiveNtrp(u) }]))
    const myEffectiveNtrp = effectiveNtrp(me) || null
    const ntrpStats = aggregateByNtrpDiff({ ...games, userMap: ntrpUserMap }, myEffectiveNtrp)
    const diagnosis = diagnoseStrengthsWeaknesses({ ...games, userMap: ntrpUserMap }, myEffectiveNtrp)
    const opponentHandStats = aggregateByOpponentHand({ ...games, userMap: bundle.userMap })
    const doublesCourtStats = aggregateByDoublesCourtSide(games)

    // ── 고도화 집계 ───────────────────────────────────────────
    const today = todayIsoKst()
    const trendYears = listMatchYears(games).map((year) => ({
        year,
        daily: aggregateWeekdayStats(games, year),
        weekly: aggregateWeekOfYearStats(games, year),
        monthly: aggregateMonthOfYearStats(games, year),
    }))
    const weeklyHeatmap = aggregateHourHeatmap(games, today, 28)   // 최근 4주
    const monthlyHeatmap = aggregateHourHeatmap(games, today, 182) // 최근 약 6개월
    const rivals = selectRivals(games, bundle.h2hList, bundle.userMap)
    const chemistry = aggregatePartnerChemistry(games, me.gender)

    // 경기 승패 기반 개인 레이팅 (온더플라이)
    const personalRating = replayPersonalRatings(bundle.personalGames, me.ntrp ?? null, (id) => bundle.userMap.get(id)?.ntrp)

    // 타인에게는 행동 유도가 없다 — 남의 프로필에서 [경기 기록]을 눌러도 내 일이 아니다
    const emptyRecordHref = isSelf ? RECORD_PATH : undefined

    return (
        <div className="space-y-8">
            {/* 전적 통계 (4칸) — 세트 표기 숨김(심플) */}
            <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                    <h2 className={`${TYPO.h3} shrink-0`}>전적 통계</h2>
                    {isSelf && (
                        <div className="ml-auto">
                            <StatsPrivacyToggle hidden={me.statsHidden} />
                        </div>
                    )}
                </div>
                <StatsQuadGrid
                    gender={me.gender}
                    singles={bundle.stats.singles}
                    menDoubles={bundle.stats.menDoubles}
                    womenDoubles={bundle.stats.womenDoubles}
                    mixedDoubles={bundle.stats.mixedDoubles}
                    privacy={isSelf && me.statsHidden ? 'self' : 'public'}
                    showSets={false}
                    emptyRecordHref={emptyRecordHref}
                />
            </section>

            {/* 내 승률 추이 + 경기 활동 히트맵 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WinRateTrendCard years={trendYears} />
                <ActivityHourHeatmapCard weekly={weeklyHeatmap} monthly={monthlyHeatmap} />
            </div>

            {/* 진단성 카드 4종 (라이벌 · 파트너 · NTRP 대비 · 강점약점) — 1행 4칸 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                <RivalAnalysisCard rivals={rivals} userMap={bundle.userMap} today={today} />
                <PartnerChemistryCard partners={chemistry} userMap={bundle.userMap} />
                <NtrpDifferentialCard ntrpStats={ntrpStats} />
                <StrengthWeaknessCard diagnosis={diagnosis} />
            </div>

            {/* 코트 표면 · 상대 손잡이 · 복식 코트 성향 — 1행 3칸 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <SurfaceStatsCard surfaceStats={surfaceStats} />
                <OpponentHandStatsCard handStats={opponentHandStats} />
                <DoublesCourtStatsCard court={doublesCourtStats} />
            </div>

            {/* 1:1 맞대결 비교 */}
            <Suspense>
                <HeadToHeadCard
                    h2hList={bundle.h2hList}
                    bundle={games}
                    userId={me.id}
                    userMap={bundle.userMap}
                />
            </Suspense>

            {/* 개인 레이팅 추세 (경기가 있을 때) */}
            {personalRating.history.length > 0 && (
                <PersonalRatingTrendCard
                    points={personalRating.history}
                    provisional={personalRating.provisional}
                />
            )}

        </div>
    )
}
