import { chipClass, CHIP_NEUTRAL } from '@/components/common/chip-class'
import Link from 'next/link'

import { DeletedBadge } from '@/components/common/deleted-badge'
import { TierIcon } from '@/components/common/tier-icon'
import { UserAvatar } from '@/components/common/user-avatar'
import { TYPO } from '@/lib/design/tokens'
import { derivePublicNtrp } from '@/lib/personal-matches/ntrp'
import { GENDER_SHORT_LABEL } from '@/lib/profile/signup-fields'
import { getTier, TIER_LABELS } from '@/lib/rating/tier'
import type { OpponentCandidate } from '@/lib/queries/users'
import { cn } from '@/lib/utils'
import { formatNtrp } from '@/lib/rating/display'

type Person = OpponentCandidate & { deleted: boolean }

/** 성별 글자 칩 — '남'/'여'. 색으로 나누지 않는다(cat 색은 이미 남복·여복·팀·코트 사이드의 뜻이 있다). 모르면 그리지 않는다 */
export function GenderChip({ gender }: { gender?: 'male' | 'female' }) {
    if (!gender) return null
    return <span className={cn(chipClass({ size: 'micro' }), CHIP_NEUTRAL)}>{GENDER_SHORT_LABEL[gender]}</span>
}

/**
 * 사진 · 이름(통계로 가는 링크) · 성별 · 닉네임 · 탈퇴 배지 — 참가자 표와 참가 신청 목록의 첫 칸.
 * 카드에서는 16px 굵게, 표에서는 다른 칸과 같은 14px.
 */
export function PersonCell({ person }: { person: Person }) {
    const nickname = person.nickname && person.nickname !== person.name ? person.nickname : null
    return (
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <UserAvatar name={person.name} nickname={person.nickname} image={person.profileImage} userId={person.id} />
            <span className={cn(TYPO.bodyStrong, 'flex min-w-0 items-center gap-1.5 @4xl:text-body2 @4xl:font-medium')}>
                {/* 자리가 모자라면 닉네임이 먼저 줄어든다 — 이름은 60%까지 지킨다(카드 머리에 행동 버튼이 서는 자리) */}
                <span className="max-w-[60%] shrink-0 truncate">
                    {person.deleted ? person.name : <Link href={`/profile/${person.id}`} className="hover:underline">{person.name}</Link>}
                </span>
                <GenderChip gender={person.gender} />
                {nickname && <span className="min-w-0 truncate text-body2 font-normal">{nickname}</span>}
            </span>
            {person.deleted && <DeletedBadge />}
        </span>
    )
}

/**
 * NTRP + 티어 — 티어는 개인 레이팅을 0.5 폭으로 묶은 이름이라 NTRP와 같은 숫자다. 그래서 열을 따로 두지 않고 한 칸에 붙인다.
 * 개인 레이팅이 없는 회원(자가선언 값뿐 — 티어가 뜻이 없다)과 통계 비공개 회원(레이팅이 새면 안 된다)은 티어를 그리지 않는다.
 */
export function NtrpTierCell({ person, label = false }: { person: Person; label?: boolean }) {
    const ntrp = derivePublicNtrp(person)
    const showTier = person.personalNtrp != null && !person.statsHidden
    const tier = showTier ? getTier(person.personalNtrp as number) : null
    return (
        <span className={cn(TYPO.body2, 'inline-flex items-center gap-1.5 tabular-nums')}>
            {label && <span className="text-muted-foreground">NTRP</span>}
            {ntrp == null ? '-' : formatNtrp(ntrp)}
            {tier && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <TierIcon tier={tier} size={16} />
                    <span className="text-caption">{TIER_LABELS[tier]}</span>
                </span>
            )}
        </span>
    )
}
