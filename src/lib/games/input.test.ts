import { describe, expect, it } from 'vitest'

import { cleanSets, seatsOf, validateRecordInput, validateSets, type GamePlayerInput, type RecordGameInput, type RecordInput } from './input'

const seat = (team: 1 | 2, userId: string): GamePlayerInput => ({ team, slot: 1, userId })
const guest = (over: Partial<GamePlayerInput> = {}): GamePlayerInput => ({ team: 2, slot: 1, name: '최유진', ntrp: 3.0, hand: 'right', ...over })
const game = (a: GamePlayerInput, b: GamePlayerInput, t1 = 6, t2 = 4): RecordGameInput => ({ players: [a, b], sets: [{ t1, t2 }] })
const base: RecordInput = {
    matchType: 'singles', playedAt: '2026-11-25', playedTime: '20:00', durationMinutes: 120, surface: 'hard',
    games: [game(seat(1, 'me'), guest())],
}

describe('validateRecordInput — 한 게임 = 스코어 하나, 게임마다 대진', () => {
    it('단식 한 게임 — 통과', () => expect(validateRecordInput(base, 'me')).toBeNull())

    it('3명이 번갈아 단식 — 내가 안 뛴 게임(B vs C)도 함께 적는다', () => {
        const input = { ...base, games: [game(seat(1, 'me'), seat(2, 'b')), game(seat(1, 'b'), seat(2, 'c'), 3, 6), game(seat(1, 'me'), seat(2, 'c'))] }
        expect(validateRecordInput(input, 'me')).toBeNull()
    })

    it('내가 뛴 게임이 하나도 없으면 거절', () => {
        expect(validateRecordInput({ ...base, games: [game(seat(1, 'b'), seat(2, 'c'))] }, 'me')).toMatch('내가 뛴 게임')
    })

    it('게임마다 검증하고 줄 번호를 붙인다', () => {
        const two = (g: RecordGameInput) => ({ ...base, games: [base.games[0], g] })
        expect(validateRecordInput(two({ players: [seat(1, 'me')], sets: [{ t1: 6, t2: 4 }] }), 'me')).toBe('2게임: 선수 자리를 모두 채워 주세요.')
        expect(validateRecordInput(two(game(seat(1, 'me'), seat(2, 'me'))), 'me')).toMatch('2게임: 같은 회원')
        expect(validateRecordInput(two(game(guest({ team: 1, name: '가' }), guest({ name: '나' }))), 'me')).toMatch('2게임: 회원이 한 명')
        expect(validateRecordInput(two(game(seat(1, 'me'), guest({ ntrp: undefined }))), 'me')).toMatch('2게임: 최유진님의 NTRP')
        expect(validateRecordInput(two({ players: base.games[0].players, sets: [] }), 'me')).toBe('2게임: 스코어를 입력해주세요.')
        expect(validateRecordInput(two({ players: base.games[0].players, sets: [{ t1: 6, t2: 4 }, { t1: 6, t2: 3 }] }), 'me')).toMatch('2게임: 한 게임에는 스코어를 하나만')
    })

    it('복식은 네 자리', () => {
        const players: GamePlayerInput[] = [
            { team: 1, slot: 1, userId: 'me' }, { team: 1, slot: 2, userId: 'p' }, { team: 2, slot: 1, userId: 'x' }, { team: 2, slot: 2, name: '비회원', ntrp: 3 },
        ]
        expect(validateRecordInput({ ...base, matchType: 'men_doubles', games: [{ players, sets: [{ t1: 6, t2: 4, t1Ad: 2, t2Ad: 2 }] }] }, 'me')).toBeNull()
        expect(validateRecordInput({ ...base, matchType: 'men_doubles' }, 'me')).toMatch('1게임: 선수 자리')
    })

    it('공통 정보 — 날짜·시각·표면 필수, 길이·코트 번호·게임 수 범위', () => {
        expect(validateRecordInput({ ...base, playedAt: undefined }, 'me')).toMatch('날짜')
        expect(validateRecordInput({ ...base, playedTime: undefined }, 'me')).toMatch('시각')
        expect(validateRecordInput({ ...base, surface: undefined }, 'me')).toMatch('표면')
        expect(validateRecordInput({ ...base, durationMinutes: 10 }, 'me')).toMatch('종료')
        expect(validateRecordInput({ ...base, durationMinutes: undefined }, 'me')).toBeNull()
        expect(validateRecordInput({ ...base, courtNo: '12345678901' }, 'me')).toMatch('코트 번호')
        expect(validateRecordInput({ ...base, games: [] }, 'me')).toMatch('하나 이상')
        expect(validateRecordInput({ ...base, games: Array(13).fill(base.games[0]) }, 'me')).toMatch('12게임까지')
    })
})

describe('validateSets · cleanSets · seatsOf', () => {
    it('스코어는 정확히 하나', () => {
        expect(validateSets([{ t1: 6, t2: 4 }])).toBeNull()
        expect(validateSets([])).toMatch('스코어')
        expect(validateSets([{ t1: 6, t2: 4 }, { t1: 1, t2: 6 }])).toMatch('하나만')
        expect(validateSets([{ t1: 0, t2: 0 }])).toMatch('0:0')
        expect(validateSets([{ t1: 6.5, t2: 4 }])).toMatch('0~99')
        expect(validateSets([{ t1: NaN, t2: 4 }])).toMatch('0~99')
    })
    it('단식이면 애드 키를 버린다', () => {
        expect(cleanSets([{ t1: 6, t2: 4, t1Ad: 2, t2Ad: 2 }], 'singles')).toEqual([{ t1: 6, t2: 4 }])
        expect(cleanSets([{ t1: 6, t2: 4, t1Ad: 2, t2Ad: 2 }], 'men_doubles')).toEqual([{ t1: 6, t2: 4, t1Ad: 2, t2Ad: 2 }])
    })
    it('자리 — 단식 2, 복식 4', () => {
        expect(seatsOf('singles')).toHaveLength(2)
        expect(seatsOf('mixed_doubles')).toHaveLength(4)
    })
})
