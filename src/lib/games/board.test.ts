import { describe, expect, it } from 'vitest'

import type { Game } from '@/types'

import {
    applyLineup, applySaved, diffBoard, emptyRow, fromGames, guestKey, isPlanned, isRowDirty, rowMode, rowUpsert, rowWinner, setScore, setSlot, setWinner, swapTeam,
    syncBoard, validateBoard, validateRow, type PoolPlayer,
} from './board'
import type { LineupPlayer } from './lineup'

const member = (id: string): PoolPlayer => ({ key: id, userId: id, name: id, ntrp: 3, isMember: true })
const MEMBERS = ['a', 'b', 'c', 'd', 'e'].map(member)

const game = (id: string, keys: [string, string, string, string], sets: Game['sets'], extra: Partial<Game> = {}): Game => ({
    id, matchId: 'm', createdBy: 'a', matchType: 'men_doubles', playedAt: '2026-11-26', sets,
    players: keys.map((k, i) => ({
        team: (i < 2 ? 1 : 2) as 1 | 2, slot: (i % 2 === 0 ? 1 : 2) as 1 | 2,
        ...(k.startsWith('g') ? { name: k, ntrp: 2.5, hand: 'left' as const } : { userId: k, name: k }),
    })),
    locked: false, createdAt: '2026-11-26T01:00:00Z', ...extra,
})

describe('fromGames — 저장된 게임을 보드로', () => {
    it('자리는 절대 좌표 순서, 점수 없는 게임은 빈 칸 하나', () => {
        const { rows } = fromGames([game('g1', ['a', 'b', 'c', 'd'], [{ t1: 6, t2: 4 }]), game('g2', ['a', 'c', 'b', 'd'], [])], MEMBERS, 'men_doubles')
        expect(rows[0].slots).toEqual(['a', 'b', 'c', 'd'])
        expect(rows[0].scores).toEqual([{ t1: '6', t2: '4' }])
        expect(isPlanned(rows[1])).toBe(true)
        expect(rows[1].version).toBe('2026-11-26T01:00:00Z')
    })
    it('게임에 나온 비회원이 풀에 들어간다(이름·NTRP·손 그대로)', () => {
        const { pool, rows } = fromGames([game('g1', ['a', 'gKim', 'c', 'd'], [{ t1: 6, t2: 2 }])], MEMBERS, 'men_doubles')
        expect(pool.find((p) => p.key === guestKey('gKim'))).toMatchObject({ name: 'gKim', ntrp: 2.5, hand: 'left', isMember: false })
        expect(rows[0].slots[1]).toBe(guestKey('gKim'))
    })
})

describe('편집', () => {
    const base = [emptyRow(4, ['a', 'b', 'c', 'd'])]
    it('같은 게임의 다른 자리 사람을 고르면 맞바꾼다', () => {
        expect(setSlot(base, base[0].key, 0, 'c')[0].slots).toEqual(['c', 'b', 'a', 'd'])
    })
    it('게임에 없던 사람은 그 자리에 들어간다', () => {
        expect(setSlot(base, base[0].key, 3, 'e')[0].slots).toEqual(['a', 'b', 'c', 'e'])
    })
    it('점수 칸은 숫자 두 자리까지', () => {
        expect(setScore(base, base[0].key, 0, 't1', '6a12')[0].scores[0].t1).toBe('61')
    })
})

describe('applyLineup — 점수 있는 게임은 둔다', () => {
    it('점수 없는 줄만 새 대진으로 바뀐다', () => {
        const scored = { ...emptyRow(4, ['a', 'b', 'c', 'd']), scores: [{ t1: '6', t2: '3' }] }
        const planned = emptyRow(4, ['a', 'c', 'b', 'd'])
        const lp = (k: string): LineupPlayer => ({ key: k, name: k, ntrp: 3, isMember: true })
        const next = applyLineup([scored, planned], [{ team1: [lp('e'), lp('a')], team2: [lp('b'), lp('c')] }], 4)
        expect(next).toHaveLength(2)
        expect(next[0]).toBe(scored)
        expect(next[1].slots).toEqual(['e', 'a', 'b', 'c'])
    })
})

describe('validateBoard', () => {
    const v = (slots: (string | null)[], t1 = '', t2 = '') => validateBoard([{ ...emptyRow(4, slots), scores: [{ t1, t2 }] }], [...MEMBERS, { key: 'guest:x', name: 'x', isMember: false }])
    it('통과 — 예정(빈 점수)과 점수 둘 다', () => {
        expect(v(['a', 'b', 'c', 'd'])).toBeNull()
        expect(v(['a', 'b', 'c', 'd'], '6', '4')).toBeNull()
    })
    it('빈 자리 · 중복 · 회원 없음 · 한쪽 점수 · 0:0을 막는다', () => {
        expect(v(['a', null, 'c', 'd'])).toContain('자리를 모두')
        expect(v(['a', 'a', 'c', 'd'])).toContain('두 자리')
        expect(validateBoard([emptyRow(2, ['guest:x', 'guest:y'])], [{ key: 'guest:x', name: 'x', isMember: false }, { key: 'guest:y', name: 'y', isMember: false }])).toContain('회원이')
        expect(v(['a', 'b', 'c', 'd'], '6', '')).toContain('양쪽')
        expect(v(['a', 'b', 'c', 'd'], '0', '0')).toContain('0:0')
    })
})

describe('diffBoard — 바뀐 줄만 저장', () => {
    const loaded = fromGames(
        [game('g1', ['a', 'b', 'c', 'd'], [{ t1: 6, t2: 4, t1Ad: 2, t2Ad: 1 }]), game('g2', ['a', 'c', 'b', 'gKim'], [])],
        MEMBERS, 'men_doubles',
    )
    it('아무것도 안 바꾸면 비어 있다', () => {
        expect(diffBoard(loaded.rows, loaded.rows, loaded.pool)).toEqual({ upserts: [], deletes: [] })
    })
    it('첫 slot이 백(Ad = 1)으로 저장된 팀은 읽을 때 두 자리를 바꿔 「둘째 자리 = 백」으로 그린다', () => {
        // g1: 팀1은 slot2(b)가 백 → 그대로 [a, b], 팀2는 slot1(c)이 백 → [d, c]
        expect(loaded.rows[0].slots).toEqual(['a', 'b', 'd', 'c'])
    })
    it('복식 스코어는 세트마다 둘째 자리를 백으로 저장한다(t1Ad = t2Ad = 2)', () => {
        const next = setScore(loaded.rows, 'g1', 0, 't2', '5')
        const { upserts } = diffBoard(loaded.rows, next, loaded.pool)
        expect(upserts).toHaveLength(1)
        expect(upserts[0]).toMatchObject({ id: 'g1', version: '2026-11-26T01:00:00Z', sets: [{ t1: 6, t2: 5, t1Ad: 2, t2Ad: 2 }] })
        expect(upserts[0].players.slice(2)).toEqual([{ team: 2, slot: 1, userId: 'd' }, { team: 2, slot: 2, userId: 'c' }])
    })
    it('[⇄]로 포/백을 바꾸면 그 줄이 저장 대상이 되고, 다시 바꾸면 변경이 없다', () => {
        const swapped = swapTeam(loaded.rows, 'g1', 1)
        expect(swapped[0].slots.slice(0, 2)).toEqual(['b', 'a'])
        expect(diffBoard(loaded.rows, swapped, loaded.pool).upserts).toHaveLength(1)
        expect(diffBoard(loaded.rows, swapTeam(swapped, 'g1', 1), loaded.pool).upserts).toHaveLength(0)
    })
    it('단식은 포/백이 없다', () => {
        const row = { ...emptyRow(2, ['a', 'guest:x']), scores: [{ t1: '6', t2: '1' }] }
        const pool = [...MEMBERS, { key: 'guest:x', name: 'x', ntrp: 3, isMember: false }]
        expect(diffBoard([], [row], pool).upserts[0].sets).toEqual([{ t1: 6, t2: 1 }])
        expect(swapTeam([row], row.key, 1)[0].slots).toEqual(['a', 'guest:x'])
    })
    it('예정 게임에 점수를 넣으면 세트가 생기고, 비회원은 이름·NTRP·손으로 보낸다', () => {
        const next = setScore(setScore(loaded.rows, 'g2', 0, 't1', '6'), 'g2', 0, 't2', '2')
        const up = diffBoard(loaded.rows, next, loaded.pool).upserts[0]
        expect(up.sets).toEqual([{ t1: 6, t2: 2, t1Ad: 2, t2Ad: 2 }])
        expect(up.players[3]).toEqual({ team: 2, slot: 2, name: 'gKim', ntrp: 2.5, hand: 'left' })
        expect(up.players[0]).toEqual({ team: 1, slot: 1, userId: 'a' })
    })
    it('새 줄은 id 없이, 지운 저장 줄은 delete로', () => {
        const next = [loaded.rows[0], emptyRow(4, ['a', 'b', 'c', 'e'])]
        const diff = diffBoard(loaded.rows, next, loaded.pool)
        expect(diff.deletes).toEqual(['g2'])
        expect(diff.upserts).toHaveLength(1)
        expect(diff.upserts[0].id).toBeUndefined()
        expect(diff.upserts[0].sets).toEqual([])
    })
})

describe('게임별 저장 — 줄 하나만 저장해도 다른 줄의 입력은 남는다', () => {
    const base = fromGames([game('g1', ['a', 'b', 'c', 'd'], [{ t1: 6, t2: 4 }]), game('g2', ['a', 'c', 'b', 'd'], [])], MEMBERS, 'men_doubles')
    const state = { loaded: base.rows, rows: base.rows }

    it('rowMode — 스코어 저장된 게임은 보기, 저장된 예정 게임은 점수(선수는 글자), 새 줄·[수정] 중·자리 바뀐 줄은 편집', () => {
        const fresh = emptyRow(4)
        expect(rowMode(base.rows[0], base.rows, new Set())).toBe('view')
        expect(rowMode(base.rows[0], base.rows, new Set(['g1']))).toBe('edit')
        expect(rowMode(fresh, base.rows, new Set())).toBe('edit')
        expect(rowMode(swapTeam(base.rows, 'g1', 1)[0], base.rows, new Set())).toBe('edit')
        // 저장된 예정 게임 — 선수는 글자, 점수 칸만 열린다. 점수를 넣는 중에도 선택칸으로 바뀌지 않는다
        expect(rowMode(base.rows[1], base.rows, new Set())).toBe('score')
        expect(rowMode(setScore(base.rows, 'g2', 0, 't1', '6')[1], base.rows, new Set())).toBe('score')
        // [수정]을 눌렀거나 자동 대진표가 자리를 바꾼 예정 게임은 선택칸이 열린다
        expect(rowMode(base.rows[1], base.rows, new Set(['g2']))).toBe('edit')
        expect(rowMode(swapTeam(base.rows, 'g2', 2)[1], base.rows, new Set())).toBe('edit')
    })

    it('isRowDirty · rowUpsert — 줄 하나의 저장 내용', () => {
        expect(isRowDirty(base.rows, base.rows[0])).toBe(false)
        const scored = setScore(setScore(base.rows, 'g2', 0, 't1', '6'), 'g2', 0, 't2', '3')[1]
        expect(isRowDirty(base.rows, scored)).toBe(true)
        expect(rowUpsert(scored, base.pool)).toMatchObject({ id: 'g2', version: '2026-11-26T01:00:00Z', sets: [{ t1: 6, t2: 3, t1Ad: 2, t2Ad: 2 }] })
    })

    it('applySaved — 저장한 줄만 id·version을 받고 깨끗해진다, 다른 줄의 입력은 그대로', () => {
        const fresh = emptyRow(4, ['a', 'b', 'c', 'e'])
        const edited = setScore(base.rows, 'g2', 0, 't1', '6')
        const s = { loaded: base.rows, rows: [...edited, fresh] }
        const next = applySaved(s, [fresh.key], [{ id: 'g3', version: 'v3' }])
        const saved = next.rows.find((r) => r.key === fresh.key)
        expect(saved).toMatchObject({ id: 'g3', version: 'v3' })
        expect(isRowDirty(next.loaded, saved!)).toBe(false)
        expect(next.rows[1].scores[0].t1).toBe('6')
        expect(isRowDirty(next.loaded, next.rows[1])).toBe(true)
        expect(diffBoard(next.loaded, next.rows, base.pool).upserts).toHaveLength(1)
    })

    it('applySaved — 지운 게임은 기준에서 빠지고, 먼저 도착한 같은 게임 줄은 겹치지 않는다', () => {
        const fresh = emptyRow(4, ['a', 'b', 'c', 'e'])
        const arrived = { ...fresh, key: 'g3', id: 'g3', version: 'v3' }
        const next = applySaved({ loaded: [base.rows[0], arrived], rows: [base.rows[0], fresh, arrived] }, [fresh.key], [{ id: 'g3', version: 'v3' }], ['g2'])
        expect(next.rows.map((r) => r.key)).toEqual(['g1', fresh.key])
        expect(next.loaded.map((r) => r.id)).toEqual(['g1', 'g3'])
    })

    it('syncBoard — 깨끗한 줄은 서버 값, 고치던 줄은 그대로, 새 게임은 끝에, 내가 뺀 게임은 다시 넣지 않는다', () => {
        const server = fromGames([
            game('g1', ['a', 'b', 'c', 'd'], [{ t1: 7, t2: 5 }], { updatedAt: '2026-11-26T02:00:00Z' }),
            game('g2', ['a', 'c', 'b', 'd'], []),
            game('g4', ['a', 'b', 'd', 'e'], []),
        ], MEMBERS, 'men_doubles').rows
        const editing = setScore(state.rows, 'g2', 0, 't1', '6')
        const next = syncBoard({ loaded: base.rows, rows: editing }, server)
        expect(next.rows.map((r) => r.id)).toEqual(['g1', 'g2', 'g4'])
        expect(next.rows[0].scores[0]).toEqual({ t1: '7', t2: '5' })
        expect(next.rows[1].scores[0].t1).toBe('6')
        // 지우려고 뺀(저장 전) g2는 서버에 있어도 다시 넣지 않는다
        const removed = syncBoard({ loaded: base.rows, rows: [base.rows[0]] }, server)
        expect(removed.rows.map((r) => r.id)).toEqual(['g1', 'g4'])
    })

    it('syncBoard — [수정] 중인 줄은 지키고(version은 읽은 값), 서버에서 지워진 게임을 고치던 중이면 새 줄로 남긴다', () => {
        const server = fromGames([game('g1', ['a', 'b', 'c', 'd'], [{ t1: 7, t2: 5 }], { updatedAt: 'v9' })], MEMBERS, 'men_doubles').rows
        const editing = setScore(state.rows, 'g2', 0, 't1', '6')
        const next = syncBoard({ loaded: base.rows, rows: editing }, server, new Set(['g1']))
        expect(next.rows[0]).toMatchObject({ id: 'g1', version: '2026-11-26T01:00:00Z', scores: [{ t1: '6', t2: '4' }] })
        expect(next.rows[1].id).toBeUndefined()
        expect(next.rows[1].scores[0].t1).toBe('6')
    })

    it('validateRow — 줄 아래에 보일 이유(게임 번호 없이)', () => {
        expect(validateRow(emptyRow(4), MEMBERS)).toBe('선수 자리를 모두 채워 주세요.')
        expect(validateRow({ ...emptyRow(4, ['a', 'b', 'c', 'd']), scores: [{ t1: '6', t2: '' }] }, MEMBERS)).toBe('스코어를 양쪽 다 넣거나 둘 다 비워 주세요.')
        expect(validateRow(emptyRow(4, ['a', 'b', 'c', 'd']), MEMBERS)).toBeNull()
    })
})
describe('이긴 쪽 — 보기 모드의 강조', () => {
    const row = (scores: { t1: string; t2: string }[]) => ({ ...emptyRow(4, ['a', 'b', 'c', 'd']), scores })
    it('setWinner — 큰 쪽, 같거나 비면 null(두 자리 숫자도 숫자로 비교)', () => {
        expect(setWinner({ t1: '6', t2: '4' })).toBe(1)
        expect(setWinner({ t1: '3', t2: '10' })).toBe(2)
        expect(setWinner({ t1: '4', t2: '4' })).toBeNull()
        expect(setWinner({ t1: '', t2: '' })).toBeNull()
        expect(setWinner({ t1: '6', t2: '' })).toBeNull()
    })
    it('rowWinner — 모든 세트를 같은 팀이 이겼을 때만', () => {
        expect(rowWinner(row([{ t1: '6', t2: '4' }]))).toBe(1)
        expect(rowWinner(row([{ t1: '2', t2: '6' }, { t1: '3', t2: '6' }]))).toBe(2)
        expect(rowWinner(row([{ t1: '6', t2: '4' }, { t1: '3', t2: '6' }]))).toBeNull()
        expect(rowWinner(row([{ t1: '6', t2: '4' }, { t1: '5', t2: '5' }]))).toBeNull()
        expect(rowWinner(row([{ t1: '', t2: '' }]))).toBeNull()
    })
})