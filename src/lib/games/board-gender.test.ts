import { describe, expect, it } from 'vitest'

import type { Game } from '@/types'

import { emptyRow, fixedGuestGender, fromGames, guestKey, rowUpsert, setScore, type PoolPlayer } from './board'

describe('비회원 성별(0107)', () => {
    it('남복 = 남 · 여복 = 여로 고정, 단식·혼복은 고른다', () => {
        expect(fixedGuestGender('men_doubles')).toBe('male')
        expect(fixedGuestGender('women_doubles')).toBe('female')
        expect(fixedGuestGender('mixed_doubles')).toBeNull()
        expect(fixedGuestGender('singles')).toBeNull()
    })

    it('저장할 때 비회원의 성별을 싣는다 — 회원은 userId만', () => {
        const pool: PoolPlayer[] = [
            { key: 'me', userId: 'me', name: '남자10', gender: 'male', isMember: true },
            { key: guestKey('손님'), name: '손님', ntrp: 3, hand: 'left', gender: 'female', isMember: false },
        ]
        const [row] = setScore(setScore([emptyRow(2, ['me', guestKey('손님')])], 'x', 0, 't1', '6'), 'x', 0, 't2', '4')
        expect(rowUpsert(row, pool).players).toEqual([
            { team: 1, slot: 1, userId: 'me' },
            { team: 2, slot: 1, name: '손님', ntrp: 3, hand: 'left', gender: 'female' },
        ])
    })

    it('저장된 게임을 다시 읽으면 비회원의 성별이 풀에 되살아난다', () => {
        const game: Game = {
            id: 'g1', createdBy: 'me', matchType: 'singles', playedAt: '2026-11-27', sets: [{ t1: 6, t2: 4 }], locked: false, createdAt: '',
            players: [{ team: 1, slot: 1, userId: 'me', name: '남자10' }, { team: 2, slot: 1, name: '손님', ntrp: 3, hand: 'left', gender: 'female' }],
        }
        const { pool } = fromGames([game], [{ key: 'me', userId: 'me', name: '남자10', gender: 'male', isMember: true }], 'singles')
        expect(pool.find((p) => p.key === guestKey('손님'))).toMatchObject({ gender: 'female', isMember: false })
    })
})
