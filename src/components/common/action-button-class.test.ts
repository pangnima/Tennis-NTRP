import { describe, expect, it } from 'vitest'

import { ACTION_VARIANTS, actionButtonClass, PRESS_HEIGHT, PRESS_SCALE, type ActionSize } from './action-button-class'

const SIZES = Object.keys(PRESS_HEIGHT) as ActionSize[]

describe('actionButtonClass', () => {
    it('크기 다섯 단계가 서로 다른 높이를 갖는다', () => {
        expect(new Set(Object.values(PRESS_HEIGHT)).size).toBe(5)
        for (const size of SIZES) {
            const cls = actionButtonClass({ size }).split(' ')
            expect(cls, size).toContain(PRESS_HEIGHT[size])
            for (const other of Object.values(PRESS_HEIGHT)) if (other !== PRESS_HEIGHT[size]) expect(cls, size).not.toContain(other)
        }
    })

    it('단계표의 px가 높이 클래스와 맞는다(Tailwind 1단위 = 4px)', () => {
        for (const { size, px } of PRESS_SCALE) expect(Number(PRESS_HEIGHT[size].slice(2)) * 4, size).toBe(px)
        expect(PRESS_SCALE.map((s) => s.size)).toEqual(SIZES)
    })

    it('기본은 md · outline', () => {
        const cls = actionButtonClass()
        expect(cls).toContain('h-9')
        expect(cls).toContain('border-border')
    })

    it('모양 — 표에 적힌 다섯 가지가 모두 클래스를 낸다', () => {
        expect(ACTION_VARIANTS).toHaveLength(5)
        expect(actionButtonClass({ variant: 'solid' })).toContain('bg-spot-solid')
        expect(actionButtonClass({ variant: 'danger' })).toContain('text-destructive')
        expect(actionButtonClass({ variant: 'danger' })).not.toContain('bg-destructive/10 ')
        expect(actionButtonClass({ variant: 'dangerFill' })).toContain('bg-destructive/10')
    })

    it('square는 폭 = 높이, 좌우 여백이 없다', () => {
        const cls = actionButtonClass({ size: 'md', square: true }).split(' ')
        expect(cls).toContain('h-9')
        expect(cls).toContain('w-9')
        expect(cls.some((c) => c.startsWith('px-'))).toBe(false)
    })

    it('시맨틱 타이포 토큰만 쓴다', () => {
        for (const size of SIZES) expect(actionButtonClass({ size })).not.toMatch(/\btext-(sm|xs|base|lg)\b/)
    })
})
