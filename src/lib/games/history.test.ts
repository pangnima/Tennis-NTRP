import { describe, expect, it } from 'vitest'

import { describeEdit, editStamp, groupEditsBySession, parseSnapshot, type EditSnapshot, type GameEdit } from './history'

const snap = (t1: number, t2: number, opp = '남자02', oppId: string | undefined = 'b'): EditSnapshot => ({
    sets: [{ t1, t2 }],
    players: [{ team: 1, slot: 1, userId: 'me', name: '남자10' }, { team: 2, slot: 1, userId: oppId, name: opp }],
})
const edit = (over: Partial<GameEdit>): GameEdit => ({
    id: 'e1', gameId: 'g1', action: 'edit', before: snap(6, 4), after: snap(6, 3), matchType: 'singles',
    playedAt: '2026-11-26', playedTime: '20:00', createdAt: '2026-11-26T12:05:00Z', ...over,
})

describe('수정 기록 — 무엇을 바꿨나', () => {
    it('스코어 수정 — 내 관점(나는 「나」, 내 점수가 앞)', () => {
        expect(describeEdit(edit({}), 'me')).toBe('스코어 6:4 → 6:3 · 나 vs 남자02')
        expect(describeEdit(edit({}), 'b')).toBe('스코어 4:6 → 3:6 · 나 vs 남자10')
        // 뛰지 않은 사람은 팀 1이 왼쪽
        expect(describeEdit(edit({}), 'other')).toBe('스코어 6:4 → 6:3 · 남자10 vs 남자02')
    })
    it('삭제 · 선수 변경 · 둘 다', () => {
        expect(describeEdit(edit({ action: 'delete', after: undefined }), 'me')).toBe('삭제 · 나 vs 남자02 6:4')
        expect(describeEdit(edit({ after: snap(6, 4, '남자03', 'c') }), 'me')).toBe('선수 변경 · 나 vs 남자02 → 나 vs 남자03 (6:4)')
        expect(describeEdit(edit({ after: snap(7, 5, '남자03', 'c') }), 'me')).toBe('선수·스코어 변경 · 나 vs 남자02 6:4 → 나 vs 남자03 7:5')
    })
    it('복식 — 팀 안은 자리 순서', () => {
        const doubles: EditSnapshot = {
            sets: [{ t1: 6, t2: 2 }],
            players: [
                { team: 1, slot: 2, userId: 'p', name: '남자02' }, { team: 1, slot: 1, userId: 'me', name: '남자10' },
                { team: 2, slot: 1, name: '비회원김' }, { team: 2, slot: 2, userId: 'x', name: '남자04' },
            ],
        }
        expect(describeEdit(edit({ action: 'delete', before: doubles, after: undefined }), 'x')).toBe('삭제 · 비회원김·나 vs 남자10·남자02 2:6')
    })
    it('시각은 KST', () => expect(editStamp('2026-11-26T12:05:00Z')).toBe('11.26 21:05'))
})

describe('parseSnapshot · groupEditsBySession', () => {
    it('모양이 다른 값은 버린다', () => {
        expect(parseSnapshot({ sets: [{ t1: 6, t2: 4, t1Ad: 2 }, { t1: 'x' }], players: [{ team: 2, slot: 1, userId: null, name: '김' }, { team: 1 }] }))
            .toEqual({ sets: [{ t1: 6, t2: 4 }], players: [{ team: 2, slot: 1, userId: undefined, name: '김' }] })
        expect(parseSnapshot(null)).toEqual({ sets: [], players: [] })
    })
    it('게임과 같은 묶음 키로 모으고 오래된 것부터', () => {
        const groups = groupEditsBySession([
            edit({ id: 'late', createdAt: '2026-11-26T13:00:00Z', matchId: 'm1' }),
            edit({ id: 'early', createdAt: '2026-11-26T12:00:00Z', matchId: 'm1' }),
            edit({ id: 'direct', courtName: '양재 시민의숲', courtNo: '3' }),
            edit({ id: 'direct2', courtName: '양재시민의숲', courtNo: '3' }),
        ])
        expect(groups.get('m:m1')?.map((e) => e.id)).toEqual(['early', 'late'])
        expect(groups.get('d|2026-11-26|20:00|양재시민의숲|3|singles')?.map((e) => e.id)).toEqual(['direct', 'direct2'])
    })
})
