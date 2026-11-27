import type { MatchType, TennisMatch } from '@/types'

/**
 * 매칭의 **코트 비용 · 정원**(0104). 비용은 코트 **총액**을 적고 화면이 정원으로 나눠 「1인당 약 N원」을 같이 보여 준다
 * (호스트가 나눗셈을 하지 않고, 인원을 바꾸면 따라 바뀐다). 정원은 호스트 포함 — 차면 신청·입장을 막는다(DB `match_is_full`).
 * 안내만 한다: 정산·송금·입금 확인은 다루지 않는다.
 */
export const CAPACITY_MIN = 2
export const CAPACITY_MAX = 50
export const COURT_FEE_MAX = 10_000_000

/** 정원의 기본값 — 단식 2명, 복식 4명(DB `create_match`의 거울) */
export function defaultCapacity(matchType: MatchType): number {
    return matchType === 'singles' ? 2 : 4
}

/** 「40,000원」 */
export function formatWon(amount: number): string {
    return `${amount.toLocaleString('ko-KR')}원`
}

/** 1인당 금액 — 총액 ÷ 정원을 **100원 단위로 올림**(그래서 「약」). 정원이 없으면 null */
export function perPersonFee(fee: number, capacity: number): number | null {
    if (!Number.isFinite(fee) || !Number.isFinite(capacity) || capacity < 1) return null
    return Math.ceil(fee / capacity / 100) * 100
}

/** 폼의 글자 → 숫자(쉼표·공백·「원」 무시). 비었으면 undefined, 숫자가 아니면 NaN */
export function parseAmount(text: string): number | undefined {
    const digits = text.replace(/[\s,원명]/g, '')
    if (!digits) return undefined
    return /^\d+$/.test(digits) ? Number(digits) : Number.NaN
}

/** 입력 중 표시 — 숫자만 남기고 천 단위 쉼표(「40000」 → 「40,000」) */
export function formatAmountInput(text: string): string {
    const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

/**
 * 매칭 상세 머리의 한 줄 — 「코트비 40,000원 · 1인당 약 10,000원 · 정원 4명 (2명 참가)」.
 * 비용을 안 적었으면 「코트비 미정」, 참가 인원을 셀 수 없으면(비공개 매칭 참가 전) 괄호를 뺀다.
 */
export function formatFeeLine(match: Pick<TennisMatch, 'courtFee' | 'capacity'>, memberCount?: number | null): string {
    const per = match.courtFee == null ? null : perPersonFee(match.courtFee, match.capacity)
    const fee = match.courtFee == null
        ? '코트비 미정'
        : match.courtFee === 0 ? '코트비 무료' : `코트비 ${formatWon(match.courtFee)}${per ? ` · 1인당 약 ${formatWon(per)}` : ''}`
    return `${fee} · 정원 ${match.capacity}명${memberCount == null ? '' : ` (${memberCount}명 참가)`}`
}

/** 목록의 「1인당」 칸 — 「5,000원」. 비용을 안 적었으면 「미정」, 0원이면 「무료」 */
export function formatPerPerson(match: Pick<TennisMatch, 'courtFee' | 'capacity'>): string {
    if (match.courtFee == null) return '미정'
    const per = perPersonFee(match.courtFee, match.capacity)
    return per ? formatWon(per) : '무료'
}

/** 목록의 「참가」 칸 — 「2/4명」. 인원을 셀 수 없으면 「-/4명」 */
export function formatHeadcount(memberCount: number | null | undefined, capacity: number): string {
    return `${memberCount ?? '-'}/${capacity}명`
}

/** 정원이 찼나 — DB `match_is_full`의 거울. 인원을 모르면 false(입장할 때 DB가 판정한다) */
export function isMatchFull(capacity: number, memberCount: number | null | undefined): boolean {
    return memberCount != null && memberCount >= capacity
}
