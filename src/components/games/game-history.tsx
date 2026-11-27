import { ChevronRight } from 'lucide-react'

import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { TYPO } from '@/lib/dashboard/tokens'
import { describeEdit, editStamp, type GameEdit } from '@/lib/games/history'
import { cn } from '@/lib/utils'

/**
 * 묶음 아래의 **수정 기록** 아코디언(0105) — 평소엔 접힌 한 줄(「수정 기록 2」), 펼치면 오래된 것부터
 * 「11.26 21:05 · 남자02 · 스코어 6:4 → 6:3 · 나 vs 남자02」. 참가자 누구나 고치고 지울 수 있어 누가·언제·무엇을
 * 바꿨는지가 남아야 한다. 네이티브 `<details>`라 스크립트 없이 열리고 모바일에서도 같다. 기록이 없으면 그리지 않는다.
 */
export function GameHistory({ edits, viewerId }: { edits: GameEdit[]; viewerId: string }) {
    if (edits.length === 0) return null
    return (
        <details className="group">
            <summary className={cn(PRESS_HEIGHT.sm, TYPO.caption, 'flex cursor-pointer list-none items-center gap-1 px-4 hover:text-foreground @4xl:px-5 [&::-webkit-details-marker]:hidden')}>
                <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
                수정 기록 <span className="tabular-nums">{edits.length}</span>
            </summary>
            <ul className="space-y-1.5 px-4 pb-3 pl-9 @4xl:pl-10">
                {edits.map((e) => (
                    <li key={e.id} className={cn(TYPO.caption, 'flex flex-wrap gap-x-2 gap-y-0.5 break-keep')}>
                        <span className="tabular-nums">{editStamp(e.createdAt)}</span>
                        <span className="font-medium text-foreground">{e.actorName ?? '탈퇴한 회원'}</span>
                        <span className="text-foreground">{describeEdit(e, viewerId)}</span>
                    </li>
                ))}
            </ul>
        </details>
    )
}
