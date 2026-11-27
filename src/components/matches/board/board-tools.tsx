'use client'

import { ChevronDown, ChevronUp, Plus, Shuffle } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/**
 * 「게임 N」 제목 옆 — [자동 대진표](패널 열고 닫기) · [게임 추가].
 * [자동 대진표]는 **열림 상태를 보인다**: 열리면 눌린 모양(패널의 선택된 참가자 칩과 같은 민트 테두리·바탕) + ▲, 닫히면 ▼.
 * 처음부터 펼쳐 두었다가 누르면 사라지는 것이 헷갈린다는 피드백(11-26) — 패널은 처음엔 닫혀 있다.
 */
export function BoardTools({ panel, onTogglePanel, onAddRow }: { panel: boolean; onTogglePanel: () => void; onAddRow: () => void }) {
    const Chevron = panel ? ChevronUp : ChevronDown
    return (
        <div className="flex items-center gap-2">
            <ActionButton size="sm" aria-expanded={panel} onClick={onTogglePanel} className={cn(panel && 'border-selected/50 bg-selected/10')}>
                <Shuffle className="size-3.5" aria-hidden />자동 대진표<Chevron className="size-3.5" aria-hidden />
            </ActionButton>
            <ActionButton size="sm" onClick={onAddRow}>
                <Plus className="size-3.5" aria-hidden />게임 추가
            </ActionButton>
        </div>
    )
}

/** 게임이 하나도 없을 때 — 설명만(버튼은 제목 옆에 한 벌만 둔다) */
export function BoardEmptyState() {
    return (
        <div className="rounded-lg border border-dashed border-border p-6 break-keep">
            <p className={TYPO.h4}>아직 게임이 없습니다</p>
            <ol className={cn(TYPO.body2Muted, 'mt-2 list-decimal space-y-1 pl-5')}>
                <li><span className="text-foreground">[자동 대진표]</span> — 참가자·코트 수·1인당 게임 수로 대진을 한 번에 짭니다.</li>
                <li><span className="text-foreground">[게임 추가]</span> — 한 게임씩 직접 선수를 고릅니다.</li>
                <li>스코어는 경기가 끝난 뒤에 넣어도 됩니다. 게임마다 [저장]하거나 아래 [모두 저장]으로 한 번에.</li>
            </ol>
        </div>
    )
}
