'use client'

import { Check } from 'lucide-react'
import { UserAvatar } from '@/components/common/user-avatar'
import type { OpponentCandidate } from '@/lib/queries/users'
import { derivePublicNtrp } from '@/lib/personal-matches/ntrp'
import { formatDominantHand } from '@/lib/profile/signup-fields'
import { NTRP_BADGE, memberStatusChipClass } from '@/lib/dashboard/member-badges'
import { actionButtonClass } from '@/components/common/action-button-class'
import { formatNtrp } from '@/lib/rating/display'

type Props = {
    candidate: OpponentCandidate
    selected: boolean
    /** false면 눌러도 아무 일이 없다 — 왜 못 고르는지는 label이 말한다 */
    selectable?: boolean
    /** 우측 상태 칩(참가·초대 대기·내보내짐·추가됨…). 없으면 선택 표시만 */
    label?: string
    /**
     * 고르는 줄이 아니라 **넣는 줄**일 때의 버튼 글자(「추가」) — 체크 동그라미 대신 버튼 모양으로 보인다.
     * 경기 기록의 참가자 등록이 쓴다: 누르면 위 참가자 목록에 올라가고 이 줄은 「추가됨」(label)으로 바뀐다.
     * 줄 전체가 이미 버튼이라 안에 버튼을 넣지 않고 모양만 입힌다.
     */
    actionLabel?: string
    onToggle: () => void
}

/**
 * 회원 검색 결과 1행 — 매칭 참가자 행(MatchMemberRow)과 같은 골격: 아바타 · 이름 · NTRP 배지 / 닉네임 · 주력손.
 * 행 전체가 토글 버튼이다(aria-pressed). 못 고르는 사람도 **감추지 않고** 비활성 + 라벨로 보인다 —
 * 찾은 사람이 목록에 없으면 "검색이 안 된다"로 읽힌다.
 */
export function MemberResultRow({ candidate, selected, selectable = true, label, actionLabel, onToggle }: Props) {
    const ntrp = derivePublicNtrp(candidate)
    const meta = [candidate.nickname, formatDominantHand(candidate.dominantHand)].filter(Boolean).join(' · ')

    return (
        <li>
            <button
                type="button"
                aria-pressed={selected}
                disabled={!selectable}
                onClick={onToggle}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${selected ? 'bg-selected/5' : 'hover:bg-muted/50'}
                    disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent`}
            >
                <UserAvatar name={candidate.name} image={candidate.profileImage} userId={candidate.id} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-body2 font-medium text-foreground truncate">{candidate.name}</span>
                        {ntrp != null && <span className={NTRP_BADGE}>NTRP {formatNtrp(ntrp)}</span>}
                    </div>
                    {meta && <p className="text-caption text-foreground truncate">{meta}</p>}
                </div>
                {label && <span className={memberStatusChipClass(label)}>{label}</span>}
                {/* 고를 수 있는 행에만 체크 자리 — 라벨이 있어도(재초대 가능한 내보내짐·나감) 선택 표시는 필요하다 */}
                {selectable && actionLabel && <span className={actionButtonClass({ size: 'sm' })}>{actionLabel}</span>}
                {selectable && !actionLabel && (
                    <span
                        aria-hidden
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors
                            ${selected ? 'border-selected bg-selected text-primary-foreground' : 'border-border text-transparent'}`}
                    >
                        <Check className="size-3.5" />
                    </span>
                )}
            </button>
        </li>
    )
}
