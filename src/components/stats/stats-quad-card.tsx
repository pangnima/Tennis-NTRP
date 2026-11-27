import { chipClass } from '@/components/common/chip-class'
import type { MatchType } from '@/types'
import type { PlayerStats } from '@/lib/stats'
import { getMatchTypeStyle } from '@/lib/design/match-type-style'
import { CARD_BASE } from '@/lib/design/tokens'

type Props = {
    matchType?: MatchType
    stats: PlayerStats
    // 'neutral'은 경기 종류가 아닌 '전체' 종합 카드용 중립 스타일
    variant?: 'match' | 'neutral'
    masked?: boolean
}

export function StatsQuadCard({ matchType, stats, variant = 'match', masked }: Props) {
    // 중립('전체') 카드는 MatchType 색상 테이블 대신 회색 토큰을 사용
    const style =
        variant === 'neutral' || !matchType
            ? { label: '전체', textClass: 'text-foreground', borderClass: 'border-border', bgClass: 'bg-muted/40' }
            : getMatchTypeStyle(matchType)

    const winRateLabel =
        masked
            ? '*'
            : stats.wins + stats.losses === 0
                ? '-'
                : `${stats.winRate}%`

    // 승률 옆 '승률' 라벨 노출 조건 (마스킹이거나 실제 수치가 있을 때)
    const showRateSuffix = masked || winRateLabel !== '-'

    return (
        <div className={`${CARD_BASE} p-4 flex flex-col h-full`}>
            {/* 헤더: 카테고리 pill(좌) — 승률(우, 강조) */}
            <div className="flex items-center justify-between gap-2">
                <span className={`${chipClass()} ${style.textClass} ${style.borderClass} ${style.bgClass}`}>
                    {style.label}
                </span>
                <span className="text-h2 font-bold tabular-nums text-foreground leading-none">
                    {showRateSuffix && <span className="text-caption font-normal text-muted-foreground mr-1.5">승률</span>}
                    {winRateLabel}
                </span>
            </div>

            {/* 승·패·무 — 들어간 내부 블록 3칸 */}
            <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-background/50 py-2.5 text-center">
                    <p className={`text-h2 font-bold tabular-nums ${masked ? 'text-muted-foreground' : 'text-win'}`}>{masked ? '*' : stats.wins}</p>
                    <p className="text-caption text-muted-foreground mt-0.5">승</p>
                </div>
                <div className="rounded-lg bg-background/50 py-2.5 text-center">
                    <p className={`text-h2 font-bold tabular-nums ${masked ? 'text-muted-foreground' : 'text-loss'}`}>{masked ? '*' : stats.losses}</p>
                    <p className="text-caption text-muted-foreground mt-0.5">패</p>
                </div>
                <div className="rounded-lg bg-background/50 py-2.5 text-center">
                    <p className={`text-h2 font-bold tabular-nums ${masked ? 'text-muted-foreground' : 'text-foreground'}`}>{masked ? '*' : stats.draws}</p>
                    <p className="text-caption text-muted-foreground mt-0.5">무</p>
                </div>
            </div>

            {/* 푸터(총경기). mt-auto로 카드 하단 고정 */}
            <div className="pt-2 mt-auto">
                <p className="text-caption text-foreground text-right">
                    {masked ? '* 경기' : `총 ${stats.totalMatches}경기`}
                </p>
            </div>
        </div>
    )
}
