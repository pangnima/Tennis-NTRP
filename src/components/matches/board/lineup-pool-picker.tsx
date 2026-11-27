'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { GuestAddForm } from '@/components/matches/board/guest-add-form'
import type { PoolPlayer } from '@/lib/games/board'
import { GENDER_SHORT_LABEL } from '@/lib/profile/signup-fields'
import type { MatchType } from '@/types'

type Props = {
    pool: PoolPlayer[]
    excluded: ReadonlySet<string>
    onToggle: (key: string) => void
    matchType: MatchType
    onAddGuest: (guest: PoolPlayer) => Promise<string | null>
}

/**
 * 자동 대진표의 참가자 줄 — 온 사람만 켜 둔다(칩을 누르면 빠지고 다시 누르면 들어온다).
 * 줄 끝 **[+ 비회원]**을 눌러야 비회원 입력 줄이 열린다 — 늘 펼쳐 두면 무슨 칸인지 헷갈린다는 피드백(11-26).
 * 추가하면 **매칭 명단에 올라가고**(0108 — 참가자 표의 [+ 비회원 추가]와 같은 문) 입력 줄이 닫히며 그 사람이 칩으로 선다.
 */
export function LineupPoolPicker({ pool, excluded, onToggle, matchType, onAddGuest }: Props) {
    const [adding, setAdding] = useState(false)
    return (
        <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {pool.map((p) => {
                    const on = !excluded.has(p.key)
                    return (
                        <ActionButton key={p.key} size="sm" aria-pressed={on} onClick={() => onToggle(p.key)} variant={on ? 'outline' : 'ghost'}
                            className={on ? 'border-primary/50 text-foreground' : 'line-through'}>
                            {p.name}{p.ntrp != null && <span className="tabular-nums">{p.ntrp.toFixed(1)}</span>}
                            {!p.isMember && <span className="text-muted-foreground">비회원{p.gender ? ` · ${GENDER_SHORT_LABEL[p.gender]}` : ''}</span>}
                        </ActionButton>
                    )
                })}
                {!adding && (
                    <ActionButton size="sm" variant="ghost" onClick={() => setAdding(true)}>
                        <Plus className="size-3.5" aria-hidden />비회원
                    </ActionButton>
                )}
            </div>
            {adding && (
                <GuestAddForm
                    matchType={matchType}
                    taken={(key) => pool.some((p) => p.key === key)}
                    onAdd={async (guest) => {
                        const failed = await onAddGuest(guest)
                        if (!failed) setAdding(false)
                        return failed
                    }}
                    onCancel={() => setAdding(false)}
                />
            )}
        </div>
    )
}
