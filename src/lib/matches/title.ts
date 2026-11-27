/**
 * 방 제목(0101) — 목록에서 모집 내용을 읽게 하는 한 줄(「남복하실 남자 2명 모집중」·「NTRP 3 이상 여자 모집중」).
 * 새 매칭은 필수, 1~40자(DB `normalize_match_title`의 거울 — 앞뒤 공백은 뺀다).
 * 0101 이전 매칭은 제목이 없어 화면이 종목으로 대신 부른다(`displayMatchTitle`).
 */
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import type { TennisMatch } from '@/types'

export const MATCH_TITLE_MAX = 40
export const MATCH_TITLE_PLACEHOLDER = '예: 남복하실 남자 2명 모집중'

/** 틀리면 이유, 맞으면 null */
export function validateMatchTitle(value: string): string | null {
    const v = value.trim()
    if (v.length === 0) return '방 제목을 적어 주세요. 어떤 사람을 모으는지 쓰면 신청이 빨라집니다.'
    if (v.length > MATCH_TITLE_MAX) return `방 제목은 ${MATCH_TITLE_MAX}자까지 적을 수 있습니다.`
    return null
}

/** 목록·상세에서 부르는 이름 — 제목이 없는 예전 매칭은 「남복 매칭」 */
export function displayMatchTitle(m: Pick<TennisMatch, 'title' | 'matchType'>): string {
    return m.title?.trim() || `${MATCH_TYPE_LABELS[m.matchType]} 매칭`
}
