'use client'

import { useState } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import { Field } from '@/components/common/field'
import { fieldClass } from '@/components/common/field-class'
import { mergeCourtNamesAction } from '@/lib/actions/admin-courts'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { COURT_NAME_MAX } from '@/lib/matches/court'
import type { CourtNameUse } from '@/lib/matches/court-clusters'
import { cn } from '@/lib/utils'

type Props = {
    /** 칸 id가 겹치지 않게 — 한 화면에 상자가 여럿이다 */
    id: string
    names: CourtNameUse[]
    /** 걸린 공식 코트의 이름 — 있으면 그 코트에 합친다(공식 명칭을 바꿔 적으면 그 코트의 이름도 바뀐다) */
    courtName?: string
    defaultOfficial: string
    /** 묶음 제안은 전부 켜 두고(틀린 것만 끈다), 「모든 이름」은 전부 끈 채 고른다 */
    defaultChecked: boolean
}

/**
 * 코트명 합치기 상자(0103) — 이름 칩을 켜고 끄고 → 공식 명칭을 적고 → [합치기]. 합치면 고른 이름으로 적힌 매칭·경기의
 * 코트명이 공식 명칭으로 바뀌고(되돌릴 수 없어 한 번 묻는다), 그 뒤로는 그 이름으로 적어도 공식 명칭으로 저장된다.
 */
export function CourtMergeBox({ id, names, courtName, defaultOfficial, defaultChecked }: Props) {
    const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(defaultChecked ? names.map((n) => n.name) : []))
    const [official, setOfficial] = useState(defaultOfficial)
    const chosen = names.filter((n) => picked.has(n.name)).map((n) => n.name)

    function toggle(name: string) {
        setPicked((prev) => {
            const next = new Set(prev)
            if (!next.delete(name)) next.add(name)
            return next
        })
    }

    return (
        <div className={cn(CARD_BASE, 'space-y-4 p-4 sm:p-5')}>
            {courtName && <p className={TYPO.body2Strong}>공식 코트 ‘{courtName}’에 합치기</p>}
            <div className="flex flex-wrap gap-1.5">
                {names.map((n) => {
                    const on = picked.has(n.name)
                    return (
                        <ActionButton key={n.name} size="sm" aria-pressed={on} onClick={() => toggle(n.name)} variant={on ? 'outline' : 'ghost'}
                            className={on ? 'border-selected/50 text-foreground' : undefined}>
                            {n.name}<span className="font-normal tabular-nums">{n.uses}</span>
                        </ActionButton>
                    )
                })}
            </div>
            <div className="flex items-end gap-2">
                <Field id={id} label="공식 명칭" className="min-w-0 flex-1">
                    <input
                        id={id} value={official} maxLength={COURT_NAME_MAX} placeholder="예: 올림픽공원 테니스장"
                        onChange={(e) => setOfficial(e.target.value)} className={fieldClass()} autoComplete="off"
                    />
                </Field>
                <ConfirmButton
                    size="lg" variant="solid" disabled={chosen.length === 0 || !official.trim()}
                    title={`‘${official.trim()}’ 하나로 합칠까요?`}
                    description={`고른 이름 ${chosen.length}개(${chosen.join(' · ')})로 적힌 매칭·경기의 코트명이 모두 공식 명칭으로 바뀌고, 되돌릴 수 없습니다. 앞으로는 이 이름들로 적어도 공식 명칭으로 저장됩니다.`}
                    confirmLabel="합치기"
                    onConfirm={async () => (await mergeCourtNamesAction(official, courtName ? [...chosen, courtName] : chosen)).error}
                >
                    합치기
                </ConfirmButton>
            </div>
        </div>
    )
}
