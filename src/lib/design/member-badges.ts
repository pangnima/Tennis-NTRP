import { chipClass, CHIP_NEUTRAL } from '@/components/common/chip-class'

/**
 * 회원 상태 칩·NTRP 배지의 클래스 — 룸 명단(RoomMemberRow)과 [회원 초대] 검색 결과 행(MemberResultRow)이 공유한다.
 * 같은 사람이 두 화면에서 다른 색으로 보이면 상태를 두 번 배워야 한다.
 *
 * 키가 곧 라벨 문자열이다 — member-labels의 상수를 계산 키로 써서 라벨과 색이 갈릴 자리를 없앤다.
 * 맵에 없는 라벨(내보내짐·나감·비회원)은 중립 폴백(테두리 + 기본색 글자 — 상태도 읽어야 하는 값이다).
 */
export const MEMBER_STATUS_CLASS: Record<string, string> = {
    호스트: 'border-primary/40 text-primary',
    참가: 'border-win/40 text-win',
}

export const MEMBER_STATUS_FALLBACK_CLASS = 'border-border text-foreground'

export function memberStatusChipClass(label: string): string {
    return `${chipClass()} ${MEMBER_STATUS_CLASS[label] ?? MEMBER_STATUS_FALLBACK_CLASS}`
}

/**
 * 「구분」 필 — 경기 결과 목록과 매칭 상세의 참가자 표가 같이 쓴다.
 *   호스트 = 매칭을 만든 사람 · 게스트 = 남이 만든 매칭에 참가한 사람 · 직접 기록 = 매칭 없이 기록한 경기
 * 셋 다 글자는 선명하게 두고 **형태**로 가른다(색 테두리 / 중립 테두리 / 회색 채움) — 흐린 글자로 위계를 만들지 않는다.
 */
export type RoleKind = 'host' | 'guest' | 'direct' | 'nonmember'
/** 비회원(0108) = 계정 없이 명단에 오른 사람 — 「게스트」(남의 매칭에 참가한 **회원**)와 다른 말이다 */
export const ROLE_LABEL: Record<RoleKind, string> = { host: '호스트', guest: '게스트', direct: '직접 기록', nonmember: '비회원' }
const ROLE_TONE: Record<RoleKind, string> = {
    host: 'border-primary/40 text-primary',
    guest: 'border-border text-foreground',
    direct: 'border-transparent bg-muted text-foreground',
    nonmember: 'border-transparent bg-muted text-foreground',
}
export function rolePillClass(role: RoleKind): string {
    return chipClass({ className: ROLE_TONE[role] })
}

// NTRP는 이름 옆에 붙는다 — 실력이 곧 그 사람을 고르는 기준이라 이름과 한 덩어리로 읽혀야 한다.
// shrink-0이라 어떤 폭에서도 잘리지 않고, 잘리는 것은 언제나 이름 뒤의 메타(닉네임·라켓)다.
export const NTRP_BADGE = chipClass({ size: 'micro', className: `${CHIP_NEUTRAL} tabular-nums` })

