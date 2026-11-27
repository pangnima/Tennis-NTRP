/**
 * 게임 1행 → 보는 사람 관점.
 *
 * 0096부터 게임은 한 번만 저장되고(team/slot 절대 좌표), "나·파트너·상대"는 여기서 읽을 때 만든다 —
 * 옛 구조가 회원마다 관점 행을 복사해 두던 일을 이 순수 함수 하나가 대신한다. 결과 모양이 기존
 * `PersonalMatch`라서 통계(`lib/analytics`)·레이팅(`lib/rating`)·카드가 그대로 읽는다.
 *
 * 규칙: 내 팀 점수 = me, 상대 팀 점수 = opp. 상대1 = 상대 팀 slot 1, 상대2 = slot 2.
 * 애드: 내 팀 애드 slot이 내 slot이면 'me', 아니면 'partner' / 상대 팀 애드 slot 1 = 'opponent', 2 = 'opponent2'.
 */
import type { Game, GamePlayer, GameSet, PersonalMatch, PersonalMatchSetScore } from '@/types'

export function findSeat(game: Game, userId: string): GamePlayer | undefined {
    return game.players.find((p) => p.userId === userId)
}

function seatAt(game: Game, team: 1 | 2, slot: 1 | 2): GamePlayer | undefined {
    return game.players.find((p) => p.team === team && p.slot === slot)
}

/** 세트를 한 좌석의 관점으로. 단식이면 애드 키가 없다(저장 때 이미 버린다). */
export function setsForSeat(game: Game, seat: Pick<GamePlayer, 'team' | 'slot'>): PersonalMatchSetScore[] {
    return game.sets.map((s) => {
        const mine = seat.team === 1
        const out: PersonalMatchSetScore = { me: mine ? s.t1 : s.t2, opp: mine ? s.t2 : s.t1 }
        const myAd = mine ? s.t1Ad : s.t2Ad
        const oppAd = mine ? s.t2Ad : s.t1Ad
        if (myAd) out.myAd = myAd === seat.slot ? 'me' : 'partner'
        if (oppAd) out.oppAd = oppAd === 1 ? 'opponent' : 'opponent2'
        return out
    })
}

/** `setsForSeat`의 역 — 한 좌석의 눈으로 고친 스코어를 저장 좌표로 되돌린다(수정 폼). */
export function setsFromSeat(sets: PersonalMatchSetScore[], seat: Pick<GamePlayer, 'team' | 'slot'>, doubles: boolean): GameSet[] {
    const other = seat.slot === 1 ? 2 : 1
    return sets.map((s) => {
        const mine = seat.team === 1
        const out: GameSet = { t1: mine ? s.me : s.opp, t2: mine ? s.opp : s.me }
        if (!doubles) return out
        const myAd = s.myAd ? (s.myAd === 'me' ? seat.slot : other) : undefined
        const oppAd = s.oppAd ? (s.oppAd === 'opponent' ? 1 : 2) : undefined
        const t1Ad = mine ? myAd : oppAd
        const t2Ad = mine ? oppAd : myAd
        if (t1Ad) out.t1Ad = t1Ad
        if (t2Ad) out.t2Ad = t2Ad
        return out
    })
}

/**
 * 복식 한 팀의 포/백 자리 — 스코어의 애드 slot이 백(애드 코트), 나머지가 포(듀스 코트).
 * 단식·예정 게임·애드를 적지 않은 옛 기록은 null(화면은 이름표 없이 그린다).
 */
export function teamSides(game: Game, team: 1 | 2): { fore: 1 | 2; back: 1 | 2 } | null {
    if (game.matchType === 'singles') return null
    const back = team === 1 ? game.sets[0]?.t1Ad : game.sets[0]?.t2Ad
    if (!back) return null
    return { fore: back === 1 ? 2 : 1, back }
}

/** 화면이 게임을 그릴 기준 좌석 — 보는 사람이 뛰었으면 그 자리, 아니면 team1 slot1(제3자는 팀1 기준으로 읽는다). */
export function viewSeat(game: Game, viewerId: string): Pick<GamePlayer, 'team' | 'slot'> {
    return findSeat(game, viewerId) ?? { team: 1, slot: 1 }
}

/** 그 사람이 뛰지 않은 게임이면 null — 통계 재료에 섞이지 않게 호출부가 걸러 낸다. */
export function toPersonalMatch(game: Game, viewerId: string): PersonalMatch | null {
    const me = findSeat(game, viewerId)
    if (!me) return null
    const otherTeam = me.team === 1 ? 2 : 1
    const partner = seatAt(game, me.team, me.slot === 1 ? 2 : 1)
    const opp1 = seatAt(game, otherTeam, 1)
    const opp2 = seatAt(game, otherTeam, 2)

    return {
        id: game.id,
        userId: viewerId,
        opponentName: opp1?.name ?? '',
        opponentUserId: opp1?.userId,
        opponentDeleted: opp1?.deleted || undefined,
        opponentDominantHand: opp1?.hand,
        opponentNtrp: opp1?.ntrp,
        partnerUserId: partner?.userId,
        partnerName: partner?.name,
        partnerDeleted: partner?.deleted || undefined,
        partnerDominantHand: partner?.hand,
        partnerNtrp: partner?.ntrp,
        opponent2UserId: opp2?.userId,
        opponent2Name: opp2?.name,
        opponent2Deleted: opp2?.deleted || undefined,
        opponent2DominantHand: opp2?.hand,
        opponent2Ntrp: opp2?.ntrp,
        playedAt: game.playedAt,
        playedTime: game.playedTime,
        matchType: game.matchType,
        surface: game.surface,
        setScores: setsForSeat(game, me),
        notes: game.notes,
        courtName: game.courtName,
        createdAt: game.createdAt,
    }
}

export function toPersonalMatches(games: Game[], viewerId: string): PersonalMatch[] {
    return games.flatMap((g) => toPersonalMatch(g, viewerId) ?? [])
}
