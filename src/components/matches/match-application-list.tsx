'use client'

import { useState, useTransition } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { CARD_GRID, CARD_HEAD_ACTION, CARD_WIDE, DataList, ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { NtrpTierCell, PersonCell } from '@/components/matches/person-cells'
import { useActionRun } from '@/components/matches/use-action-run'
import { decideApplicationAction } from '@/lib/actions/matches'
import { TYPO } from '@/lib/dashboard/tokens'
import { formatDominantHand } from '@/lib/profile/signup-fields'
import type { MatchApplicant } from '@/lib/queries/matches'
import { cn } from '@/lib/utils'

/** 표 모드의 열 — 신청자 │ NTRP·티어 │ 주력손 │ [승인][거절] */
const APPLY_COLS = '@4xl:grid-cols-[minmax(0,1fr)_8.5rem_5rem_9rem]'
const APPLY_HEAD = { cols: APPLY_COLS, labels: ['신청자', 'NTRP · 티어', '주력손', ''] } as const
const CARD_ONLY = '@max-4xl:rounded-lg @max-4xl:border @max-4xl:border-border @max-4xl:bg-card @max-4xl:p-4'

/**
 * 호스트만 보는 「참가 신청」 — 성별·실력·주력손을 보고 [승인](참가자가 된다)·[거절]. 둘 다 알림이 간다.
 * 카드 모드에서는 두 버튼이 1줄 오른쪽(사람 옆)에 선다 — 참가자 카드와 같은 규칙(`CARD_HEAD_ACTION`).
 * 정원이 차면(0104) [승인]이 막히고 이유 한 줄이 선다(DB `match_full`) — [거절]은 그대로.
 * 신청이 없으면 섹션을 그리지 않는다. 경기가 시작되면 남은 신청은 저절로 사라진다.
 */
export function MatchApplicationList({ matchId, applicants, full = false }: { matchId: string; applicants: MatchApplicant[]; full?: boolean }) {
    const run = useActionRun()
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [, startTransition] = useTransition()
    if (applicants.length === 0) return null

    function decide(userId: string, approve: boolean) {
        setBusy(userId)
        startTransition(async () => {
            setError(await run(() => decideApplicationAction(matchId, userId, approve)))
            setBusy(null)
        })
    }

    return (
        <section className="space-y-3">
            <h2 className={TYPO.h3}>참가 신청 {applicants.length}명</h2>
            {full && <p className={cn(TYPO.body2Muted, 'break-keep')}>정원이 찼습니다 — 정원을 늘리거나([수정]) 자리가 나면 승인할 수 있어요. 거절은 지금도 됩니다.</p>}
            <DataList head={APPLY_HEAD}>
                {applicants.map((a) => (
                    <div key={a.id} className={cn(CARD_ONLY, CARD_GRID, ROW_GRID, ROW_PAD, ROW_BOX, APPLY_COLS)}>
                        <PersonCell person={a} />
                        <div className={cn('flex flex-wrap items-center gap-x-3 @4xl:contents', CARD_WIDE)}>
                            <NtrpTierCell person={a} />
                            <span className={cn(TYPO.body2)}>{formatDominantHand(a.dominantHand) ?? '-'}</span>
                        </div>
                        <div className={cn('flex gap-1.5 @4xl:justify-self-end', CARD_HEAD_ACTION)}>
                            <ActionButton size="sm" variant="solid" disabled={busy === a.id || full} onClick={() => decide(a.id, true)}>승인</ActionButton>
                            <ActionButton size="sm" variant="danger" disabled={busy === a.id} onClick={() => decide(a.id, false)}>거절</ActionButton>
                        </div>
                    </div>
                ))}
            </DataList>
            {error && <p role="alert" className={cn(TYPO.body2, 'text-destructive')}>{error}</p>}
        </section>
    )
}
