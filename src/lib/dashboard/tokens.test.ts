import { describe, expect, it } from 'vitest'

import { FIELD_LABEL, FIELD_SELECT_TRIGGER, fieldClass, fieldMessageClass } from '@/components/common/field-class'

import { EMPTY_BLOCK, PILL_BASE, TYPO } from './tokens'

const SEMANTIC_TOKEN = /(?:^|\s)text-(display|h[1-4]|body2?|caption|micro)(?=\s|$)/g
const BANNED_SIZE = /\btext-(xs|sm|base|lg|xl|\dxl|\[[^\]]+\])\b/

describe('TYPO 시맨틱 타이포 토큰', () => {
    it('각 값은 font-size 토큰을 정확히 하나 포함한다', () => {
        for (const [key, value] of Object.entries(TYPO)) {
            expect(value.match(SEMANTIC_TOKEN)?.length, key).toBe(1)
        }
    })

    it('Tailwind 기본 사이즈·임의값 클래스를 쓰지 않는다', () => {
        const all = [
            ...Object.values(TYPO),
            fieldClass(),
            fieldClass({ multiline: true }),
            FIELD_LABEL,
            FIELD_SELECT_TRIGGER,
            fieldMessageClass(),
            EMPTY_BLOCK,
            PILL_BASE,
        ]
        for (const value of all) expect(value).not.toMatch(BANNED_SIZE)
    })

    it('폼 칸은 Body1 16px(text-body)로 iOS 줌을 방지한다', () => {
        expect(fieldClass()).toMatch(/\btext-body\b/)
        expect(fieldClass({ size: 'md' })).toMatch(/\btext-body\b/)
        expect(FIELD_SELECT_TRIGGER).toMatch(/\btext-body\b/)
    })
})
