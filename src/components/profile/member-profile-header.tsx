import { GENDER_SHORT_LABEL, HAND_LABEL } from '@/lib/profile/signup-fields'
import { UserAvatar } from '@/components/common/user-avatar'
import { chipClass, CHIP_NEUTRAL } from '@/components/common/chip-class'
import { DeletedBadge } from '@/components/common/deleted-badge'
import { TierIcon } from '@/components/common/tier-icon'
import { ProfileTierProgress } from '@/components/profile/profile-tier-progress'
import { ProfileSummaryRow, type ProfileSummary } from '@/components/profile/profile-summary-row'
import { ProfileEmptyGuide } from '@/components/profile/profile-empty-guide'
import { WinRateRing } from '@/components/stats/win-rate-ring'
import { RecentFormStrip } from '@/components/stats/recent-form-strip'
import { getTier, TIER_LABELS, TIER_TEXT } from '@/lib/rating/tier'
import { effectiveNtrp, formatNtrp } from '@/lib/rating/display'
import { CARD_BASE } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'
import type { RecentFormResult } from '@/lib/analytics/form'
import type { User } from '@/types'

type Props = {
    user: User
    /** 전적 요약 — 승률 링 + 보조 행. 통계를 볼 수 있을 때만(비공개·탈퇴면 없음) */
    summary?: ProfileSummary
    /** 최근 경기 폼 — W/L/D 박스 스트립 */
    recentForm?: RecentFormResult
    /** 개인 레이팅 — 게임이 있을 때만. 있으면 티어 방패가 승률 링 자리를 맡는다 */
    personalRating?: { rating: number; provisional: boolean }
}

const handLabel: Record<User['dominantHand'], string> = { right: `${HAND_LABEL.right}잡이`, left: `${HAND_LABEL.left}잡이` }

export function MemberProfileHeader({ user, summary, recentForm, personalRating }: Props) {
    const tier = personalRating ? getTier(personalRating.rating) : null
    // 0경기면 '0 경기' 대신 빈 상태 안내 + CTA
    const isEmptyGuide = !!summary && summary.wins + summary.losses + summary.draws === 0
    // NTRP 배지: 레이팅이 있으면 그 값(소수 3자리), 없으면 캐시(있으면)→가입 시드
    const ntrpDisplay = personalRating ? formatNtrp(personalRating.rating, 3) : formatNtrp(effectiveNtrp(user))

    return (
        <div className={cn(CARD_BASE, 'p-5 sm:p-6')}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                {/* 왼쪽 히어로 — 레이팅이 있으면 티어 방패(+승패), 없으면 승률 링. 모바일=상단 중앙 */}
                {tier ? (
                    <div className="flex flex-col items-center gap-1 shrink-0 self-center sm:self-auto">
                        <TierIcon tier={tier} className="h-[100px] sm:h-[124px]" />
                        <span className={cn('text-body2 font-bold', TIER_TEXT[tier])}>{TIER_LABELS[tier]}</span>
                        {summary && (
                            <span className="text-caption tabular-nums">
                                <span className="text-win font-semibold">{summary.wins}승</span>{' '}
                                <span className="text-loss font-semibold">{summary.losses}패</span>
                                {summary.draws > 0 && <span> {summary.draws}무</span>}
                            </span>
                        )}
                    </div>
                ) : (
                    summary && <WinRateRing wins={summary.wins} losses={summary.losses} draws={summary.draws} />
                )}

                {/* 정보 영역 */}
                <div className="w-full flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar size="lg" name={user.name} nickname={user.nickname} image={user.profileImage} userId={user.id} />
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-h1 font-bold">{user.name}</h1>
                                    <span className="text-body2 text-foreground">({user.nickname})</span>
                                    {user.deletedAt && <DeletedBadge />}
                                </div>
                                {/* 탈퇴자는 성별·주력손이 익명화되어 null이다 — 기본값('남 · 오른손')을 거짓으로 그리지 않는다(F-pre-8) */}
                                {!user.deletedAt && (
                                    <p className="text-body2 text-foreground">
                                        {GENDER_SHORT_LABEL[user.gender]} · {handLabel[user.dominantHand]}
                                    </p>
                                )}
                            </div>
                        </div>
                        {!user.deletedAt && (
                            <span className={chipClass({ className: `${CHIP_NEUTRAL} tabular-nums` })}>
                                NTRP {ntrpDisplay}
                            </span>
                        )}
                    </div>

                    {personalRating && (
                        <div className="space-y-1">
                            <p className="text-caption font-medium text-muted-foreground">개인 경기 레이팅</p>
                            <ProfileTierProgress rating={personalRating.rating} provisional={personalRating.provisional} />
                        </div>
                    )}

                    {isEmptyGuide ? (
                        <ProfileEmptyGuide />
                    ) : (
                        <>
                            {summary && <ProfileSummaryRow {...summary} />}
                            {recentForm && (
                                <RecentFormStrip last10={recentForm.last10} currentStreak={recentForm.currentStreak} />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
