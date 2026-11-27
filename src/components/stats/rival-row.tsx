import { chipClass } from '@/components/common/chip-class'
import type { RivalEntry } from '@/lib/analytics/rival'
import type { User } from '@/types'
import { getTier, TIER_LABELS, TIER_STYLE } from '@/lib/rating/tier'
import { effectiveNtrp } from '@/lib/rating/display'
import { TEXT_MUTED } from '@/lib/design/tokens'
import { relativeDayLabel } from '@/lib/analytics/date-utils'
import { ProfileLink } from '@/components/common/profile-link'
import { RecentFormBadges } from '@/components/common/recent-form-badges'

type Props = {
    rival: RivalEntry
    userMap: Map<string, User>
    today: string
}

const OUTCOME_KO: Record<'W' | 'L' | 'D', string> = { W: '승', L: '패', D: '무' }

export function RivalRow({ rival, userMap, today }: Props) {
    const user = rival.opponentUserId ? userMap.get(rival.opponentUserId) : undefined
    const name = user?.nickname ?? user?.name ?? rival.opponentName ?? '?'
    const initial = name.slice(0, 1)
    const tier = user ? getTier(effectiveNtrp(user)) : null

    return (
        <div className="space-y-2 py-1">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-muted text-foreground text-caption font-semibold flex items-center justify-center shrink-0">
                        {initial}
                    </span>
                    {user ? (
                        <ProfileLink userId={rival.opponentUserId!} className="text-body2 font-medium text-foreground hover:underline truncate">
                            {name}
                        </ProfileLink>
                    ) : (
                        <span className="text-body2 font-medium text-foreground truncate">{name}</span>
                    )}
                    {tier && <span className={chipClass({ className: TIER_STYLE[tier] })}>{TIER_LABELS[tier]}</span>}
                </div>
                <span className="text-body2 text-foreground shrink-0 tabular-nums">
                    {rival.wins} · {rival.losses}
                    <span className="ml-1.5 font-semibold">{rival.winRate}%</span>
                </span>
            </div>

            {/* 승률 분할 바 */}
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                <div className="bg-win-solid" style={{ width: `${rival.winRate}%` }} />
                <div className="bg-loss-solid flex-1" />
            </div>

            <div className="flex items-center justify-between gap-2">
                {/* 최근 5경기 */}
                <RecentFormBadges outcomes={rival.last5} size="sm" />
                {/* 최근 맞대결 */}
                {rival.lastOutcome && rival.lastDate && (
                    <span className={`text-caption ${TEXT_MUTED} shrink-0`}>
                        최근 <span className="text-foreground">{OUTCOME_KO[rival.lastOutcome]} {rival.lastScore}</span>
                        <span className="mx-1">·</span><span className="text-foreground">{relativeDayLabel(rival.lastDate, today)}</span>
                    </span>
                )}
            </div>
        </div>
    )
}
