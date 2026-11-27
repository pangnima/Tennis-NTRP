import { CARD_GRID, CARD_HEAD_ACTION, CARD_WIDE, ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { UserAvatar } from '@/components/common/user-avatar'
import { MatchLeaveButton, MatchRemoveButton } from '@/components/matches/match-actions'
import { MatchGuestRemoveButton } from '@/components/matches/match-guest-actions'
import { GenderChip, NtrpTierCell, PersonCell } from '@/components/matches/person-cells'
import { ROLE_LABEL, rolePillClass } from '@/lib/design/member-badges'
import { TYPO } from '@/lib/design/tokens'
import { formatDominantHand } from '@/lib/profile/signup-fields'
import type { MatchGuest, MatchMember } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'
import { formatNtrp } from '@/lib/rating/display'

/** 표 모드의 열 — 참가자(이름·성별) │ 구분 │ NTRP·티어 │ 주력손 │ 행동. 열 제목 줄과 같은 상수를 읽는다 */
export const MEMBER_COLS = '@4xl:grid-cols-[minmax(0,1fr)_4.5rem_8.5rem_5rem_5.5rem]'
export const MEMBER_HEAD = { cols: MEMBER_COLS, labels: ['참가자', '구분', 'NTRP · 티어', '주력손', ''] } as const

const CARD_ONLY = '@max-4xl:rounded-lg @max-4xl:border @max-4xl:border-border @max-4xl:bg-card @max-4xl:p-4'
const ROW = cn(CARD_ONLY, CARD_GRID, ROW_GRID, ROW_PAD, ROW_BOX, MEMBER_COLS)
const META = cn('flex flex-wrap items-center gap-x-3 gap-y-1 @4xl:contents', CARD_WIDE)

/** 줄 끝의 행동 — 내 줄은 [나가기](호스트 제외), 호스트가 보는 남의 줄은 [내보내기] */
export type MemberRowAction = 'leave' | 'remove' | null

type Props = {
    member: MatchMember
    /** 보는 사람 본인의 줄 — 배경색으로만 구별한다(「(나)」는 본인에게만 보이는 글자라 덧붙이지 않는다) */
    isMe: boolean
    action: MemberRowAction
    matchId: string
}

/**
 * 매칭 참가자 한 명 — `DataList` 안에서 그린다. 함께 칠 사람을 고를 때 보는 값(성별·실력·주력손).
 *   · 표 모드: 한 줄(참가자 │ 구분 │ NTRP·티어 │ 주력손 │ 행동)
 *   · 카드 모드: 1줄 = 사진·이름·성별·닉네임 + 오른쪽 [나가기]/[내보내기] · 2줄 = 구분 · NTRP·티어 · 주력손
 *     (행동이 따로 한 줄을 차지하면 카드가 괜히 커진다 — `CARD_HEAD_ACTION`)
 */
export function MatchMemberRow({ member, isMe, action, matchId }: Props) {
    const role = member.role === 'host' ? 'host' : 'guest'
    return (
        <div className={cn(ROW, isMe && 'bg-self/10')}>
            <PersonCell person={member} />
            <div className={META}>
                <span className="justify-self-start"><span className={rolePillClass(role)}>{ROLE_LABEL[role]}</span></span>
                <NtrpTierCell person={member} />
                <span className={cn(TYPO.body2, 'tabular-nums')}>{formatDominantHand(member.dominantHand) ?? '-'}</span>
            </div>
            {action && (
                <div className={cn('@4xl:justify-self-end', CARD_HEAD_ACTION)}>
                    {action === 'leave'
                        ? <MatchLeaveButton matchId={matchId} />
                        : <MatchRemoveButton matchId={matchId} userId={member.id} name={member.name} />}
                </div>
            )}
        </div>
    )
}

/**
 * 명단의 **비회원** 한 명(0108) — 회원 줄과 같은 열. 계정이 없어 사진·통계 링크·티어가 없고,
 * 닉네임 자리에 **어떻게 들어왔는지**(「여자01 추가」/「초대 링크」)가 선다. [빼기]는 호스트와 넣은 사람만.
 */
export function MatchGuestRow({ guest, canRemove }: { guest: MatchGuest; canRemove: boolean }) {
    return (
        <div className={ROW}>
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <UserAvatar name={guest.name} />
                <span className={cn(TYPO.bodyStrong, 'flex min-w-0 items-center gap-1.5 @4xl:text-body2 @4xl:font-medium')}>
                    <span className="max-w-[60%] shrink-0 truncate">{guest.name}</span>
                    <GenderChip gender={guest.gender} />
                    <span className="min-w-0 truncate text-body2 font-normal">{guest.addedBy ? `${guest.addedByName ?? '참가자'} 추가` : '초대 링크'}</span>
                </span>
            </span>
            <div className={META}>
                <span className="justify-self-start"><span className={rolePillClass('nonmember')}>{ROLE_LABEL.nonmember}</span></span>
                <span className={cn(TYPO.body2, 'tabular-nums')}>{formatNtrp(guest.ntrp)}</span>
                <span className={cn(TYPO.body2, 'tabular-nums')}>{formatDominantHand(guest.hand) ?? '-'}</span>
            </div>
            {canRemove && (
                <div className={cn('@4xl:justify-self-end', CARD_HEAD_ACTION)}>
                    <MatchGuestRemoveButton guestId={guest.id} name={guest.name} />
                </div>
            )}
        </div>
    )
}
