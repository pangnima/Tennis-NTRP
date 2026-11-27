import { describe, expect, it } from 'vitest'

import { choseong, courtKey, formatCourt, matchCourt, similarCourt } from './court'

describe('코트명 찾기 — DB search_court_names의 거울', () => {
    it('키는 소문자 + 공백 제거', () => {
        expect(courtKey(' 양재 시민의숲  테니스장 ')).toBe('양재시민의숲테니스장')
        expect(courtKey('Olympic Park')).toBe('olympicpark')
    })
    it('초성', () => {
        expect(choseong('양재 시민의숲')).toBe('ㅇㅈ ㅅㅁㅇㅅ')
        expect(choseong('A코트3')).toBe('Aㅋㅌ3')
    })
    it('순위 — 앞부분 0 · 포함 1 · 줄임말·초성 2 · 없음 null', () => {
        const name = '양재 시민의숲 테니스장'
        expect(matchCourt(name, '양재')).toBe(0)
        expect(matchCourt(name, '양재시민')).toBe(0)
        expect(matchCourt(name, '시민의 숲')).toBe(1)
        expect(matchCourt(name, '양시숲')).toBe(2)
        expect(matchCourt(name, 'ㅇㅈㅅㅁ')).toBe(2)
        expect(matchCourt(name, '숲양')).toBeNull()
        expect(matchCourt(name, 'ㅂㅍ')).toBeNull()
        expect(matchCourt(name, '')).toBe(0)
    })
    it('비슷한 코트 — 키가 같으면 힌트 없음, 줄임말·일부로 걸리면 그 후보', () => {
        const list = ['양재 시민의숲 테니스장', '올림픽공원 테니스장']
        expect(similarCourt('양시숲', list)).toBe('양재 시민의숲 테니스장')
        expect(similarCourt('양재', list)).toBe('양재 시민의숲 테니스장')
        expect(similarCourt('ㅇㄹㅍ', list)).toBe('올림픽공원 테니스장')
        expect(similarCourt('양재시민의숲테니스장', list)).toBeNull()
        expect(similarCourt('반포 종합운동장', list)).toBeNull()
        expect(similarCourt('', list)).toBeNull()
    })
    it('코트 번호 표시', () => {
        expect(formatCourt('양재 시민의숲', '3')).toBe('양재 시민의숲 · 3번 코트')
        expect(formatCourt('양재 시민의숲', '3, 4')).toBe('양재 시민의숲 · 3, 4번 코트')
        expect(formatCourt('양재 시민의숲', 'A코트')).toBe('양재 시민의숲 · A코트')
        expect(formatCourt('양재 시민의숲', undefined)).toBe('양재 시민의숲')
        expect(formatCourt(undefined, '3')).toBe('')
    })
})
