import { describe, expect, it } from 'vitest'

import { displayMatchTitle, MATCH_TITLE_MAX, validateMatchTitle } from './title'

describe('방 제목 — DB normalize_match_title의 거울', () => {
    it('앞뒤 공백을 빼고 1~40자', () => {
        expect(validateMatchTitle('남복하실 남자 2명 모집중')).toBeNull()
        expect(validateMatchTitle('   ')).not.toBeNull()
        expect(validateMatchTitle('가'.repeat(MATCH_TITLE_MAX))).toBeNull()
        expect(validateMatchTitle(`  ${'가'.repeat(MATCH_TITLE_MAX)}  `)).toBeNull()
        expect(validateMatchTitle('가'.repeat(MATCH_TITLE_MAX + 1))).not.toBeNull()
    })
    it('제목이 없는 예전 매칭은 종목으로 부른다', () => {
        expect(displayMatchTitle({ title: ' 아침 단식 ', matchType: 'singles' })).toBe('아침 단식')
        expect(displayMatchTitle({ matchType: 'men_doubles' })).toBe('남복 매칭')
    })
})