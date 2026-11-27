import type { ReactNode } from 'react'

import { FIELD_LABEL, fieldMessageClass, type FieldTone } from '@/components/common/field-class'
import { cn } from '@/lib/utils'

type Props = {
    /** 칸의 id — 라벨이 가리킨다. 칸이 여럿이거나 라벨이 가리킬 칸이 없으면(토글 묶음) 생략 */
    id?: string
    label: ReactNode
    /** 라벨 끝 ` *` */
    required?: boolean
    /** 라벨 끝 ` (선택)` */
    optional?: boolean
    /** 라벨 오른쪽 슬롯(「아이디 찾기 · 비밀번호 찾기」 같은 것) */
    aside?: ReactNode
    /** 칸 아래 한 줄 — 도움말·검사 결과·오류. 없으면 자리도 없다 */
    message?: ReactNode
    tone?: FieldTone
    className?: string
    children: ReactNode
}

/**
 * 라벨 + 칸 + 아래 한 줄 — 모든 폼이 이 3단을 쓴다(`docs/design-system.md §5`). 칸 자체는 호출부가 `fieldClass()`로 그린다
 * (input·select·자동완성·textarea 등 종류가 많아 여기서 감싸지 않는다).
 */
export function Field({ id, label, required, optional, aside, message, tone = 'muted', className, children }: Props) {
    const text = <>{label}{required && ' *'}{optional && ' (선택)'}</>
    const labelEl = id ? <label htmlFor={id} className={FIELD_LABEL}>{text}</label> : <p className={FIELD_LABEL}>{text}</p>
    return (
        <div className={className}>
            {aside ? <div className="flex items-baseline justify-between gap-3">{labelEl}{aside}</div> : labelEl}
            {children}
            {message && <p className={cn(fieldMessageClass(tone))}>{message}</p>}
        </div>
    )
}
