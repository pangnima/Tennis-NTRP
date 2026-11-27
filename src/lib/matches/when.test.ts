import { describe, expect, it } from 'vitest'

import {
    endTimeOptions, formatDurationLabel, formatMatchHours, hasStarted, isRecruitmentClosed, matchEndAt, matchStartAt, matchStatus, matchTitle, nextMatchStart,
    splitMatchesByEnd,
} from './when'

describe('매칭 시간 표기', () => {
    it('시작 + 소요 시간 → 구간, 자정을 넘겨도 선다', () => {
        expect(formatMatchHours('10:00', 120)).toBe('10:00~12:00')
        expect(formatMatchHours('23:00:00', 90)).toBe('23:00~00:30')
        expect(formatMatchHours(undefined, 120)).toBe('')
    })

    it('소요 시간 라벨', () => {
        expect(formatDurationLabel(120)).toBe('2시간')
        expect(formatDurationLabel(90)).toBe('1시간 30분')
    })

    it('제목 = 일시 · 코트 · 종목', () => {
        const title = matchTitle({ playedAt: '2026-11-25', playedTime: '10:00', durationMinutes: 120, courtName: '장충', matchType: 'singles' })
        expect(title).toContain('10:00~12:00')
        expect(title).toContain('장충')
        expect(title).toContain('단식')
    })
})

describe('matchStartAt · isRecruitmentClosed — DB match_start_at의 거울', () => {
    it('시작 시각(KST), 시각을 모르면 그날 끝', () => {
        expect(matchStartAt({ playedAt: '2026-11-25', playedTime: '10:00' }).toISOString()).toBe('2026-11-25T01:00:00.000Z')
        expect(matchStartAt({ playedAt: '2026-11-25' }).toISOString()).toBe('2026-11-25T15:00:00.000Z')
    })
    it('시작이 지났거나 확정됐거나 호스트가 모집 마감했으면 닫힌다', () => {
        const m = { playedAt: '2026-11-25', playedTime: '10:00' }
        expect(isRecruitmentClosed(m, new Date('2026-11-25T00:59:00Z'))).toBe(false)
        expect(isRecruitmentClosed(m, new Date('2026-11-25T01:00:00Z'))).toBe(true)
        expect(isRecruitmentClosed({ ...m, confirmedAt: '2026-11-20T00:00:00Z' }, new Date('2026-11-01T00:00:00Z'))).toBe(true)
        expect(isRecruitmentClosed({ ...m, closedAt: '2026-11-20T00:00:00Z' }, new Date('2026-11-01T00:00:00Z'))).toBe(true)
    })
    it('정원이 차면 닫힌다(0104) — 인원을 모르면(비공개 참가 전) 열린 것으로 둔다', () => {
        const m = { playedAt: '2026-11-25', playedTime: '10:00', capacity: 4 }
        const before = new Date('2026-11-01T00:00:00Z')
        expect(isRecruitmentClosed(m, before, 3)).toBe(false)
        expect(isRecruitmentClosed(m, before, 4)).toBe(true)
        expect(isRecruitmentClosed(m, before, null)).toBe(false)
        expect(isRecruitmentClosed(m, before)).toBe(false)
    })
})

describe('matchEndAt — DB match_end_at의 거울', () => {
    it('시각이 있으면 시작 + 소요 시간(KST)', () => {
        expect(matchEndAt({ playedAt: '2026-11-25', playedTime: '10:00', durationMinutes: 120 }).toISOString()).toBe('2026-11-25T03:00:00.000Z')
    })
    it('시각을 모르면 그날이 끝날 때', () => {
        expect(matchEndAt({ playedAt: '2026-11-25', durationMinutes: 120 }).toISOString()).toBe('2026-11-25T15:00:00.000Z')
    })
    it('상태는 둘', () => {
        expect(matchStatus({})).toBe('open')
        expect(matchStatus({ confirmedAt: '2026-11-25T00:00:00Z' })).toBe('confirmed')
    })
})

describe('splitMatchesByEnd — 일정이 끝나면 지난 쪽', () => {
    const m = (playedAt: string, playedTime?: string, durationMinutes = 120) => ({ playedAt, playedTime, durationMinutes })
    const now = new Date('2026-11-26T05:00:00Z') // 11-26 14:00 KST
    it('끝난 매칭은 지난 쪽(오늘 오전 경기 포함), 진행 중·시각 미정(그날 끝까지)은 다가오는 쪽', () => {
        const { upcoming, past } = splitMatchesByEnd(
            [m('2026-12-05', '10:00'), m('2026-11-20'), m('2026-11-26', '18:00'), m('2026-11-26', '13:00'), m('2026-11-26', '09:00'), m('2026-11-26'), m('2026-11-25')],
            now,
        )
        expect(upcoming.map((x) => `${x.playedAt} ${x.playedTime ?? ''}`.trim())).toEqual(['2026-11-26', '2026-11-26 13:00', '2026-11-26 18:00', '2026-12-05 10:00'])
        expect(past.map((x) => `${x.playedAt} ${x.playedTime ?? ''}`.trim())).toEqual(['2026-11-26 09:00', '2026-11-25', '2026-11-20'])
    })
    it('끝나는 순간부터 지난 쪽', () => {
        const at = new Date('2026-11-26T03:00:00Z') // 12:00 KST
        expect(splitMatchesByEnd([m('2026-11-26', '10:00')], at).past).toHaveLength(1)
        expect(splitMatchesByEnd([m('2026-11-26', '10:00')], new Date(at.getTime() - 1)).upcoming).toHaveLength(1)
    })
})
describe('매칭 폼 — 종료 시각 · 기본 일시 · 시작 여부', () => {
    it('endTimeOptions — 시작 + 길이, 30분 단위·자정 넘김, 값은 길이(분)', () => {
        const opts = endTimeOptions('16:00')
        expect(opts.find((o) => o.value === '120')?.label).toBe('18:00 (2시간)')
        expect(opts.find((o) => o.value === '90')?.label).toBe('17:30 (1시간 30분)')
        expect(endTimeOptions('23:00').find((o) => o.value === '120')?.label).toBe('다음 날 01:00 (2시간)')
        expect(endTimeOptions('22:00').find((o) => o.value === '120')?.label).toBe('다음 날 00:00 (2시간)')
        expect(endTimeOptions('').find((o) => o.value === '120')?.label).toBe('(2시간)')
    })
    it('nextMatchStart — 다음 정각(KST), 23시 이후면 다음 날 9시', () => {
        expect(nextMatchStart(new Date('2026-11-26T06:20:00Z'))).toEqual({ playedAt: '2026-11-26', playedTime: '16:00' }) // 15:20 KST
        expect(nextMatchStart(new Date('2026-11-26T12:10:00Z'))).toEqual({ playedAt: '2026-11-26', playedTime: '22:00' }) // 21:10 KST
        expect(nextMatchStart(new Date('2026-11-26T13:10:00Z'))).toEqual({ playedAt: '2026-11-27', playedTime: '09:00' }) // 22:10 KST → 23시는 늦다
        expect(nextMatchStart(new Date('2026-11-26T14:30:00Z'))).toEqual({ playedAt: '2026-11-27', playedTime: '09:00' }) // 23:30 KST
        expect(nextMatchStart(new Date('2026-11-26T15:30:00Z'))).toEqual({ playedAt: '2026-11-27', playedTime: '09:00' }) // 00:30 KST(이미 27일) — 새벽은 그날 9시
        expect(nextMatchStart(new Date('2026-11-26T22:10:00Z'))).toEqual({ playedAt: '2026-11-27', playedTime: '08:00' }) // 07:10 KST
    })
    it('hasStarted — 시작 시각이 지금이거나 지났으면 true, 비면 false', () => {
        const now = new Date('2026-11-26T06:00:00Z') // 15:00 KST
        expect(hasStarted({ playedAt: '2026-11-26', playedTime: '15:00' }, now)).toBe(true)
        expect(hasStarted({ playedAt: '2026-11-26', playedTime: '14:00' }, now)).toBe(true)
        expect(hasStarted({ playedAt: '2026-11-26', playedTime: '16:00' }, now)).toBe(false)
        expect(hasStarted({ playedAt: '2026-11-26', playedTime: '' }, now)).toBe(false)
    })
})