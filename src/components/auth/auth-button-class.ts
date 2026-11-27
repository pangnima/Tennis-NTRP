import { actionButtonClass } from '@/components/common/action-button-class'

/**
 * 인증 화면(로그인·아이디 찾기·비밀번호 찾기)의 전폭 큰 버튼 — 링크에 버튼 모양을 입힐 때 쓴다.
 * 버튼 단계 **lg(44px)** 이고 `accent` = 옐로우 채움(주 행동), `outline` = 보조 행동.
 */
export function authButtonClass(variant: 'accent' | 'outline'): string {
    return actionButtonClass({ variant: variant === 'accent' ? 'solid' : 'outline', size: 'lg', className: 'w-full' })
}
