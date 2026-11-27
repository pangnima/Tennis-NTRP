export type User = {
    id: string
    name: string
    nickname: string
    role: 'admin' | 'member'
    profileImage?: string
    gender: 'male' | 'female'
    dominantHand: 'right' | 'left'
    ntrp: number            // 가입 시 자가선언 NTRP (불변 시드, 빈 값 방지용)
    personalNtrp?: number   // 개인경기 기반 동적 NTRP 캐시(진화값). 미보유 시 undefined
    tennisStartDate: string   // 'YYYY-MM-01' (년/월만 입력, 일은 1로 고정)
    racketBrand?: string      // 주력 라켓 브랜드 (프리셋 한글 라벨 또는 기타 직접 입력). 설정에서 수정 가능
    racketModel?: string      // 주력 라켓 모델명 (선택)
    createdAt: string
    isGuest: boolean   // true면 게스트 선수 (public.users에 존재하지만 Auth 계정 없음)
    statsHidden: boolean  // true면 승률·승무패를 타인에게 비공개
    deletedAt?: string | null  // 탈퇴 시각(soft delete). 있으면 화면은 이름·메타·NTRP 대신 '탈퇴한 회원'과 배지만
}

// ── 종목·코트 ────────────────────────────────

export type MatchType = 'singles' | 'men_doubles' | 'women_doubles' | 'mixed_doubles'

export type CourtSurface = 'hard' | 'clay' | 'grass' | 'other'

// ── 관점 경기 — 통계·레이팅이 읽는 모양(`toPersonalMatch`가 게임을 보는 사람 관점으로 바꾼다) ──

export type PersonalMatchWinner = 'me' | 'opponent' | 'draw'

export type PersonalMatchSetScore = {
    me: number
    opp: number
    // 복식 세트별 애드(백) 코트를 맡은 선수 역할 (선택, 단식/미지정은 undefined).
    // 동호인 경기는 세트마다 사이드가 바뀔 수 있어 세트 단위로 보관한다.
    myAd?: 'me' | 'partner'
    oppAd?: 'opponent' | 'opponent2'
}

export type PersonalMatch = {
    id: string
    userId: string
    opponentName: string
    opponentUserId?: string  // 회원 상대면 users.id, 비회원 상대는 undefined
    opponentDeleted?: boolean  // 회원 상대가 탈퇴했다(F-25) — 이름은 스냅샷 그대로, 카드는 배지만 붙인다
    opponentDominantHand?: 'right' | 'left'  // 외부 상대 직접 입력 시 손잡이 (회원/미입력은 undefined)
    // ── 복식 전용: 내 파트너 (단식이면 모두 undefined) ──
    partnerUserId?: string
    partnerName?: string
    partnerDeleted?: boolean
    partnerDominantHand?: 'right' | 'left'
    partnerNtrp?: number    // 복식 파트너 추정 NTRP(선택) — 개인 레이팅 '내 팀' 블렌드에 반영
    // ── 복식 전용: 상대팀 2번째 선수 (단식이면 모두 undefined) ──
    opponent2UserId?: string
    opponent2Name?: string
    opponent2Deleted?: boolean
    opponent2DominantHand?: 'right' | 'left'
    opponent2Ntrp?: number  // 복식 상대2 추정 NTRP — 개인 레이팅 상대팀 평균에 반영
    // 애드/듀스 코트는 세트마다 바뀔 수 있어 setScores 각 세트의 myAd/oppAd로 보관한다.
    playedAt: string        // "2025-04-12"
    playedTime?: string     // "18:30" (선택, 요일×시간 히트맵용). 미입력 시 undefined
    matchType: MatchType
    surface?: CourtSurface
    // 세트 1개 = 게임 1개. 빈 배열 = 결과 미확정(hasResult false) — 통계·레이팅 집계에서 제외(explodePersonalMatchSets).
    // 행 단위 승자는 없다(0045에서 세트 다수결 winner 폐기) — 게임마다 승패는 resolveSetWinner로 판정한다.
    setScores: PersonalMatchSetScore[]
    opponentNtrp?: number   // 상대(단식)/상대1(복식) 추정 NTRP — 개인 레이팅 상대 레이팅. 미입력 시 undefined
    notes?: string
    courtName?: string      // 코트명(선택, ≤40자)
    createdAt: string
}

// ── 알림 (0094 테이블 · 0096 타입, Week 72) ─────────────────────────────────────
// DB `notifications.type` CHECK와 1:1. 문구·링크는 lib/notifications/labels.ts가 단일 출처.
export const NOTIFICATION_TYPES = [
    'match_added', 'match_joined', 'match_left', 'match_confirmed', 'match_deleted', 'match_tomorrow',
    'match_applied', 'match_approved', 'match_declined', 'match_removed',
    'game_recorded', 'game_updated', 'game_deleted',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/**
 * 알림 payload — 매칭 스냅샷 + `actorName` + 타입별 키. 전부 **스냅샷**이라 매칭·사람이 지워져도 문구가 선다.
 * 키 이름은 `matchTitle`의 입력과 맞춰 두어 변환 없이 읽는다.
 */
export type NotificationPayload = {
    playedAt?: string
    playedTime?: string
    durationMinutes?: number
    matchType?: MatchType
    courtName?: string
    hostName?: string
    actorName?: string
    /** match_confirmed — 호스트가 아니라 종료 7일 뒤 자동으로 확정됐다 */
    auto?: boolean
    /** match_declined — 신청이 취소된 이유(0101): 모집 마감 · 비공개 전환. 없으면 호스트의 거절 */
    reason?: 'closed' | 'private'
    /** match_joined — 회원이 아니라 **비회원**이 명단에 올랐다(0108). 참가자가 넣었으면 actorName이 그 사람 */
    guestName?: string
    /** match_joined + guestName — 비회원이 초대 링크로 스스로 등록했다 */
    viaLink?: boolean
}

export type Notification = {
    id: string
    type: NotificationType
    matchId: string | null
    gameId: string | null
    actorUserId: string | null
    payload: NotificationPayload
    createdAt: string
    readAt: string | null
}

// ── 게임·매칭 (0096 재구축 — 게임 1건 = 1행, 관점은 읽을 때 만든다) ──────────

/** 세트 하나 = 통계의 게임 하나. t1Ad/t2Ad = 그 팀에서 애드(백) 코트에 선 사람의 slot — 복식만, 미지정은 undefined. */
export type GameSet = { t1: number; t2: number; t1Ad?: 1 | 2; t2Ad?: 1 | 2 }

export type GamePlayer = {
    team: 1 | 2
    slot: 1 | 2            // 단식은 언제나 1
    userId?: string        // 없으면 비회원(이름이 정체성)
    name: string           // 회원이면 기록 시점 이름 스냅샷
    hand?: 'right' | 'left'
    ntrp?: number          // 기록 시점 스냅샷
    gender?: 'male' | 'female'  // 비회원만(0107) — 회원의 성별은 프로필이 정본
    deleted?: boolean      // 탈퇴한 회원 — 이름은 스냅샷 그대로, 화면은 배지만
}

export type Game = {
    id: string
    matchId?: string       // 없으면 매칭 없이 직접 기록
    createdBy: string
    matchType: MatchType
    playedAt: string       // "2026-11-25"
    playedTime?: string    // "18:00"
    /** 직접 기록의 길이(분, 0105) — 매칭 게임은 매칭의 값을 읽는다 */
    durationMinutes?: number
    surface?: CourtSurface
    courtName?: string
    /** 직접 기록의 코트 번호(0105) */
    courtNo?: string
    notes?: string
    /** 스코어 — **한 줄에 하나**(0105). 비어 있으면 매칭의 예정 게임 */
    sets: GameSet[]
    players: GamePlayer[]
    updatedBy?: string     // 마지막으로 고친 사람(생성만 했으면 없음)
    updatedByName?: string
    updatedAt?: string
    locked: boolean        // 매칭 최종 확정 또는 게임 잠금 — 수정·삭제 불가
    createdAt: string
}

export type TennisMatch = {
    id: string
    hostId: string
    /** 방 제목(0101) — 새 매칭은 필수, 그 전 매칭은 없다(`displayMatchTitle`이 종목으로 대신 부른다) */
    title?: string
    matchType: MatchType
    playedAt: string
    playedTime?: string
    durationMinutes: number
    surface?: CourtSurface
    courtName?: string
    /** 코트 번호(0102, 선택) — 「3」「3, 4」「A」. 표시는 `formatCourt` */
    courtNo?: string
    /** 코트 비용 총액(원, 0104) — 선택. 화면이 정원으로 나눠 1인당 금액을 보여 준다 */
    courtFee?: number
    /** 정원(0104, 호스트 포함) — 차면 신청·입장을 막는다 */
    capacity: number
    notes?: string
    isListed: boolean
    confirmedAt?: string   // 호스트 최종 확정 시각 — 있으면 게임이 잠긴다
    /** 모집 마감 시각(0101) — 매칭 상태가 아니라 모집 여부다. 있으면 신청·입장을 받지 않는다 */
    closedAt?: string
    createdAt: string
}
