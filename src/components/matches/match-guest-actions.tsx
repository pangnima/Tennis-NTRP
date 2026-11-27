'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import { GuestAddForm } from '@/components/matches/board/guest-add-form'
import { useActionRun } from '@/components/matches/use-action-run'
import { addMatchGuestAction, removeMatchGuestAction } from '@/lib/actions/matches'
import { guestKey, type PoolPlayer } from '@/lib/games/board'
import type { MatchType } from '@/types'

/**
 * 참가자 표 바로 아래의 **[+ 비회원 추가]**(0108) — 참가자 누구나 회원이 아닌 사람을 명단에 올린다(정원에 포함).
 * 「참가자」 제목 옆은 호스트의 버튼이 이미 넷이라, 다루는 것(명단) 아래에 둔다 — 호스트와 참가자에게 같은 자리다.
 * 누르면 그 자리에 이름·NTRP·성별·주력손 줄이 열린다(보드의 [+ 비회원]과 같은 줄, 같은 문).
 */
export function MatchGuestAddButton({ matchId, matchType, guestNames }: { matchId: string; matchType: MatchType; guestNames: string[] }) {
    const [open, setOpen] = useState(false)
    const run = useActionRun()
    const taken = new Set(guestNames.map(guestKey))

    async function add(guest: PoolPlayer): Promise<string | null> {
        const failed = await run(() => addMatchGuestAction(matchId, { name: guest.name, ntrp: guest.ntrp ?? 0, gender: guest.gender, hand: guest.hand }))
        if (!failed) setOpen(false)
        return failed
    }

    if (!open) {
        return (
            <ActionButton size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-3.5" aria-hidden />비회원 추가
            </ActionButton>
        )
    }
    return <GuestAddForm matchType={matchType} taken={(key) => taken.has(key)} onAdd={add} onCancel={() => setOpen(false)} />
}

/** 비회원 줄의 [빼기] — 호스트와 그 비회원을 넣은 사람. 이미 기록된 게임은 남는다(회원 [내보내기]와 같다) */
export function MatchGuestRemoveButton({ guestId, name }: { guestId: string; name: string }) {
    const run = useActionRun()
    return (
        <ConfirmButton
            size="sm" variant="danger" tone="destructive" title={`${name}님을 참가자에서 뺄까요?`} confirmLabel="빼기"
            description="명단과 정원에서 빠집니다. 이미 기록된 게임은 그대로 남습니다."
            onConfirm={() => run(() => removeMatchGuestAction(guestId))}
        >
            빼기
        </ConfirmButton>
    )
}
