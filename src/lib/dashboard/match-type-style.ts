import type { MatchType } from '@/types'

type MatchTypeStyle = {
    label: string
    textClass: string
    borderClass: string
    bgClass: string
}

// 종목은 '결과'가 아닌 분류 — L3 도메인 토큰(--match-*)을 쓴다. 결과색(win·loss)·주의색(spot)·정보색(info)과
// 떨어진 색이라는 것을 colors.test.ts가 강제한다 (docs/design-system.md §1).
const STYLES: Record<MatchType, MatchTypeStyle> = {
    singles: {
        label: '단식',
        textClass: 'text-match-singles',
        borderClass: 'border-match-singles/40',
        bgClass: 'bg-match-singles/10',
    },
    men_doubles: {
        label: '남복',
        textClass: 'text-match-mens',
        borderClass: 'border-match-mens/40',
        bgClass: 'bg-match-mens/10',
    },
    women_doubles: {
        label: '여복',
        textClass: 'text-match-womens',
        borderClass: 'border-match-womens/40',
        bgClass: 'bg-match-womens/10',
    },
    mixed_doubles: {
        label: '혼복',
        textClass: 'text-match-mixed',
        borderClass: 'border-match-mixed/40',
        bgClass: 'bg-match-mixed/10',
    },
}

export function getMatchTypeStyle(type: MatchType): MatchTypeStyle {
    return STYLES[type]
}

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
    singles: STYLES.singles.label,
    men_doubles: STYLES.men_doubles.label,
    women_doubles: STYLES.women_doubles.label,
    mixed_doubles: STYLES.mixed_doubles.label,
}

// 종목 Select 입력용 옵션 (표시 순서 고정)
export const MATCH_TYPE_OPTIONS: { value: MatchType; label: string }[] = [
    { value: 'singles', label: STYLES.singles.label },
    { value: 'men_doubles', label: STYLES.men_doubles.label },
    { value: 'women_doubles', label: STYLES.women_doubles.label },
    { value: 'mixed_doubles', label: STYLES.mixed_doubles.label },
]

export function getMatchTypeBadgeClass(type: MatchType): string {
    const s = STYLES[type]
    return `${s.borderClass} ${s.textClass} ${s.bgClass}`
}
