'use client'

import { notify } from '@/lib/feedback/notify'
import { useState, useTransition } from 'react'
import { fieldClass, fieldMessageClass } from '@/components/common/field-class'

import { ActionButton } from '@/components/common/action-button'
import { FormActions } from '@/components/common/form-actions'
import { MatchInviteButton } from '@/components/matches/match-invite-button'
import { MatchRecruitmentButton } from '@/components/matches/match-recruitment-button'
import { AppDialog } from '@/components/common/app-dialog'
import { setMatchPasswordAction } from '@/lib/actions/matches'
import { MATCH_PASSWORD_MAX } from '@/lib/matches/password'

type Props = {
    matchId: string
    viewerId: string
    memberIds: string[]
    /** 초대 링크 토큰 — 호스트에게만 온다 */
    inviteToken: string | null
    isListed: boolean
    /** 모집 마감 중(0101) */
    closed: boolean
    /** 대기 중 참가 신청 수 — [모집 마감] 확인 문구 */
    applicantCount: number
}

/**
 * 「참가자」 제목 옆 — **호스트만** 누가 들어오느냐를 다룬다(0099: 참가자가 링크로 승인을 우회하지 않게).
 * [모집 마감]/[마감 해제] · [회원 초대]·[초대 링크 복사](신청 없이 바로 참가) · 비공개 매칭은 [비밀번호 변경](해시라 다시 볼 수는 없다).
 * 마감 중에는 [초대 링크 복사]를 숨긴다 — 링크 입장도 막혀 있어 건네면 헛걸음이다(직접 초대는 된다).
 */
export function MatchHostTools({ matchId, viewerId, memberIds, inviteToken, isListed, closed, applicantCount }: Props) {
    async function copyLink() {
        if (!inviteToken) return
        await navigator.clipboard.writeText(`${window.location.origin}/matches/join/${inviteToken}`)
        notify.success('초대 링크를 복사했습니다')
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <MatchRecruitmentButton matchId={matchId} closed={closed} applicantCount={applicantCount} />
            <MatchInviteButton matchId={matchId} viewerId={viewerId} memberIds={memberIds} size="sm" />
            {inviteToken && !closed && <ActionButton size="sm" onClick={copyLink}>초대 링크 복사</ActionButton>}
            {!isListed && <PasswordChangeButton matchId={matchId} />}
        </div>
    )
}

function PasswordChangeButton({ matchId }: { matchId: string }) {
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function save() {
        startTransition(async () => {
            const result = await setMatchPasswordAction(matchId, value)
            if (result.error) return setError(result.error)
            setOpen(false)
            setValue('')
            notify.success('비밀번호를 바꿨습니다')
        })
    }

    return (
        <>
            <ActionButton size="sm" onClick={() => { setError(null); setOpen(true) }}>
                비밀번호 변경
            </ActionButton>
            <AppDialog
                open={open} onOpenChange={setOpen} title="비밀번호 변경"
                description="이미 참가한 회원은 그대로입니다. 새 비밀번호는 다시 볼 수 없으니 바로 알려 주세요."
                footer={<FormActions submitLabel="바꾸기" onSubmit={save} onCancel={() => setOpen(false)} isPending={isPending} disabled={!value} />}
            >
                    <input
                        aria-label="새 비밀번호" placeholder="4~20자, 공백 없이" maxLength={MATCH_PASSWORD_MAX}
                        value={value} onChange={(e) => setValue(e.target.value)} className={fieldClass()}
                    />
                    {error && <p role="alert" className={fieldMessageClass('destructive')}>{error}</p>}
            </AppDialog>
        </>
    )
}
