'use client'

import { fieldClass } from '@/components/common/field-class'
import type { PoolPlayer } from '@/lib/games/board'
import { GENDER_SHORT_LABEL } from '@/lib/profile/signup-fields'
import { cn } from '@/lib/utils'

type Props = {
    value: string | null
    pool: PoolPlayer[]
    label: string
    onChange: (key: string | null) => void
    disabled?: boolean
    /** 좁은 칸(카드 모드의 좌우 배치) — 이름만 보인다. 성별 꼬리(「· 남」)를 붙이면 90px 칸에서 이름이 잘린다 */
    compact?: boolean
}

/**
 * 선수 자리 하나 — 네이티브 select라 모바일에서는 기기의 선택 창이 뜬다. 같은 게임의 다른 자리에 있던 사람을 고르면
 * 두 자리가 맞바꿔진다(`setSlot`). 이름 옆에 성별(남/여)을 붙여 혼복 배치를 손으로 고칠 때 보이게 한다. 글자는 16px — 폼 요소는 어디서나 16px다(globals.css, iOS 확대 방지).
 */
const labelOf = (p: PoolPlayer) => (p.gender ? `${p.name} · ${GENDER_SHORT_LABEL[p.gender]}` : p.name)

export function BoardSlotSelect({ value, pool, label, onChange, disabled, compact = false }: Props) {
    const text = (p: PoolPlayer) => (compact ? p.name : labelOf(p))
    const members = pool.filter((p) => p.isMember)
    const guests = pool.filter((p) => !p.isMember)
    return (
        <select
            aria-label={label}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value || null)}
            className={fieldClass({ size: 'md', className: cn('truncate', compact ? 'px-1.5' : 'px-2', !value && 'border-dashed text-muted-foreground') })}
        >
            <option value="">선수 선택</option>
            <optgroup label="참가자">
                {members.map((p) => <option key={p.key} value={p.key}>{text(p)}</option>)}
            </optgroup>
            {guests.length > 0 && (
                <optgroup label="비회원">
                    {guests.map((p) => <option key={p.key} value={p.key}>{text(p)}</option>)}
                </optgroup>
            )}
        </select>
    )
}
