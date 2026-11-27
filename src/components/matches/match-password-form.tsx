'use client'

import { useState, useTransition } from 'react'
import { fieldClass } from '@/components/common/field-class'

import { ActionButton } from '@/components/common/action-button'
import { FormActions } from '@/components/common/form-actions'
import { joinMatchByPasswordAction } from '@/lib/actions/matches'
import { TYPO } from '@/lib/dashboard/tokens'
import { MATCH_PASSWORD_MAX } from '@/lib/matches/password'
import { cn } from '@/lib/utils'

type Props = {
    matchId: string
    /** 맞았을 때 — 상세 카드는 새로 그리고, 목록 팝업은 그 매칭으로 간다 */
    onJoined: () => void
    /** 팝업 — 입력칸을 한 줄로 두고 아래에 [입장][취소](FormActions). 없으면 상세 카드처럼 입력칸 옆 [입장] */
    onCancel?: () => void
}

/**
 * 비공개 매칭의 비밀번호 입력 — 상세의 비밀번호 카드와 목록의 팝업이 같이 쓴다.
 * 틀리면 그 자리에서 알려 주고, 10분에 10번을 넘기면 잠시 막힌다(DB 시도 제한).
 */
export function MatchPasswordForm({ matchId, onJoined, onCancel }: Props) {
    const [value, setValue] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function enter() {
        startTransition(async () => {
            const result = await joinMatchByPasswordAction(matchId, value)
            if (result.error) return setError(result.error)
            onJoined()
        })
    }

    const input = (
        <input
            type="password" aria-label="입장 비밀번호" placeholder="비밀번호" autoComplete="off" maxLength={MATCH_PASSWORD_MAX}
            value={value} onChange={(e) => setValue(e.target.value)} className={cn(fieldClass(), !onCancel && 'max-w-xs flex-1')}
        />
    )

    return (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); enter() }}>
            {onCancel ? input : (
                <div className="flex flex-wrap items-center gap-2">
                    {input}
                    <ActionButton type="submit" size="lg" variant="solid" disabled={isPending || !value}>
                        {isPending ? '확인하는 중...' : '입장'}
                    </ActionButton>
                </div>
            )}
            {error && <p role="alert" className={cn(TYPO.body2, 'text-destructive break-keep')}>{error}</p>}
            {onCancel && (
                <FormActions submitLabel="입장" pendingLabel="확인하는 중..." onCancel={onCancel} isPending={isPending} disabled={!value} />
            )}
        </form>
    )
}
