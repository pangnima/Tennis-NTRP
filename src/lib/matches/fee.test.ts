import { describe, expect, it } from 'vitest'

import { defaultCapacity, formatAmountInput, formatFeeLine, formatHeadcount, formatPerPerson, formatWon, isMatchFull, parseAmount, perPersonFee } from './fee'

describe('매칭 — 코트 비용 · 정원', () => {
    it('정원 기본값 — 단식 2, 복식 4', () => {
        expect(defaultCapacity('singles')).toBe(2)
        expect(defaultCapacity('men_doubles')).toBe(4)
        expect(defaultCapacity('mixed_doubles')).toBe(4)
    })
    it('1인당 금액 — 100원 단위 올림', () => {
        expect(perPersonFee(40000, 4)).toBe(10000)
        expect(perPersonFee(40000, 3)).toBe(13400)
        expect(perPersonFee(0, 4)).toBe(0)
        expect(perPersonFee(40000, 0)).toBeNull()
    })
    it('금액 입력 — 쉼표를 넣어 보이고, 저장할 때 숫자로', () => {
        expect(formatAmountInput('40000')).toBe('40,000')
        expect(formatAmountInput('40,00a0원')).toBe('40,000')
        expect(formatAmountInput('007')).toBe('7')
        expect(formatAmountInput('')).toBe('')
        expect(parseAmount('40,000')).toBe(40000)
        expect(parseAmount(' 4 명')).toBe(4)
        expect(parseAmount('')).toBeUndefined()
        expect(parseAmount('만원')).toBeNaN()
    })
    it('매칭 상세 머리 한 줄', () => {
        expect(formatWon(40000)).toBe('40,000원')
        expect(formatFeeLine({ courtFee: 40000, capacity: 4 }, 2)).toBe('코트비 40,000원 · 1인당 약 10,000원 · 정원 4명 (2명 참가)')
        expect(formatFeeLine({ courtFee: undefined, capacity: 2 }, 1)).toBe('코트비 미정 · 정원 2명 (1명 참가)')
        expect(formatFeeLine({ courtFee: 0, capacity: 4 }, null)).toBe('코트비 무료 · 정원 4명')
    })
    it('목록의 참가 칸 · 정원이 찼나', () => {
        expect(formatPerPerson({ courtFee: 20000, capacity: 4 })).toBe('5,000원')
        expect(formatPerPerson({ courtFee: undefined, capacity: 4 })).toBe('미정')
        expect(formatPerPerson({ courtFee: 0, capacity: 4 })).toBe('무료')
        expect(formatHeadcount(2, 4)).toBe('2/4명')
        expect(formatHeadcount(null, 4)).toBe('-/4명')
        expect(isMatchFull(4, 4)).toBe(true)
        expect(isMatchFull(4, 5)).toBe(true)
        expect(isMatchFull(4, 3)).toBe(false)
        expect(isMatchFull(4, null)).toBe(false)
    })
})
