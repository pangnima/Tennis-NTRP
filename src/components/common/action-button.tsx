import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'

import { actionButtonClass, type ActionStyle } from '@/components/common/action-button-class'

type Common = ActionStyle & { children: ReactNode }
type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>
type AsButton = Common & { href?: undefined } & Omit<ComponentProps<'button'>, 'className' | 'children'>

/**
 * **프로젝트의 버튼은 이것 하나다** — 크기 다섯 단계 × 모양 다섯 가지(`action-button-class.ts`의 표).
 * `href`가 있으면 링크, 없으면 버튼이고 모양과 크기는 같다. `square`는 아이콘 전용(폭 = 높이, `aria-label` 필수).
 * shadcn의 기본 버튼을 쓰지 않는 이유: base가 `text-sm`이라 시맨틱 타이포 토큰을 우회한다(가드 테스트가 막는다).
 */
export function ActionButton(props: AsLink | AsButton) {
    const { size, variant, square, className, children, ...rest } = props
    const cls = actionButtonClass({ size, variant, square, className })
    if (typeof rest.href === 'string') {
        return <Link {...(rest as Omit<AsLink, keyof Common>)} className={cls}>{children}</Link>
    }
    const { type = 'button', ...buttonProps } = rest as Omit<AsButton, keyof Common>
    return <button type={type} {...buttonProps} className={cls}>{children}</button>
}
