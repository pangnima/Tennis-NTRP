/** 기록 폼의 초기값 — 묻지 않아도 되는 것은 미리 채운다(오늘·지금 시각·지난번 표면과 코트). */
import { todayIsoKst } from '@/lib/format'
import type { CourtSurface, Game } from '@/types'

/** 지금 시각의 정시 'HH:00' (Asia/Seoul) — 폼의 시각은 시 단위다. */
export function currentHourKst(now: Date = new Date()): string {
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23' }).format(now)
    return `${hour.padStart(2, '0')}:00`
}

export type RecordDefaults = { playedAt: string; playedTime: string; surface: CourtSurface | ''; courtName: string }

/** @param games 내 게임(최신순) — 가장 최근 게임의 표면·코트를 이어받는다. */
export function recordDefaults(games: Game[], now: Date = new Date()): RecordDefaults {
    const last = games[0]
    return { playedAt: todayIsoKst(now), playedTime: currentHourKst(now), surface: last?.surface ?? '', courtName: last?.courtName ?? '' }
}

/** 최근에 쓴 코트명(중복 제거, 최신순) — 코트명 자동완성 후보. */
export function recentCourtNames(games: Game[], limit = 8): string[] {
    return [...new Set(games.flatMap((g) => (g.courtName ? [g.courtName] : [])))].slice(0, limit)
}
