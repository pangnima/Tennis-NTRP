import { describe, expect, it } from 'vitest'
import { HOUR_OPTIONS, formatDayWithWeekday, formatHourLabel, toHourValue, todayIsoKst } from './index'

describe('HOUR_OPTIONS', () => {
    it('00시~23시 24개, 값은 HH:00', () => {
        expect(HOUR_OPTIONS).toHaveLength(24)
        expect(HOUR_OPTIONS[0]).toEqual({ value: '00:00', label: '0시' })
        expect(HOUR_OPTIONS[23]).toEqual({ value: '23:00', label: '23시' })
    })
})

describe('toHourValue', () => {
    it('분을 절삭해 HH:00으로 만든다', () => {
        expect(toHourValue('06:30')).toBe('06:00')
        expect(toHourValue('18:00')).toBe('18:00')
        expect(toHourValue('23:59')).toBe('23:00')
    })

    it('빈 문자열·형식 불일치·범위 밖은 그대로 반환한다', () => {
        expect(toHourValue('')).toBe('')
        expect(toHourValue('abc')).toBe('abc')
        expect(toHourValue('6:30')).toBe('6:30')
        expect(toHourValue('25:00')).toBe('25:00')
    })
})

describe('formatHourLabel', () => {
    it('N시 라벨로 바꾼다 (앞자리 0 제거)', () => {
        expect(formatHourLabel('18:00')).toBe('18시')
        expect(formatHourLabel('06:30')).toBe('6시')
        expect(formatHourLabel('00:00')).toBe('0시')
    })

    it('형식 불일치는 그대로 반환한다', () => {
        expect(formatHourLabel('')).toBe('')
        expect(formatHourLabel('abc')).toBe('abc')
    })
})

describe('formatDayWithWeekday', () => {
    it('월.일 (요일) — 한 자리 월·일은 0을 채운다', () => {
        expect(formatDayWithWeekday('2026-11-26')).toBe('11.26 (목)')
        expect(formatDayWithWeekday('2026-01-04')).toBe('01.04 (일)')
        expect(formatDayWithWeekday('2026-03-07')).toBe('03.07 (토)')
    })

    it('요일은 날짜 문자열만으로 정한다(실행 환경의 시간대에 밀리지 않는다)', () => {
        // 2024-02-29(윤일)는 목요일, 해가 바뀌는 날도 그대로
        expect(formatDayWithWeekday('2024-02-29')).toBe('02.29 (목)')
        expect(formatDayWithWeekday('2026-12-31')).toBe('12.31 (목)')
        expect(formatDayWithWeekday('2027-01-01')).toBe('01.01 (금)')
    })

    it('형식 불일치는 그대로 반환한다', () => {
        expect(formatDayWithWeekday('')).toBe('')
        expect(formatDayWithWeekday('abc')).toBe('abc')
    })
})

describe('todayIsoKst', () => {
    it('KST 기준 날짜 — UTC 15시가 넘으면 다음 날이다', () => {
        expect(todayIsoKst(new Date('2026-11-25T14:59:00Z'))).toBe('2026-11-25')
        expect(todayIsoKst(new Date('2026-11-25T15:00:00Z'))).toBe('2026-11-26')
    })
})
