import { describe, expect, it } from 'vitest'

import { countMine, emptyRow, guestKey, isMine, mergePool, type PoolPlayer } from './board'

describe('내 게임(0109)', () => {
    const rows = [emptyRow(4, ['a', guestKey('손님'), 'b', 'c']), emptyRow(4, ['b', 'c', 'd', null]), emptyRow(4, ['d', 'a', 'b', 'c'])]
    it('회원은 userId, 초대 화면의 비회원은 guest:이름으로 찾는다', () => {
        expect(rows.map((r) => isMine(r, 'a'))).toEqual([true, false, true])
        expect(countMine(rows, 'a')).toBe(2)
        expect(countMine(rows, guestKey('손님'))).toBe(1)
    })
    it('보는 사람을 모르면 0', () => {
        expect(countMine(rows, undefined)).toBe(0)
        expect(isMine(rows[1], null)).toBe(false)
    })
})

const member = (id: string): PoolPlayer => ({ key: id, userId: id, name: id, isMember: true })
const guest = (name: string): PoolPlayer => ({ key: guestKey(name), name, ntrp: 3, isMember: false })

describe('보드의 선수 풀 — 기준은 명단(0108)', () => {
    it('명단에 새로 오른 비회원은 풀에 들어온다', () => {
        const next = [member('a'), member('b'), guest('손님')]
        expect(mergePool([member('a'), member('b')], next, []).map((p) => p.key)).toEqual(['a', 'b', guestKey('손님')])
    })

    it('명단에서 빠진 비회원은 풀에서도 빠진다', () => {
        const prev = [member('a'), guest('손님')]
        expect(mergePool(prev, [member('a')], [emptyRow(2, ['a', null])]).map((p) => p.key)).toEqual(['a'])
    })

    it('지금 줄이 쓰고 있는 사람은 남긴다 — 고치던 자리가 비어 보이지 않게', () => {
        const prev = [member('a'), guest('손님')]
        expect(mergePool(prev, [member('a')], [emptyRow(2, ['a', guestKey('손님')])]).map((p) => p.key)).toEqual(['a', guestKey('손님')])
    })

    it('서버 값이 이긴다 — 같은 키면 새 풀의 값', () => {
        const next = [{ ...guest('손님'), ntrp: 4 }]
        expect(mergePool([guest('손님')], next, [emptyRow(2, [guestKey('손님'), null])])).toEqual(next)
    })
})
