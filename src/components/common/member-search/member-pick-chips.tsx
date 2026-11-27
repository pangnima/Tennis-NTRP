'use client'

import { X } from 'lucide-react'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { PILL_BASE } from '@/lib/dashboard/tokens'

/** 검색 결과에서 고른 회원 — 매칭 만들기의 InviteeRow와 같은 모양 */
export type MemberPick = { userId: string; name: string; meta?: string }

type Props = {
    picks: MemberPick[]
    onRemove: (userId: string) => void
    /** 칩의 aria-label 꼬리 — '초대 취소' */
    removeLabel?: string
}

/** 고른 회원 칩 목록 — 누르면 뺀다. 결과 목록이 다음 검색으로 바뀌어도 여기 남아 있는 것이 선택이다 */
export function MemberPickChips({ picks, onRemove, removeLabel = '선택 해제' }: Props) {
    if (picks.length === 0) return null
    return (
        <ul className="flex flex-wrap gap-1.5">
            {picks.map((row) => (
                <li key={row.userId}>
                    <button
                        type="button"
                        onClick={() => onRemove(row.userId)}
                        aria-label={`${row.name} ${removeLabel}`}
                        className={`${PILL_BASE} ${PRESS_HEIGHT.sm} gap-1 rounded-full px-3 border-selected/40 text-selected hover:bg-selected/10 transition-colors`}
                    >
                        {row.name}
                        <X className="size-3" />
                    </button>
                </li>
            ))}
        </ul>
    )
}
