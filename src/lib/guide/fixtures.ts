/**
 * 랜딩 콜라주의 더미 데이터 — 캡처 대신 **실제 카드 컴포넌트**를 이 값으로 그린다(테마·반응형이 공짜이고,
 * 카드가 바뀌면 타입 검사가 잡는다). 날짜는 고정값이다: 랜딩은 정적 프리렌더라 "오늘"을 쓰면 빌드 시각이 박힌다.
 */
import type { GameSession } from '@/lib/games/list'
import type { MatchListItem } from '@/lib/queries/matches'
import type { Game } from '@/types'

/** 콜라주의 '나' — 카드가 이 id를 보는 사람으로 삼아 승/패를 그린다 */
export const FIXTURE_VIEWER_ID = 'fixture-me'

export const FIXTURE_MATCHES: MatchListItem[] = [
    {
        id: 'fixture-match-1', hostId: FIXTURE_VIEWER_ID, title: '남복하실 남자 2명 모집중', matchType: 'men_doubles',
        playedAt: '2026-12-05', playedTime: '10:00', durationMinutes: 120, surface: 'hard', courtName: '올림픽공원 3번 코트',
        isListed: true, createdAt: '2026-11-25T00:00:00Z',
        hostName: '김서준', memberCount: 6, capacity: 8, joined: true, applied: false, hosted: true,
    },
    {
        id: 'fixture-match-2', hostId: 'fixture-host2', title: 'NTRP 3.0 이상 혼복 환영', matchType: 'mixed_doubles',
        playedAt: '2026-12-06', playedTime: '18:00', durationMinutes: 90, surface: 'clay', courtName: '장충 테니스장',
        isListed: true, closedAt: '2026-11-25T00:00:00Z', createdAt: '2026-11-25T00:00:00Z',
        hostName: '이하린', memberCount: 4, capacity: 4, joined: false, applied: false, hosted: false,
    },
]

export const FIXTURE_GAME: Game = {
    id: 'fixture-game-1', createdBy: FIXTURE_VIEWER_ID, matchType: 'singles', playedAt: '2026-11-22', playedTime: '09:00',
    durationMinutes: 120, surface: 'hard', courtName: '양재 시민의숲', sets: [{ t1: 6, t2: 4 }],
    players: [
        { team: 1, slot: 1, userId: FIXTURE_VIEWER_ID, name: '나' },
        { team: 2, slot: 1, userId: 'fixture-opp', name: '박도윤' },
    ],
    locked: true, createdAt: '2026-11-22T01:00:00Z',
}

/** 같은 자리에서 친 두 게임 — 경기 결과의 묶음 한 덩어리 */
export const FIXTURE_SESSION: GameSession = {
    key: 'fixture-session', kind: 'direct', playedAt: FIXTURE_GAME.playedAt, playedTime: FIXTURE_GAME.playedTime, durationMinutes: 120,
    courtName: FIXTURE_GAME.courtName, surface: 'hard', matchType: 'singles', role: 'direct',
    games: [FIXTURE_GAME, { ...FIXTURE_GAME, id: 'fixture-game-2', sets: [{ t1: 7, t2: 5 }], createdAt: '2026-11-22T01:00:01Z' }],
}
