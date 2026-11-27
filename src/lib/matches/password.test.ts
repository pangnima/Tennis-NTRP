import { describe, expect, it } from 'vitest'

import { validateMatchPassword } from './password'

describe('validateMatchPassword — DB hash_match_password의 거울', () => {
    it('4~20자, 공백 없으면 통과(숫자만일 필요는 없다)', () => {
        expect(validateMatchPassword('1234')).toBeNull()
        expect(validateMatchPassword('tennis!2026')).toBeNull()
        expect(validateMatchPassword('a'.repeat(20))).toBeNull()
    })
    it('짧거나 길면 막는다', () => {
        expect(validateMatchPassword('123')).toContain('4~20자')
        expect(validateMatchPassword('a'.repeat(21))).toContain('4~20자')
    })
    it('공백은 막는다', () => {
        expect(validateMatchPassword('12 34')).toContain('공백')
        expect(validateMatchPassword('1234\t')).toContain('공백')
    })
})
