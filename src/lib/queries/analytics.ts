import 'server-only'

import { toPersonalMatches } from '@/lib/games/perspective'
import { fetchUserGames } from '@/lib/queries/games'
import { explodePersonalMatchSets } from '@/lib/personal-matches/explode'
import { buildUserMap, extractUnifiedH2hIds } from '@/lib/queries/_shared'
import { aggregateByMatchType, toQuadStats, type QuadStats } from '@/lib/analytics/match-type'
import { buildHeadToHeadList } from '@/lib/analytics/head-to-head'
import type { UnifiedHeadToHead } from '@/lib/analytics/head-to-head'
import type { CourtSurface, Match, PersonalMatch, User } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'

// ── scope 타입 ────────────────────────────────────────────────────────────

export type AnalyticsScope =
    | { kind: 'total' }
    | { kind: 'personal' }
    | { kind: 'club'; clubId: string; clubName: string }

export type AnalyticsOptions = {
    scope: AnalyticsScope
    /**
     * 누구의 눈으로 읽는가(F-24). `self`(기본)는 본인 행을 RLS로, `public`은 타인의 **확정된** 개인 경기를
     * `get_public_personal_matches`(0090 — 통계 비공개·탈퇴면 빈 배열)로 읽는다. 클럽 매치는 public에서 읽지 않는다
     * (클럽은 동결이고, 타인의 클럽 대진표는 같은 클럽 승인 회원에게만 열린다).
     */
    source?: 'self' | 'public'
}

// ── 번들 타입 ─────────────────────────────────────────────────────────────

export type AnalyticsBundle = {
    stats: QuadStats
    h2hList: UnifiedHeadToHead[]
    // 카드 집계용 원본 (scope 적용 완료 상태)
    matches: Match[]
    // 아래 넷(matches 포함)은 클럽 대진표의 자리다 — 클럽이 없는 지금은 언제나 비어 있고, 집계 함수의 입력 모양만 지킨다
    gameMetaById: Record<string, { id: string; name: string; date: string; clubId: string }>
    courtSurfaceByMatchId: Record<string, CourtSurface | null>
    matchTimeById: Record<string, string | null>
    // 표시용 원본 (레코드 1건 = 카드 1개)
    personalMatches: PersonalMatch[]
    // 통계용 분해본 (세트 1개 = 게임 1개). 집계·레이팅 경로 전용
    personalGames: SettledPersonalMatch[]  // 통계·레이팅용 분해본(게임 1건 = 세트 1개 + winner)
    userMap: Map<string, User>
}

// ── 번들 fetch ────────────────────────────────────────────────────────────

export async function fetchAnalyticsBundle(userId: string, options: AnalyticsOptions): Promise<AnalyticsBundle> {
    // 0096 — 게임은 한 번만 저장되고 관점은 여기서 만든다. 본인·타인 모두 get_user_games(통계 비공개·탈퇴면 빈 배열)
    const filteredPersonalMatches = toPersonalMatches(await fetchUserGames(userId), userId)
    void options
    const matches: Match[] = []
    const gameMetaById: AnalyticsBundle['gameMetaById'] = {}
    const courtSurfaceByMatchId: AnalyticsBundle['courtSurfaceByMatchId'] = {}
    const matchTimeById: AnalyticsBundle['matchTimeById'] = {}

    // 통계용 분해본: 세트 1개 = 게임 1개 (집계·레이팅 경로 전용)
    const personalGames = explodePersonalMatchSets(filteredPersonalMatches)

    // 종합 통계: 순수함수 집계
    const matchTypeSummary = aggregateByMatchType(
        { matches, personalMatches: personalGames },
        userId,
    )
    const stats = toQuadStats(matchTypeSummary)

    // H2H 목록: 순수함수 집계
    const h2hList = buildHeadToHeadList(
        { matches, gameMetaById, personalMatches: personalGames },
        userId,
    )

    // userMap: H2H 상대 + 매치 참가자 + 개인 복식 파트너(파트너 추천 카드 이름 표시용)
    const partnerUserIds = filteredPersonalMatches.flatMap((pm) => (pm.partnerUserId ? [pm.partnerUserId] : []))
    const opponentUserIds = extractUnifiedH2hIds(h2hList)
    const userMap = await buildUserMap(matches, userId, [...opponentUserIds, ...partnerUserIds])

    return {
        stats,
        h2hList,
        matches,
        gameMetaById,
        courtSurfaceByMatchId,
        matchTimeById,
        personalMatches: filteredPersonalMatches,
        personalGames,
        userMap,
    }
}
