import { describe, expect, it } from 'vitest'

import type { Game, TennisMatch } from '@/types'

import {
    filterSessions, formatTally, gameOutcome, gameRole, groupGamesIntoSessions, groupSessionsByMonth, parseGameFilter, parseShown, sessionKey, sessionTally,
    sessionWhen, takeSessions,
} from './list'

type Opts = { doubles?: boolean; meTeam?: 1 | 2; matchId?: string; time?: string; court?: string; no?: string; duration?: number; createdAt?: string }
const game = (id: string, playedAt: string, t1: number, t2: number, o: Opts = {}): Game => {
    const meTeam = o.meTeam ?? 1
    return {
        id, createdBy: 'me', matchId: o.matchId, matchType: o.doubles ? 'men_doubles' : 'singles', playedAt, playedTime: o.time,
        durationMinutes: o.duration, courtName: o.court, courtNo: o.no, sets: [{ t1, t2 }],
        players: [{ team: meTeam, slot: 1, userId: 'me', name: '나' }, { team: meTeam === 1 ? 2 : 1, slot: 1, name: '상대' }],
        locked: false, createdAt: o.createdAt ?? id,
    }
}
const match = (id: string, hostId: string, over: Partial<TennisMatch> = {}): TennisMatch => ({
    id, hostId, title: `${id} 제목`, matchType: 'men_doubles', playedAt: '2026-11-26', playedTime: '20:00', durationMinutes: 120,
    courtName: '양재 시민의숲', courtNo: '3', surface: 'hard', capacity: 4, isListed: true, createdAt: '', ...over,
})

describe('gameOutcome — 한 게임의 승패(스코어 하나)', () => {
    it('내 팀 기준', () => {
        expect(gameOutcome(game('a', '2026-11-25', 6, 4), 'me')).toBe('win')
        expect(gameOutcome(game('a', '2026-11-25', 6, 4, { meTeam: 2 }), 'me')).toBe('loss')
        expect(gameOutcome(game('a', '2026-11-25', 5, 5), 'me')).toBe('draw')
    })
    it('뛰지 않은 게임은 null', () => expect(gameOutcome(game('a', '2026-11-25', 6, 4), 'other')).toBeNull())
})

describe('묶음 — 매칭 게임은 같은 매칭, 직접 기록은 같은 날짜·시각·코트·종목', () => {
    // 최신순으로 들어온다(get_user_games)
    const games = [
        game('m4', '2026-11-26', 7, 5, { doubles: true, matchId: 'm1', createdAt: '4' }),
        game('m3', '2026-11-26', 4, 6, { doubles: true, matchId: 'm1', createdAt: '3' }),
        game('m2', '2026-11-26', 6, 3, { doubles: true, matchId: 'm1', createdAt: '2' }),
        game('m1', '2026-11-26', 6, 4, { doubles: true, matchId: 'm1', createdAt: '1' }),
        game('d2', '2026-11-25', 2, 6, { time: '16:00', court: '목동 실내코트', duration: 90, createdAt: '6' }),
        game('d1', '2026-11-25', 6, 3, { time: '16:00', court: '목동실내코트', duration: 90, createdAt: '5' }),
        game('d3', '2026-11-25', 6, 0, { time: '16:00', court: '목동 실내코트', no: '2', createdAt: '7' }),
        game('g1', '2026-10-30', 6, 4, { matchId: 'm2', createdAt: '0' }),
    ]
    const matches = new Map([['m1', match('m1', 'me')], ['m2', match('m2', 'someone', { title: undefined, matchType: 'singles', playedAt: '2026-10-30' })]])
    const sessions = groupGamesIntoSessions(games, matches, new Set(['m1']))

    it('묶음은 최신순, 묶음 안은 1게임부터', () => {
        expect(sessions.map((s) => [s.key, s.games.map((g) => g.id)])).toEqual([
            ['m:m1', ['m1', 'm2', 'm3', 'm4']],
            ['d|2026-11-25|16:00|목동실내코트||singles', ['d1', 'd2']],
            ['d|2026-11-25|16:00|목동실내코트|2|singles', ['d3']],
            ['m:m2', ['g1']],
        ])
    })
    it('매칭 묶음은 매칭의 제목·일시·길이·코트 번호, 구분은 호스트/게스트', () => {
        expect(sessions[0]).toMatchObject({ kind: 'match', title: 'm1 제목', durationMinutes: 120, courtNo: '3', role: 'host' })
        expect(sessions[3]).toMatchObject({ role: 'guest', title: undefined })
        expect(sessions[1]).toMatchObject({ kind: 'direct', role: 'direct', durationMinutes: 90 })
    })
    it('일시 — 길이가 있으면 시작~종료, 없으면 시작만', () => {
        expect(sessionWhen(sessions[0])).toBe('11.26 (목) 20:00~22:00')
        expect(sessionWhen(sessions[1])).toBe('11.25 (수) 16:00~17:30')
        expect(sessionWhen(sessions[2])).toBe('11.25 (수) 16:00')
        expect(sessionWhen({ playedAt: '2026-11-25' })).toBe('11.25 (수)')
    })
    it('내 전적 — 「4게임 3승 1패」', () => {
        expect(formatTally(sessionTally(sessions[0], 'me'))).toBe('4게임 3승 1패')
        expect(formatTally(sessionTally(sessions[1], 'me'))).toBe('2게임 1승 1패')
        expect(formatTally(sessionTally(sessions[2], 'me'))).toBe('1게임 1승')
    })
    it('거르기 — 구분·종목은 묶음, 승패는 게임 단위(빈 묶음은 뺀다)', () => {
        const ids = (f: Partial<Parameters<typeof filterSessions>[2]>) =>
            filterSessions(sessions, 'me', { type: 'all', result: 'all', role: 'all', ...f }).map((s) => s.games.map((g) => g.id).join('+'))
        expect(ids({ role: 'host' })).toEqual(['m1+m2+m3+m4'])
        expect(ids({ role: 'direct' })).toEqual(['d1+d2', 'd3'])
        expect(ids({ type: 'doubles' })).toEqual(['m1+m2+m3+m4'])
        expect(ids({ result: 'loss' })).toEqual(['m3', 'd2'])
        expect(ids({ role: 'guest', result: 'loss' })).toEqual([])
    })
    it('월로 묶고 그 달의 내 전적을 센다', () => {
        expect(groupSessionsByMonth(sessions, 'me').map((g) => [g.label, g.sessions.length, formatTally(g.tally)])).toEqual([
            ['2026년 11월', 3, '7게임 5승 2패'], ['2026년 10월', 1, '1게임 1승'],
        ])
    })
    it('더 보기 — 앞의 묶음 n개만 그리고, 잘린 달의 전적은 그 달 전체, 남은 게임 수를 센다', () => {
        const months = groupSessionsByMonth(sessions, 'me')
        const cut = takeSessions(months, 2)
        expect(cut.groups.map((g) => [g.label, g.sessions.map((s) => s.key.slice(0, 4)), g.tally.games])).toEqual([['2026년 11월', ['m:m1', 'd|20'], 7]])
        expect(cut.restGames).toBe(2)
        expect(takeSessions(months, 3)).toMatchObject({ restGames: 1, groups: [{ key: '2026-11' }] })
        expect(takeSessions(months, 10)).toMatchObject({ restGames: 0, groups: [{ key: '2026-11' }, { key: '2026-10' }] })
        expect(takeSessions(months, 0)).toEqual({ groups: [], restGames: 8 })
    })
    it('parseShown — 주소의 값은 믿지 않는다', () => {
        expect(parseShown(undefined)).toBe(10)
        expect(parseShown('30')).toBe(30)
        expect([parseShown('3'), parseShown('-20'), parseShown('abc'), parseShown('1e3'), parseShown('')]).toEqual([10, 10, 10, 10, 10])
        expect(parseShown('999999')).toBe(5000)
    })
    it('매칭을 못 읽으면 게임의 값으로', () => {
        const [s] = groupGamesIntoSessions([games[0]], new Map(), new Set())
        expect(s).toMatchObject({ playedAt: '2026-11-26', role: 'guest', title: undefined, durationMinutes: undefined })
    })
})

describe('gameRole · sessionKey · parseGameFilter', () => {
    it('매칭이 없으면 직접 기록, 내가 호스트인 매칭이면 호스트, 아니면 게스트', () => {
        const hosted = new Set(['mine'])
        expect(gameRole(game('a', '2026-11-25', 6, 4, { matchId: 'mine' }), hosted)).toBe('host')
        expect(gameRole(game('a', '2026-11-25', 6, 4, { matchId: 'theirs' }), hosted)).toBe('guest')
        expect(gameRole(game('a', '2026-11-25', 6, 4), hosted)).toBe('direct')
    })
    it('직접 기록의 키 — 띄어쓰기만 다른 코트는 같은 묶음, 종목이 다르면 다른 묶음', () => {
        const ref = { playedAt: '2026-11-25', playedTime: '16:00:00', courtName: '양재 시민의숲', matchType: 'singles' as const }
        expect(sessionKey(ref)).toBe(sessionKey({ ...ref, playedTime: '16:00', courtName: '양재시민의숲' }))
        expect(sessionKey(ref)).not.toBe(sessionKey({ ...ref, matchType: 'men_doubles' }))
        expect(sessionKey({ ...ref, matchId: 'm9' })).toBe('m:m9')
    })
    it('주소의 모르는 값은 전체', () => {
        expect(parseGameFilter({ type: 'x', result: 'y', role: 'z' })).toEqual({ type: 'all', result: 'all', role: 'all' })
        expect(parseGameFilter({ type: 'doubles', result: 'win', role: 'direct' })).toEqual({ type: 'doubles', result: 'win', role: 'direct' })
    })
})

describe('묶음의 인원과 메모', () => {
    const withNotes = (g: Game, notes?: string, others: string[] = []): Game => ({
        ...g, notes, players: [...g.players, ...others.map((name, i) => ({ team: 2 as const, slot: 2 as const, userId: `u${i}-${name}`, name }))],
    })
    const games = [
        withNotes(game('m2', '2026-11-26', 6, 3, { doubles: true, matchId: 'm1', createdAt: '2' })),
        withNotes(game('m1', '2026-11-26', 4, 6, { doubles: true, matchId: 'm1', createdAt: '1' }), ' 2게임부터 바람 '),
        withNotes(game('d2', '2026-11-25', 2, 6, { time: '16:00', createdAt: '4' }), '서브가 잘 들어간 날', ['셋째']),
        withNotes(game('d1', '2026-11-25', 6, 3, { time: '16:00', createdAt: '3' }), '서브가 잘 들어간 날'),
        withNotes(game('x1', '2026-11-20', 6, 3, { matchId: 'gone', createdAt: '0' })),
    ]
    const matches = new Map([['m1', match('m1', 'me', { notes: '끝나고 식사' })]])
    const [m, d, x] = groupGamesIntoSessions(games, matches, new Set(['m1']), new Map([['m1', 6], ['gone', 0]]))

    it('인원 — 매칭은 명단, 직접 기록은 그 묶음의 서로 다른 선수, 명단을 못 읽으면 선수 수', () => {
        expect([m.people, d.people, x.people]).toEqual([6, 3, 2])
    })
    it('메모 — 매칭 메모 먼저, 게임 메모는 같은 글을 한 번만(앞뒤 공백 제거)', () => {
        expect(m.memos).toEqual(['끝나고 식사', '2게임부터 바람'])
        expect(d.memos).toEqual(['서브가 잘 들어간 날'])
        expect(x.memos).toEqual([])
    })
    it('승패로 게임을 걸러도 인원·메모는 그대로', () => {
        const [fm] = filterSessions([m], 'me', { type: 'all', result: 'win', role: 'all' })
        expect(fm).toMatchObject({ people: 6, memos: ['끝나고 식사', '2게임부터 바람'] })
        expect(fm.games.map((g) => g.id)).toEqual(['m2'])
    })
})
