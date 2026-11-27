'use client'

import { useState } from 'react'
import Link from 'next/link'

import { ActionButton } from '@/components/common/action-button'
import { GuestAddForm } from '@/components/matches/board/guest-add-form'
import { InviteMeCard } from '@/components/matches/invite/invite-me-card'
import { useActionRun } from '@/components/matches/use-action-run'
import { joinMatchAsGuestAction, pickInviteGuestAction } from '@/lib/actions/matches'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import type { PoolPlayer } from '@/lib/games/board'
import type { InviteMe } from '@/lib/matches/invite'
import { cn } from '@/lib/utils'
import type { MatchType } from '@/types'

type Props = {
    token: string
    matchType: MatchType
    hostName: string
    /** 명단에 이미 있는 선수 키 — 같은 이름의 비회원을 미리 막는다 */
    takenKeys: string[]
    /** 명단의 비회원 이름 — 다른 기기에서 「내 이름 고르기」 */
    guestNames: string[]
    /** 새로 참가할 수 없다(확정·모집 마감·정원) — 보기는 계속 된다 */
    blocked: boolean
    confirmed: boolean
    /** 이 기기가 기억하는 비회원 — 있으면 버튼 대신 「OO님으로 참가 중」 */
    me?: InviteMe
}

/**
 * 초대 링크 화면의 입구(0108) — 로그인하지 않은 사람에게 두 갈래를 보여 준다.
 *   · [회원으로 참가] = 로그인·가입한 뒤 이 링크로 돌아와 바로 참가자가 된다(가입해도 초대가 이어진다)
 *   · [비회원으로 참가] = 이름·NTRP·성별·주력손을 적으면 명단에 「비회원」으로 오른다. 계정이 없어 스코어는 적지 못하고 이 화면에서 본다
 * **등록한 사람은 기기가 기억한다**(0109, `InviteMeCard`) — 다시 열면 버튼이 아니라 「OO님으로 참가 중」.
 * 기기를 바꿨으면 「이미 참가했나요?」 아래에서 명단의 내 이름을 누른다(모집이 마감된 뒤에도 — 그때 다른 기기로 여는 일이 많다).
 */
export function InviteJoinPanel({ token, matchType, hostName, takenKeys, guestNames, blocked, confirmed, me }: Props) {
    const run = useActionRun()
    const [open, setOpen] = useState(false)
    const back = `/matches/join/${token}`

    if (me) return <InviteMeCard token={token} me={me} confirmed={confirmed} />

    const join = (guest: PoolPlayer) =>
        run(() => joinMatchAsGuestAction(token, { name: guest.name, ntrp: guest.ntrp ?? 0, gender: guest.gender, hand: guest.hand }))
    const picker = guestNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
            <span className={cn(TYPO.body2, 'break-keep')}>이미 참가했나요? 내 이름을 누르세요</span>
            <span className="flex flex-wrap gap-1.5">
                {guestNames.map((name) => (
                    <ActionButton key={name} size="sm" onClick={() => run(() => pickInviteGuestAction(token, name))}>{name}</ActionButton>
                ))}
            </span>
        </div>
    )

    return (
        <section aria-label="매칭 참가" className={cn(CARD_BASE, 'space-y-3 p-4')}>
            {blocked ? (
                <p className={cn(TYPO.body2, 'break-keep')}>모집이 마감된 매칭입니다. 아래에서 참가자와 대진을 볼 수 있습니다.</p>
            ) : (
                <>
                    <p className={cn(TYPO.body2, 'break-keep')}>{hostName}님이 초대한 매칭입니다. 어떻게 참가할까요?</p>
                    <div className="flex flex-wrap gap-2">
                        <ActionButton size="lg" variant="solid" href={`/login?next=${encodeURIComponent(back)}`}>회원으로 참가</ActionButton>
                        <ActionButton size="lg" aria-expanded={open} onClick={() => setOpen((v) => !v)}>비회원으로 참가</ActionButton>
                    </div>
                    <p className={cn(TYPO.caption, 'break-keep')}>
                        회원은 로그인하거나 가입하면 바로 참가자가 되고, 경기가 내 전적과 통계로 쌓입니다.
                        {' '}<Link href={`/signup?next=${encodeURIComponent(back)}`} className="underline underline-offset-2">가입하기</Link>
                    </p>
                    {open && (
                        <>
                            <GuestAddForm
                                matchType={matchType} submitLabel="참가하기" taken={(key) => takenKeys.includes(key)} onAdd={join}
                                note="이름·NTRP·성별·주력손을 적으면 참가자 명단에 「비회원」으로 오릅니다. 스코어 입력은 회원 참가자가 합니다."
                            />
                            <p className={cn(TYPO.caption, 'break-keep')}>
                                적은 정보는 이 매칭의 참가자에게 보이고 경기 기록에 남습니다. 이 기기는 참가한 사람을 기억합니다.
                                {' '}<Link href="/privacy" className="underline underline-offset-2">개인정보처리방침</Link>
                            </p>
                        </>
                    )}
                </>
            )}
            {picker}
        </section>
    )
}
