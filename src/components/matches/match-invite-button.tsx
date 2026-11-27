'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { ActionButton } from '@/components/common/action-button'
import type { ActionSize } from '@/components/common/action-button-class'
import { FormActions } from '@/components/common/form-actions'
import { MemberMultiPicker } from '@/components/common/member-search/member-multi-picker'
import type { MemberPick } from '@/components/common/member-search/member-pick-chips'
import { AppDialog } from '@/components/common/app-dialog'
import { fieldMessageClass } from '@/components/common/field-class'
import { addMatchMembersAction } from '@/lib/actions/matches'

type Props = { matchId: string; viewerId: string; memberIds: string[]; size?: ActionSize }

/** [회원 초대] — 검색해 여러 명을 고르면 바로 참가자가 된다(수락 단계 없음, 싫으면 본인이 나간다). */
export function MatchInviteButton({ matchId, viewerId, memberIds, size = 'md' }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [picks, setPicks] = useState<MemberPick[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function submit() {
        startTransition(async () => {
            const result = await addMatchMembersAction(matchId, picks.map((p) => p.userId))
            if (result.error) return setError(result.error)
            setPicks([])
            setOpen(false)
            router.refresh()
        })
    }

    return (
        <>
            <ActionButton size={size} onClick={() => { setError(null); setOpen(true) }}>회원 초대</ActionButton>
            <AppDialog
                open={open} onOpenChange={setOpen} title="회원 초대" width="md"
                footer={
                    <FormActions
                        submitLabel={picks.length > 0 ? `${picks.length}명 초대하기` : '초대하기'}
                        onSubmit={submit} onCancel={() => setOpen(false)} isPending={isPending}
                        pendingLabel="초대하는 중..." disabled={picks.length === 0}
                    />
                }
            >
                    <MemberMultiPicker selfUserId={viewerId} picks={picks} onChange={setPicks} max={50} disabledIds={memberIds} picksLabel="초대할 회원" />
                    {error && <p role="alert" className={fieldMessageClass('destructive')}>{error}</p>}
            </AppDialog>
        </>
    )
}
