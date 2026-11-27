import type { InputHTMLAttributes, ReactNode } from 'react'

import { Field } from '@/components/common/field'
import { fieldClass } from '@/components/common/field-class'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
    id: string
    label: ReactNode
    /** 입력 아래 한 줄 — 도움말·검사 결과·서버 오류. 없으면 자리도 없다 */
    message?: ReactNode
    /** message의 색 — 오류면 destructive, 나머지(도움말·확인 중·사용 가능)는 muted */
    messageTone?: 'muted' | 'destructive'
    /** 라벨 오른쪽 슬롯(로그인의 「아이디 찾기 · 비밀번호 찾기」 같은 것) */
    labelAside?: ReactNode
    /** input 클래스 덧붙임(비밀번호 표시 토글의 `pr-10` 등). 바깥 래퍼는 wrapperClassName */
    inputClassName?: string
    wrapperClassName?: string
}

/**
 * 한 줄 글자 칸 — `Field`(라벨·칸·아래 한 줄) + `fieldClass()`(44px 칸). 입력 속성은 그대로 통과시키고
 * (controlled/uncontrolled 모두), 검사·중복 확인 같은 로직은 각 필드 컴포넌트가 쥔다 — 여기는 모양만.
 */
export function TextField({
    id, label, message, messageTone = 'muted', labelAside, inputClassName, wrapperClassName, ...input
}: Props) {
    return (
        <Field id={id} label={label} aside={labelAside} message={message} tone={messageTone} className={wrapperClassName}>
            <input id={id} className={fieldClass({ className: inputClassName })} {...input} />
        </Field>
    )
}
