import { ChevronRight } from 'lucide-react'

import { TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

/**
 * 묶음의 **메모 줄** — 머리 줄 바로 아래. 매칭 메모와 게임 메모를 묶음이 한 번만 말한다(직접 기록의 메모는 게임마다
 * 저장돼 줄마다 같은 글이 반복됐었다). 평소엔 한 줄(길면 말줄임)이라 누르지 않아도 읽히고, 누르면 전체가 펼쳐진다.
 * 네이티브 `<details>`라 스크립트 없이 열린다(같은 카드의 「수정 기록」과 같은 문법). 메모가 없으면 그리지 않는다.
 */
export function GameSessionMemo({ memos }: { memos: string[] }) {
    if (memos.length === 0) return null
    return (
        <details className="group">
            <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-2.5 @4xl:px-5 [&::-webkit-details-marker]:hidden">
                <span className={cn(TYPO.body2Muted, 'shrink-0')}>메모</span>
                <span className={cn(TYPO.body2, 'min-w-0 flex-1 truncate break-keep group-open:whitespace-pre-line')}>{memos.join('\n')}</span>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
            </summary>
        </details>
    )
}
