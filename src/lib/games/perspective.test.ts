import { describe, expect, it } from 'vitest'

import type { Game, GamePlayer } from '@/types'

import { setsForSeat, setsFromSeat, toPersonalMatch, toPersonalMatches, viewSeat } from './perspective'

const player = (team: 1 | 2, slot: 1 | 2, id: string | undefined, name: string, extra: Partial<GamePlayer> = {}): GamePlayer =>
    ({ team, slot, userId: id, name, ...extra })

const doubles: Game = {
    id: 'g1',
    createdBy: 'a',
    matchType: 'men_doubles',
    playedAt: '2026-11-25',
    playedTime: '18:00',
    surface: 'hard',
    courtName: '올림픽공원',
    sets: [
        { t1: 6, t2: 4, t1Ad: 1, t2Ad: 2 },
        { t1: 3, t2: 6, t1Ad: 2 },
    ],
    players: [
        player(1, 1, 'a', '가', { ntrp: 3.1, hand: 'right' }),
        player(1, 2, 'b', '나', { ntrp: 3.2, hand: 'left' }),
        player(2, 1, 'c', '다', { ntrp: 3.3, hand: 'right' }),
        player(2, 2, undefined, '라(비회원)', { ntrp: 2.5, hand: 'left' }),
    ],
    locked: false,
    createdAt: '2026-11-25T09:00:00Z',
}

// 기대값은 옛 구조의 관점 변환(요청자 = 그대로 / 파트너 = 내 팀 애드만 뒤집기 / 상대 = 점수·애드 교차 / 상대2 = 둘 다)과
// 같다 — 재구축 때 옛 함수와 맞대어 한 번 확인했고(0096), 통계가 이 모양을 그대로 읽는다.
describe('setsForSeat — 좌석별 관점', () => {
    it('team1 slot1: 점수 그대로, 애드는 내 slot 기준', () => {
        expect(setsForSeat(doubles, { team: 1, slot: 1 })).toEqual([
            { me: 6, opp: 4, myAd: 'me', oppAd: 'opponent2' },
            { me: 3, opp: 6, myAd: 'partner' },
        ])
    })

    it('team1 slot2(파트너): 점수 그대로, myAd만 뒤집힌다', () => {
        expect(setsForSeat(doubles, { team: 1, slot: 2 })).toEqual([
            { me: 6, opp: 4, myAd: 'partner', oppAd: 'opponent2' },
            { me: 3, opp: 6, myAd: 'me' },
        ])
    })

    it('team2 slot1: 점수 반전, 상대 애드는 slot 1 = opponent', () => {
        expect(setsForSeat(doubles, { team: 2, slot: 1 })).toEqual([
            { me: 4, opp: 6, myAd: 'partner', oppAd: 'opponent' },
            { me: 6, opp: 3, oppAd: 'opponent2' },
        ])
    })

    it('team2 slot2: 점수 반전 + 내 팀 애드가 나', () => {
        expect(setsForSeat(doubles, { team: 2, slot: 2 })).toEqual([
            { me: 4, opp: 6, myAd: 'me', oppAd: 'opponent' },
            { me: 6, opp: 3, oppAd: 'opponent2' },
        ])
    })
})

describe('setsFromSeat — 수정 폼의 역변환', () => {
    it('네 좌석 모두 왕복하면 저장값 그대로', () => {
        for (const team of [1, 2] as const) {
            for (const slot of [1, 2] as const) {
                const seat = { team, slot }
                expect(setsFromSeat(setsForSeat(doubles, seat), seat, true)).toEqual(doubles.sets)
            }
        }
    })

    it('단식은 애드를 싣지 않는다', () => {
        expect(setsFromSeat([{ me: 4, opp: 6, myAd: 'me' }], { team: 2, slot: 1 }, false)).toEqual([{ t1: 6, t2: 4 }])
    })

    it('뛰지 않은 사람은 team1 기준으로 본다', () => {
        expect(viewSeat(doubles, 'zzz')).toEqual({ team: 1, slot: 1 })
        expect(viewSeat(doubles, 'c')).toMatchObject({ team: 2, slot: 1 })
    })
})

describe('toPersonalMatch', () => {
    it('team1 slot1 — 파트너·상대1·상대2와 스냅샷을 채운다', () => {
        const m = toPersonalMatch(doubles, 'a')
        expect(m).toMatchObject({
            id: 'g1', userId: 'a', matchType: 'men_doubles', playedAt: '2026-11-25', playedTime: '18:00',
            surface: 'hard', courtName: '올림픽공원',
            partnerUserId: 'b', partnerName: '나', partnerNtrp: 3.2,
            opponentUserId: 'c', opponentName: '다', opponentNtrp: 3.3, opponentDominantHand: 'right',
            opponent2Name: '라(비회원)', opponent2Ntrp: 2.5, opponent2DominantHand: 'left',
        })
        expect(m?.opponent2UserId).toBeUndefined()
    })

    it('team2 slot1 — 상대는 team1의 slot 순서', () => {
        const m = toPersonalMatch(doubles, 'c')
        expect(m).toMatchObject({
            partnerName: '라(비회원)', opponentUserId: 'a', opponent2UserId: 'b',
            setScores: [{ me: 4, opp: 6, myAd: 'partner', oppAd: 'opponent' }, { me: 6, opp: 3, oppAd: 'opponent2' }],
        })
    })

    it('단식 — 파트너·상대2가 없다', () => {
        const singles: Game = {
            ...doubles, id: 'g2', matchType: 'singles', sets: [{ t1: 6, t2: 2 }],
            players: [player(1, 1, 'a', '가'), player(2, 1, 'c', '다', { deleted: true })],
        }
        const m = toPersonalMatch(singles, 'c')
        expect(m).toMatchObject({ opponentUserId: 'a', opponentName: '가', setScores: [{ me: 2, opp: 6 }] })
        expect(m?.partnerName).toBeUndefined()
        expect(m?.opponent2Name).toBeUndefined()
        expect(toPersonalMatch(singles, 'a')?.opponentDeleted).toBe(true)
    })

    it('뛰지 않은 사람은 null, 목록 변환은 걸러 낸다', () => {
        expect(toPersonalMatch(doubles, 'zzz')).toBeNull()
        expect(toPersonalMatches([doubles], 'zzz')).toEqual([])
        expect(toPersonalMatches([doubles], 'b')).toHaveLength(1)
    })
})
