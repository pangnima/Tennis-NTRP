'use client'

import { useTransition } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import { useActionRun } from '@/components/matches/use-action-run'
import { setMatchClosedAction } from '@/lib/actions/matches'

/**
 * 호스트의 [모집 마감] / [마감 해제](0101) — 「참가자」 제목 옆(누가 들어오느냐를 다루는 자리).
 * 마감: 대기 중 신청을 한 번에 취소하고(신청자에게 알림) 새 신청·비밀번호·초대 링크 입장을 막는다 — 확인을 한 번 묻는다.
 * 해제: 되돌릴 것이 없어 묻지 않는다. 모집 마감은 매칭 상태가 아니다(진행 중/확정됨은 그대로).
 */
export function MatchRecruitmentButton({ matchId, closed, applicantCount }: { matchId: string; closed: boolean; applicantCount: number }) {
    const run = useActionRun()
    const [isPending, startTransition] = useTransition()

    if (closed) {
        return (
            <ActionButton size="sm" disabled={isPending} onClick={() => startTransition(async () => { await run(() => setMatchClosedAction(matchId, false)) })}>
                {isPending ? '해제하는 중...' : '마감 해제'}
            </ActionButton>
        )
    }
    const pending = applicantCount > 0 ? `대기 중인 참가 신청 ${applicantCount}명은 자동으로 취소되고 알림이 갑니다. ` : ''
    return (
        <ConfirmButton
            size="sm" title="모집을 마감할까요?" confirmLabel="모집 마감"
            description={`${pending}새 참가 신청·비밀번호 입장·초대 링크 입장을 막습니다(직접 초대는 됩니다). 언제든 마감을 해제할 수 있습니다.`}
            onConfirm={() => run(() => setMatchClosedAction(matchId, true))}
        >
            모집 마감
        </ConfirmButton>
    )
}
