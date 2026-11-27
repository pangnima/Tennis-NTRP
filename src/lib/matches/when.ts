/**
 * 매칭의 시간 표기와 종료 시각 — DB `match_end_at`(0096)의 거울(규칙이 같아야 한다: 시각을 모르면 그날 전체).
 * 시간은 시작 시각 + 소요 시간으로 둔다(자정을 넘겨도 종료 < 시작이 되지 않는다).
 */
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { formatShortDate } from '@/lib/format'
import { isMatchFull } from '@/lib/matches/fee'
import type { TennisMatch } from '@/types'

export const DURATION_OPTIONS = [60, 90, 120, 150, 180, 240, 300, 360] as const
export const DEFAULT_DURATION_MINUTES = 120

/** 분 → '2시간' · '1시간 30분' */
export function formatDurationLabel(minutes: number): string {
    if (!Number.isFinite(minutes) || minutes <= 0) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}분`
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

function addMinutes(hhmm: string, minutes: number): string {
    const total = (Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + minutes) % 1440
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** '10:00~12:00' — 시각을 모르면 빈 문자열 */
export function formatMatchHours(playedTime: string | undefined, durationMinutes: number): string {
    const start = playedTime?.slice(0, 5)
    if (!start || !/^\d{2}:\d{2}$/.test(start)) return ''
    return `${start}~${addMinutes(start, durationMinutes)}`
}

/**
 * 종료 시각 보기 — 시작 시각 + `DURATION_OPTIONS` 각각을 「18:00 (2시간)」으로. 자정을 넘기면 「다음 날 01:00 (2시간)」.
 * 값은 길이(분)라 시작을 바꿔도 길이가 유지되고 종료가 따라 움직인다(DB는 `duration_minutes` 그대로).
 */
export function endTimeOptions(start: string): { value: string; label: string }[] {
    const valid = /^\d{2}:\d{2}/.test(start)
    const startMin = valid ? Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) : 0
    return DURATION_OPTIONS.map((m) => {
        const end = valid ? addMinutes(start.slice(0, 5), m) : ''
        const nextDay = valid && startMin + m >= 1440
        const at = valid ? `${nextDay ? '다음 날 ' : ''}${end} ` : ''
        return { value: String(m), label: `${at}(${formatDurationLabel(m)})`.trim() }
    })
}

/**
 * 매칭 만들기의 기본 일시 — **다음 정각**(지금 15:20이면 16시). 늦은 밤(다음 정각이 23시 이후)은 다음 날 9시,
 * 새벽(다음 정각이 6시 전)은 그날 9시. 직접 기록의 기본값(오늘 현재 시)을 쓰면 만들자마자 이미 시작한 매칭이 된다.
 */
export function nextMatchStart(now: Date = new Date()): { playedAt: string; playedTime: string } {
    const kst = new Date(now.getTime() + 9 * 3_600_000)
    const hour = kst.getUTCHours() + 1
    if (hour >= 23) kst.setUTCDate(kst.getUTCDate() + 1)
    const playedTime = hour >= 23 || hour < 6 ? '09:00' : `${String(hour).padStart(2, '0')}:00`
    return { playedAt: kst.toISOString().slice(0, 10), playedTime }
}

type WhenInput = Pick<TennisMatch, 'playedAt' | 'playedTime' | 'durationMinutes'>

/** '11.25(수) 10:00~12:00' */
export function formatMatchWhen(m: WhenInput): string {
    const hours = formatMatchHours(m.playedTime, m.durationMinutes)
    return hours ? `${formatShortDate(m.playedAt)} ${hours}` : formatShortDate(m.playedAt)
}

/**
 * 알림의 매칭 한 줄 — 일시 · 코트 · 종목. 방 제목(0101, `displayMatchTitle`)은 목록·상세의 이름이고,
 * 알림은 "언제 어디 매칭"이 먼저 읽혀야 해서 이 모양을 그대로 둔다(제목은 바뀔 수 있어 스냅샷과도 어긋난다).
 */
export function matchTitle(m: WhenInput & Pick<TennisMatch, 'courtName' | 'matchType'>): string {
    return [formatMatchWhen(m), m.courtName?.trim() || null, MATCH_TYPE_LABELS[m.matchType]].filter(Boolean).join(' · ')
}

export function matchEndAt(m: WhenInput): Date {
    if (!m.playedTime) {
        const next = new Date(`${m.playedAt}T00:00:00+09:00`)
        next.setUTCDate(next.getUTCDate() + 1)
        return next
    }
    return new Date(new Date(`${m.playedAt}T${m.playedTime.slice(0, 5)}:00+09:00`).getTime() + m.durationMinutes * 60_000)
}

/**
 * 참가 신청이 닫히는 시각 = 경기 시작(시각을 모르면 그날 끝). DB `match_start_at`의 거울 —
 * 이 시각이 지나면 [참가 신청] 대신 「신청 마감」을 보이고, 남은 신청은 예약 작업이 지운다.
 */
export function matchStartAt(m: Pick<WhenInput, 'playedAt' | 'playedTime'>): Date {
    if (!m.playedTime) {
        const next = new Date(`${m.playedAt}T00:00:00+09:00`)
        next.setUTCDate(next.getUTCDate() + 1)
        return next
    }
    return new Date(`${m.playedAt}T${m.playedTime.slice(0, 5)}:00+09:00`)
}

/** 시작 시각이 지금이거나 이미 지났나 — 매칭 폼의 주의 문구(만들기는 막지 않는다). 날짜·시각이 비면 false */
export function hasStarted(m: Pick<WhenInput, 'playedAt' | 'playedTime'>, now: Date = new Date()): boolean {
    if (!m.playedAt || !m.playedTime) return false
    return matchStartAt(m).getTime() <= now.getTime()
}

/**
 * 모집이 닫혔나 — 호스트가 **모집 마감**했거나(0101), 확정됐거나, 경기가 시작됐거나, **정원이 찼다**(0104 — `memberCount`를
 * 넘겼을 때만 본다). 넷 다 화면에는 「모집 마감」 한 말로 보인다.
 * 모집 마감은 매칭 상태가 아니다(상태는 진행 중/확정됨 둘) — 「신청 중」처럼 따로 붙는 표시다.
 */
export function isRecruitmentClosed(
    m: Pick<TennisMatch, 'playedAt' | 'playedTime' | 'confirmedAt' | 'closedAt'> & { capacity?: number },
    now: Date = new Date(),
    memberCount?: number | null,
): boolean {
    if (!!m.confirmedAt || !!m.closedAt || matchStartAt(m).getTime() <= now.getTime()) return true
    return m.capacity != null && isMatchFull(m.capacity, memberCount)
}

/** 화면의 상태는 둘뿐 — 호스트가 확정했으면 '확정됨', 아니면 '진행 중'. */
export type MatchStatus = 'open' | 'confirmed'
export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = { open: '진행 중', confirmed: '확정됨' }

export function matchStatus(m: Pick<TennisMatch, 'confirmedAt'>): MatchStatus {
    return m.confirmedAt ? 'confirmed' : 'open'
}

/**
 * 목록을 「다가오는 / 지난」으로 가른다 — 기준은 **종료 시각**(일정이 끝나면 지난 쪽, 진행 중인 경기는 다가오는 쪽).
 * 경기일로 가르면 오늘 오전에 끝난 매칭이 자정까지 [전체]에 남았다(「일정이 지나면 안 보이게」 — 오너 요청 11-26).
 * 다가오는 것은 가까운 일정이 위, 지난 것은 최근이 위다(둘 다 "지금에서 가까운 순").
 */
export function splitMatchesByEnd<T extends WhenInput>(matches: T[], now: Date = new Date()): { upcoming: T[]; past: T[] } {
    const key = (m: T) => `${m.playedAt} ${m.playedTime ?? ''}`
    const ended = (m: T) => matchEndAt(m).getTime() <= now.getTime()
    const upcoming = matches.filter((m) => !ended(m)).sort((a, b) => key(a).localeCompare(key(b)))
    const past = matches.filter(ended).sort((a, b) => key(b).localeCompare(key(a)))
    return { upcoming, past }
}
