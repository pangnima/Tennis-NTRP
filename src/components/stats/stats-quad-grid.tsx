'use client'

import { useState, useEffect, useTransition } from 'react'
import { ActionButton } from '@/components/common/action-button'
import { Eye, EyeOff } from 'lucide-react'
import type { User, MatchType } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import { combinePlayerStats } from '@/lib/stats'
import { StatsQuadCard } from '@/components/stats/stats-quad-card'
import { StatsQuadCardEmpty } from '@/components/stats/stats-quad-card-empty'
import { toggleStatsHiddenAction } from '@/lib/actions/profile'

type Props = {
    gender: User['gender']
    singles: PlayerStats
    menDoubles: PlayerStats
    womenDoubles: PlayerStats
    mixedDoubles: PlayerStats
    privacy?: 'public' | 'self' | 'locked'
    // 종목 카드가 0경기일 때의 [경기 기록] (본인 화면에서만 주입 — 타인은 일러스트+메시지만)
    emptyRecordHref?: string
}

/**
 * 전적 통계 4칸. 부르는 두 곳은 기록이 0건이면 이 그리드 대신 빈 상태 한 장을 그리거나(통계 섹션)
 * 잠긴 카드로만 쓴다(통계 비공개) — 그래서 여기는 종목별 빈 카드만 다룬다.
 */
export function StatsQuadGrid({
    gender,
    singles,
    menDoubles,
    womenDoubles,
    mixedDoubles,
    privacy = 'public',
    emptyRecordHref,
}: Props) {
    const [revealed, setRevealed] = useState(false)
    const [, startTransition] = useTransition()

    // privacy가 변경되면(공개↔비공개 토글 후 재렌더) revealed를 초기화해 블러를 복원
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setRevealed(false) }, [privacy])

    // 본인 화면에서 "클릭해서 보기" → 블러 해제 + 전적 통계를 공개 상태로 전환
    function handleReveal() {
        setRevealed(true)
        startTransition(async () => {
            await toggleStatsHiddenAction(false)
        })
    }

    // 4칸 고정을 위해 성별에 따라 남복/여복 중 정확히 1개만 노출 (female=여복, 그 외=남복)
    const showWomenDoubles = gender === 'female'
    const genderDoubles = showWomenDoubles ? womenDoubles : menDoubles
    const genderDoublesType = showWomenDoubles ? 'women_doubles' : 'men_doubles'
    // '전체' 종합 카드 = 4분기 합산 (winRate 재계산)
    const totalStats = combinePlayerStats(singles, menDoubles, womenDoubles, mixedDoubles)

    const isLocked = privacy === 'locked'
    const isSelf = privacy === 'self'
    // 본인 비공개(self) 또는 타인의 비공개 프로필(locked) 모두 블러 처리
    const isBlurred = (isSelf && !revealed) || isLocked

    // 매치타입별 카드 — 0경기면 빈 카드로 대체 (전체 카드는 합산이라 항상 일반 렌더)
    const renderCard = (matchType: MatchType, stats: PlayerStats) =>
        stats.totalMatches === 0 ? (
            <StatsQuadCardEmpty matchType={matchType} recordHref={emptyRecordHref} />
        ) : (
            <StatsQuadCard matchType={matchType} stats={stats} masked={isLocked} />
        )

    return (
        <section className="space-y-3">
            <div className="relative">
                <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 ${isBlurred ? 'blur-sm select-none pointer-events-none' : ''}`}>
                    <StatsQuadCard variant="neutral" stats={totalStats} masked={isLocked} />
                    {renderCard('singles', singles)}
                    {renderCard(genderDoublesType, genderDoubles)}
                    {renderCard('mixed_doubles', mixedDoubles)}
                </div>

                {isBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {isLocked ? (
                            <div className="flex items-center gap-1.5 text-caption px-3 py-2 rounded-lg bg-background/80 border border-foreground/20 text-foreground backdrop-blur-sm shadow-sm">
                                <EyeOff className="w-3.5 h-3.5" />
                                승률을 공개하지 않은 유저입니다
                            </div>
                        ) : (
                            <ActionButton size="sm" onClick={handleReveal} className="bg-background/80 shadow-sm backdrop-blur-sm">
                                <Eye className="w-3.5 h-3.5" />
                                클릭해서 보기
                            </ActionButton>
                        )}
                    </div>
                )}
            </div>
        </section>
    )
}
