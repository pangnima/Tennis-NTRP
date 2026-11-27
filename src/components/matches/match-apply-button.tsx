'use client'

import { chipClass, CHIP_ATTENTION, CHIP_NEUTRAL } from '@/components/common/chip-class'
import { useState, useTransition } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { useActionRun } from '@/components/matches/use-action-run'
import { applyMatchAction, cancelApplicationAction } from '@/lib/actions/matches'
import { TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/**
 * 공개 매칭의 입구 — [참가 신청]을 누르면 호스트에게 알림이 가고, 호스트가 승인하면 참가자가 된다(0099).
 * 신청해 둔 동안은 「신청 중」과 [신청 취소]. 호스트가 모집을 마감하거나 경기가 시작되면 신청은 사라지고 「모집 마감」이 된다.
 */
export function MatchApplyButton({ matchId, hasApplied, closed }: { matchId: string; hasApplied: boolean; closed: boolean }) {
    const run = useActionRun()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const act = (fn: () => Promise<{ error: string | null }>) => startTransition(async () => setError(await run(fn)))

    // 호스트가 모집을 마감했거나 경기가 시작됐다(DB match_start_at과 같은 시각) — 어느 쪽이든 「모집 마감」 한 말
    if (closed) return <span className={cn(chipClass(), CHIP_NEUTRAL)}>모집 마감</span>

    return (
        <div className="flex flex-col items-end gap-1">
            {hasApplied ? (
                <div className="flex items-center gap-2">
                    <span className={cn(chipClass(), CHIP_ATTENTION)}>신청 중 · 호스트 승인 대기</span>
                    <ActionButton size="md" disabled={isPending} onClick={() => act(() => cancelApplicationAction(matchId))}>신청 취소</ActionButton>
                </div>
            ) : (
                <ActionButton size="md" variant="solid" disabled={isPending} onClick={() => act(() => applyMatchAction(matchId))}>
                    {isPending ? '신청하는 중...' : '참가 신청'}
                </ActionButton>
            )}
            {error && <p role="alert" className={cn(TYPO.body2, 'text-destructive')}>{error}</p>}
        </div>
    )
}
