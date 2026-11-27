'use client'

import Link from 'next/link'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import { useActionRun } from '@/components/matches/use-action-run'
import { leaveMatchAsGuestAction, pickInviteGuestAction } from '@/lib/actions/matches'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import type { InviteMe } from '@/lib/matches/invite'
import { cn } from '@/lib/utils'

type Props = {
    token: string
    me: InviteMe
    /** 확정된 매칭 — 명단을 바꿀 수 없어 [참가 취소]를 그리지 않는다 */
    confirmed: boolean
}

/**
 * 초대 화면이 **알아본 비회원**(0109) — 참가 버튼 자리에 선다.
 *   · 등록한 기기(`owner`): 「OO님으로 참가 중입니다」 + [참가 취소]
 *   · 이름을 고른 기기: 「OO님으로 보고 있습니다」 + [내가 아니에요] — 취소는 못 한다(이름은 누구나 고를 수 있어 보는 것만 달라진다)
 */
export function InviteMeCard({ token, me, confirmed }: Props) {
    const run = useActionRun()
    const signup = `/signup?next=${encodeURIComponent(`/matches/join/${token}`)}`

    return (
        <section aria-label="내 참가" className={cn(CARD_BASE, 'space-y-2 p-4')}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p role="status" className={cn(TYPO.body2, 'break-keep')}>
                    <span className="font-semibold">{me.name}</span>님으로 {me.owner ? '참가 중입니다' : '보고 있습니다'}. 아래에서 내 게임이 표시됩니다.
                </p>
                {me.owner ? !confirmed && (
                    <ConfirmButton
                        size="sm" variant="danger" tone="destructive" title="참가를 취소할까요?" confirmLabel="참가 취소"
                        description="참가자 명단에서 빠집니다. 이미 짜인 대진에는 이름이 남을 수 있습니다."
                        onConfirm={() => run(() => leaveMatchAsGuestAction(token))}
                    >
                        참가 취소
                    </ConfirmButton>
                ) : (
                    <ActionButton size="sm" variant="ghost" onClick={() => run(() => pickInviteGuestAction(token, null))}>내가 아니에요</ActionButton>
                )}
            </div>
            <p className={cn(TYPO.caption, 'break-keep')}>
                {!me.owner && '참가 취소는 처음 등록한 기기에서 하거나 호스트에게 요청해 주세요. '}
                회원으로 가입하면 앞으로의 경기가 내 전적과 통계로 쌓입니다.
                {' '}<Link href={signup} className="underline underline-offset-2">가입하기</Link>
            </p>
        </section>
    )
}
