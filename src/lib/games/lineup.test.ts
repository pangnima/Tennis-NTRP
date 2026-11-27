import { describe, expect, it } from 'vitest'

import {
    LINEUP_MAX_GAMES,
    buildLineup,
    effectiveCourtCount,
    gamesForPerPlayer,
    recommendPerPlayer,
    summarizeLineup,
    toLineupPlayers,
    type LineupGame,
    type LineupPlayer,
} from './lineup'

// 옛 매칭 룸 자동 대진표(Week 40)의 테스트를 새 API로 옮겼다. 프리셋 비교는 프리셋을 없애 뺐다.

function p(key: string, gender: 'male' | 'female', ntrp: number, isMember = true): LineupPlayer {
    return { key, name: key, ntrp, gender, isMember }
}

const SIX = [p('a', 'male', 4.0), p('b', 'male', 3.5), p('c', 'male', 3.0), p('d', 'male', 2.5), p('e', 'male', 4.5), p('f', 'male', 2.0)]
const keysOf = (g: LineupGame) => [...g.team1, ...g.team2].map((x) => x.key)
const spread = (counts: Record<string, number>) => Math.max(...Object.values(counts)) - Math.min(...Object.values(counts))

describe('toLineupPlayers — 후보를 배치 대상으로', () => {
    it('NTRP는 화면에 보이는 값 — 개인 NTRP가 있으면 그것, 통계 비공개면 자가선언 값', () => {
        const [a, b, c] = toLineupPlayers([
            { key: 'a', name: 'A', ntrp: 3.0, personalNtrp: 4.2, isMember: true },
            { key: 'b', name: 'B', ntrp: 2.5, isMember: true },
            { key: 'c', name: 'C', ntrp: 3.0, personalNtrp: 4.2, statsHidden: true, isMember: true },
        ])
        expect([a.ntrp, b.ntrp, c.ntrp]).toEqual([4.2, 2.5, 3.0])
    })
    it('평점이 없으면 아는 사람들의 평균, 아무도 없으면 3.0', () => {
        const players = toLineupPlayers([
            { key: 'a', name: 'A', ntrp: 3.0, isMember: true },
            { key: 'b', name: 'B', ntrp: 4.0, isMember: true },
            { key: 'c', name: 'C', isMember: true },
        ])
        expect(players[2].ntrp).toBe(3.5)
        expect(toLineupPlayers([{ key: 'a', name: 'A', isMember: true }])[0].ntrp).toBe(3.0)
    })
    it('비회원 여부와 성별을 그대로 옮긴다', () => {
        const [guest] = toLineupPlayers([{ key: 'g', name: 'G', ntrp: 3.0, gender: 'female', isMember: false }])
        expect(guest.isMember).toBe(false)
        expect(guest.gender).toBe('female')
    })
})

describe('gamesForPerPlayer · effectiveCourtCount · recommendPerPlayer', () => {
    it('복식은 게임당 4자리, 단식은 2자리 — 반올림해 1~상한으로 묶는다', () => {
        expect(gamesForPerPlayer(4, 3, 'men_doubles')).toBe(3)
        expect(gamesForPerPlayer(6, 2, 'mixed_doubles')).toBe(3)
        expect(gamesForPerPlayer(4, 2, 'singles')).toBe(4)
        expect(gamesForPerPlayer(5, 2, 'men_doubles')).toBe(3)
        expect(gamesForPerPlayer(20, 6, 'men_doubles')).toBe(LINEUP_MAX_GAMES)
        expect(gamesForPerPlayer(0, 3, 'men_doubles')).toBe(0)
    })
    it('인원으로 돌릴 수 있는 면 수 — 11명 복식은 2면이 한계, 모자라도 1', () => {
        expect(effectiveCourtCount(11, 'men_doubles', 3)).toBe(2)
        expect(effectiveCourtCount(3, 'men_doubles', 2)).toBe(1)
        expect(effectiveCourtCount(4, 'singles', 4)).toBe(2)
    })
    it('권장값은 시간 안에 들어가는 가장 큰 1인당 게임 수 — 4명·120분·1면이면 4게임', () => {
        expect(recommendPerPlayer({ durationMinutes: 120, courts: 1, playerCount: 4, matchType: 'men_doubles' })).toBe(4)
        expect(recommendPerPlayer({ durationMinutes: 120, courts: 2, playerCount: 8, matchType: 'men_doubles' })).toBe(4)
        expect(recommendPerPlayer({ durationMinutes: 120, courts: 1, playerCount: 8, matchType: 'men_doubles' })).toBe(2)
        expect(recommendPerPlayer({ durationMinutes: 120, courts: 1, playerCount: 3, matchType: 'men_doubles' })).toBeNull()
    })
})

describe('buildLineup — 불변식', () => {
    const build = (seed = 1, games = 6) => buildLineup(SIX, { matchType: 'men_doubles', games, seed })

    it('한 게임에 같은 사람이 두 번 들어가지 않는다', () => {
        for (const g of build().games) expect(new Set(keysOf(g)).size).toBe(4)
    })
    it('출전 횟수 편차가 1을 넘지 않는다', () => {
        for (const games of [3, 5, 6, 9]) expect(spread(build(7, games).playCounts), `${games}게임`).toBeLessThanOrEqual(1)
    })
    it('쉬는 사람은 그 게임에 없는 참가자 전원이다', () => {
        const result = build()
        result.games.forEach((g, i) => {
            const playing = new Set(keysOf(g))
            expect(result.resting[i].sort()).toEqual(SIX.filter((x) => !playing.has(x.key)).map((x) => x.key).sort())
        })
    })
    it('요청한 게임 수만큼 만든다', () => expect(build(1, 5).games).toHaveLength(5))
    it('같은 파트너가 연달아 반복되지 않는다 — 6명 6게임이면 같은 짝은 많아야 한 번 더', () => {
        const seen = new Map<string, number>()
        for (const g of build(11).games) {
            for (const team of [g.team1, g.team2]) {
                const key = team.map((x) => x.key).sort().join('|')
                seen.set(key, (seen.get(key) ?? 0) + 1)
            }
        }
        expect(Math.max(...seen.values())).toBeLessThanOrEqual(2)
    })
})

describe('buildLineup — 시드', () => {
    const shape = (seed: number) => buildLineup(SIX, { matchType: 'men_doubles', games: 5, seed }).games.map((g) => keysOf(g).join('|'))
    it('같은 시드는 같은 대진', () => expect(shape(42)).toEqual(shape(42)))
    it('시드를 바꾸면 대진이 바뀐다 — [다시 뽑기]가 실제로 작동한다', () => {
        const base = JSON.stringify(shape(1))
        expect([2, 3, 4, 5, 6].some((s) => JSON.stringify(shape(s)) !== base)).toBe(true)
    })
})

describe('buildLineup — 성별은 선호다', () => {
    it('혼복인데 성비가 안 맞아도 사람을 빼지 않고 안내한다', () => {
        const result = buildLineup([p('m1', 'male', 3.5), p('m2', 'male', 3.0), p('m3', 'male', 4.0), p('f1', 'female', 3.0)], {
            matchType: 'mixed_doubles', games: 2, seed: 5,
        })
        expect(result.games).toHaveLength(2)
        expect(result.warnings.some((w) => w.includes('성별 구성'))).toBe(true)
    })
    it('성비가 맞으면 팀마다 1남 1녀', () => {
        const result = buildLineup([p('m1', 'male', 3.5), p('m2', 'male', 3.0), p('f1', 'female', 3.5), p('f2', 'female', 3.0)], {
            matchType: 'mixed_doubles', games: 3, seed: 9,
        })
        expect(result.warnings).toEqual([])
        for (const g of result.games) {
            for (const team of [g.team1, g.team2]) expect(team.filter((x) => x.gender === 'male')).toHaveLength(1)
        }
    })
})

describe('buildLineup — 회원과 만들 수 없는 경우', () => {
    it('인원이 모자라면 이유를 말한다', () => {
        const result = buildLineup(SIX.slice(0, 3), { matchType: 'men_doubles', games: 2, seed: 1 })
        expect(result.games).toEqual([])
        expect(result.warnings).toEqual(['남자 복식 대진에는 참가자가 4명 이상 필요합니다.'])
    })
    it('게임마다 회원이 한 명은 있다 — 회원이 1명이면 그 회원이 매 게임 선다', () => {
        const result = buildLineup([p('m1', 'male', 3.5), ...['g1', 'g2', 'g3', 'g4'].map((k) => p(k, 'male', 3.0, false))], {
            matchType: 'men_doubles', games: 4, seed: 1,
        })
        expect(result.games).toHaveLength(4)
        for (const g of result.games) expect(keysOf(g)).toContain('m1')
    })
    it('회원이 모자라 편차 규칙을 넘으면 알린다 — 회원 1명·비회원 5명이면 회원만 훨씬 자주 선다', () => {
        const result = buildLineup([p('m1', 'male', 3.5), ...['g1', 'g2', 'g3', 'g4', 'g5'].map((k) => p(k, 'male', 3.0, false))], {
            matchType: 'men_doubles', games: 6, seed: 1,
        })
        expect(result.playCounts.m1).toBe(6)
        expect(result.warnings.some((w) => w.includes('더 자주'))).toBe(true)
    })
    it('회원이 한 명도 없으면 만들지 않는다', () => {
        const result = buildLineup(['g1', 'g2', 'g3', 'g4'].map((k) => p(k, 'male', 3.0, false)), { matchType: 'men_doubles', games: 2, seed: 1 })
        expect(result.games).toEqual([])
        expect(result.warnings[0]).toContain('회원이 한 명은')
    })
    it('게임 수가 0이면 만들지 않고, 상한을 넘기면 상한까지만', () => {
        expect(buildLineup(SIX, { matchType: 'men_doubles', games: 0, seed: 1 }).warnings).toEqual(['게임 수를 1 이상으로 정해 주세요.'])
        const capped = buildLineup(SIX, { matchType: 'men_doubles', games: LINEUP_MAX_GAMES + 5, seed: 1 })
        expect(capped.games).toHaveLength(LINEUP_MAX_GAMES)
        expect(capped.warnings[0]).toContain(`${LINEUP_MAX_GAMES}개까지`)
    })
    it('단식은 1대1, 출전 편차 ≤ 1', () => {
        const result = buildLineup(SIX, { matchType: 'singles', games: 6, seed: 2 })
        for (const g of result.games) expect([g.team1.length, g.team2.length]).toEqual([1, 1])
        expect(spread(result.playCounts)).toBeLessThanOrEqual(1)
    })
})

describe('코트 면 수 — 한 라운드에 한 사람은 한 코트', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => p(`p${i}`, i % 2 === 0 ? 'male' : 'female', 2.5 + (i % 5) * 0.5))

    it('라운드(연속된 면 수만큼의 게임) 안에 같은 사람이 없다', () => {
        for (const courts of [2, 3]) {
            for (const n of [8, 9, 11, 12, 14]) {
                for (const seed of [1, 7, 99]) {
                    const { games } = buildLineup(many(n), { matchType: 'mixed_doubles', games: 12, seed, courts })
                    const c = effectiveCourtCount(n, 'mixed_doubles', courts)
                    for (let i = 0; i < games.length; i += c) {
                        const keys = games.slice(i, i + c).flatMap(keysOf)
                        expect(new Set(keys).size, `${n}명 ${courts}면 seed ${seed}`).toBe(keys.length)
                    }
                }
            }
        }
    })
    it('면 수 1은 면 수를 안 준 것과 같다', () => {
        const before = buildLineup(SIX, { matchType: 'men_doubles', games: 6, seed: 3 })
        const after = buildLineup(SIX, { matchType: 'men_doubles', games: 6, seed: 3, courts: 1 })
        expect(after.games.map(keysOf)).toEqual(before.games.map(keysOf))
    })
    it('인원이 모자라면 면을 다 못 쓴다고 알린다', () => {
        expect(buildLineup(many(11), { matchType: 'mixed_doubles', games: 8, seed: 1, courts: 3 }).warnings.some((w) => w.includes('2면'))).toBe(true)
    })
    it('다면에서도 출전 편차 ≤ 1', () => {
        for (const n of [8, 12]) {
            expect(spread(buildLineup(many(n), { matchType: 'mixed_doubles', games: n, seed: 5, courts: 2 }).playCounts), `${n}명`).toBeLessThanOrEqual(1)
        }
    })
})

describe('summarizeLineup — 손으로 고친 뒤 다시 세기', () => {
    it('빈 자리는 세지 않는다', () => {
        const players = SIX.slice(0, 4)
        const { playCounts, resting } = summarizeLineup([{ team1: [players[0], null], team2: [players[2], players[3]] }], players)
        expect(playCounts).toEqual({ a: 1, b: 0, c: 1, d: 1 })
        expect(resting).toEqual([['b']])
    })
})
