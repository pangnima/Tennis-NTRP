/**
 * 직접 기록(매칭 없이 친 경기)의 입력 모양과 검증 — 폼과 서버 액션이 같은 함수를 본다(DB `record_game` 가드의 거울).
 *
 * **한 게임 = 스코어 하나 = 한 줄**(0105). 한 번 저장하는 기록은 공통 정보(종목·일시·장소) + **게임 배열**이고,
 * 게임마다 대진이 다를 수 있다(참가자 여러 명이 번갈아 친 기록 — 3명이 돌아가며 단식, 파트너를 바꿔 가며 복식).
 * 기록하는 사람이 뛴 게임이 하나 이상이면 같은 참가자끼리의 다른 게임도 함께 적는다.
 * 매칭 안의 게임은 게임 보드(`lib/games/board.ts`)가 따로 받는다.
 */
import type { CourtSurface, GameSet, MatchType } from '@/types'

export type GamePlayerInput = {
    team: 1 | 2
    slot: 1 | 2
    userId?: string        // 회원이면 이것만 — 이름·손·NTRP는 DB가 채운다
    name?: string          // 비회원 이름
    hand?: 'right' | 'left'
    ntrp?: number
    /** 비회원의 성별(0107) */
    gender?: 'male' | 'female'
}

/** 게임 하나 — 대진 + 스코어 하나 */
export type RecordGameInput = { players: GamePlayerInput[]; sets: GameSet[] }

export type RecordInput = {
    matchType: MatchType
    playedAt?: string
    playedTime?: string
    /** 길이(분) — 경기 결과의 묶음 머리가 「20:00~22:00」을 쓴다 */
    durationMinutes?: number
    surface?: CourtSurface
    courtName?: string
    courtNo?: string
    notes?: string
    games: RecordGameInput[]
}

export const MAX_RECORD_GAMES = 12
export const GUEST_NAME_MAX = 20

export function isDoubles(matchType: MatchType): boolean {
    return matchType !== 'singles'
}

/** 종목이 요구하는 자리 — 단식 2(slot 1), 복식 4 */
export function seatsOf(matchType: MatchType): Array<{ team: 1 | 2; slot: 1 | 2 }> {
    return isDoubles(matchType)
        ? [{ team: 1, slot: 1 }, { team: 1, slot: 2 }, { team: 2, slot: 1 }, { team: 2, slot: 2 }]
        : [{ team: 1, slot: 1 }, { team: 2, slot: 1 }]
}

/** 스코어는 **정확히 하나**(DB `normalize_game_sets`) */
export function validateSets(sets: GameSet[]): string | null {
    if (sets.length < 1) return '스코어를 입력해주세요.'
    if (sets.length > 1) return '한 게임에는 스코어를 하나만 적습니다.'
    const s = sets[0]
    const ok = (n: number) => Number.isInteger(n) && n >= 0 && n <= 99
    if (!ok(s.t1) || !ok(s.t2)) return '스코어는 0~99 사이의 숫자로 입력해주세요.'
    if (s.t1 === 0 && s.t2 === 0) return '0:0은 저장할 수 없습니다.'
    return null
}

function validatePlayers(players: GamePlayerInput[], matchType: MatchType): string | null {
    const seats = seatsOf(matchType)
    if (players.length !== seats.length) return '선수 자리를 모두 채워 주세요.'
    for (const seat of seats) {
        const p = players.find((x) => x.team === seat.team && x.slot === seat.slot)
        if (!p) return '선수 자리를 모두 채워 주세요.'
        if (p.userId) continue
        const name = p.name?.trim() ?? ''
        if (!name) return '선수 자리를 모두 채워 주세요.'
        if (name.length > GUEST_NAME_MAX) return `이름은 ${GUEST_NAME_MAX}자 이내로 입력해주세요.`
        if (p.ntrp == null || !(p.ntrp >= 1 && p.ntrp <= 7)) return `${name}님의 NTRP를 1.0~7.0 사이로 입력해주세요.`
    }
    const memberIds = players.flatMap((p) => (p.userId ? [p.userId] : []))
    if (new Set(memberIds).size !== memberIds.length) return '같은 회원을 두 번 넣을 수 없습니다.'
    if (memberIds.length === 0) return '회원이 한 명은 있어야 합니다.'
    return null
}

/** @param viewerId 기록하는 사람 — 뛴 게임이 하나 이상이어야 한다(DB `not_game_party`) */
export function validateRecordInput(input: RecordInput, viewerId: string): string | null {
    if (!input.playedAt) return '경기 날짜를 선택해주세요.'
    if (!input.playedTime) return '시작 시각을 선택해주세요.'
    if (!input.surface) return '코트 표면을 선택해주세요.'
    if (input.durationMinutes != null && !(Number.isInteger(input.durationMinutes) && input.durationMinutes >= 30 && input.durationMinutes <= 720)) {
        return '종료 시각을 다시 선택해주세요.'
    }
    if (input.courtName && input.courtName.trim().length > 40) return '코트명은 40자 이내로 입력해주세요.'
    if (input.courtNo && input.courtNo.trim().length > 10) return '코트 번호는 10자까지 적을 수 있습니다.'
    if (input.notes && input.notes.trim().length > 500) return '메모는 500자 이내로 입력해주세요.'

    if (input.games.length < 1) return '게임을 하나 이상 적어 주세요.'
    if (input.games.length > MAX_RECORD_GAMES) return `한 번에 ${MAX_RECORD_GAMES}게임까지 기록할 수 있습니다.`
    for (const [i, game] of input.games.entries()) {
        const reason = validatePlayers(game.players, input.matchType) ?? validateSets(game.sets)
        if (reason) return `${i + 1}게임: ${reason}`
    }
    if (!input.games.some((g) => g.players.some((p) => p.userId === viewerId))) return '내가 뛴 게임이 하나는 있어야 합니다.'
    return null
}

/** 단식이면 애드 키를 버린다(DB normalize_game_sets와 같은 규칙) */
export function cleanSets(sets: GameSet[], matchType: MatchType): GameSet[] {
    return sets.map((s) => (isDoubles(matchType) ? { ...s } : { t1: s.t1, t2: s.t2 }))
}
