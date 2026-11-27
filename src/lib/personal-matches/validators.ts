import type { PersonalMatchSetScore } from '@/types'

// 스코어 유효성 — 양쪽 점수가 0~99 정수이고 0-0(미입력)이 아니어야 한다.
export function isSetValid(s: PersonalMatchSetScore): boolean {
    if (Number.isNaN(s.me) || Number.isNaN(s.opp)) return false
    if (s.me === 0 && s.opp === 0) return false
    return true
}
