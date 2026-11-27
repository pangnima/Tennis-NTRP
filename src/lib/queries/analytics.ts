import 'server-only'

import { toPersonalMatches } from '@/lib/games/perspective'
import { fetchUserGames } from '@/lib/queries/games'
import { explodePersonalMatchSets } from '@/lib/personal-matches/explode'
import { buildUserMap, extractUnifiedH2hIds } from '@/lib/queries/_shared'
import { aggregateByMatchType, toQuadStats, type QuadStats } from '@/lib/analytics/match-type'
import { buildHeadToHeadList } from '@/lib/analytics/head-to-head'
import type { UnifiedHeadToHead } from '@/lib/analytics/head-to-head'
import type { PersonalMatch, User } from '@/types'
import type { SettledPersonalMatch } from '@/lib/personal-matches/winner'

// ── 번들 타입 ─────────────────────────────────────────────────────────────

export type AnalyticsBundle = {
    stats: QuadStats
    h2hList: UnifiedHeadToHead[]
    // 표시용 원본 (레코드 1건 = 카드 1개)
    personalMatches: PersonalMatch[]
    // 통계·레이팅용 분해본(게임 1건 = 세트 1개 + winner). 집계 함수는 전부 이것을 읽는다
    personalGames: SettledPersonalMatch[]
    userMap: Map<string, User>
}

// ── 번들 fetch ────────────────────────────────────────────────────────────

export async function fetchAnalyticsBundle(userId: string): Promise<AnalyticsBundle> {
    // 0096 — 게임은 한 번만 저장되고 관점은 여기서 만든다. 본인·타인 모두 get_user_games(통계 비공개·탈퇴면 빈 배열)
    const personalMatches = toPersonalMatches(await fetchUserGames(userId), userId)

    // 통계용 분해본: 세트 1개 = 게임 1개 (집계·레이팅 경로 전용)
    const personalGames = explodePersonalMatchSets(personalMatches)

    // 종합 통계 · H2H 목록: 순수함수 집계
    const stats = toQuadStats(aggregateByMatchType({ personalMatches: personalGames }))
    const h2hList = buildHeadToHeadList({ personalMatches: personalGames })

    // userMap: H2H 상대 + 복식 파트너(파트너 추천 카드 이름 표시용)
    const partnerUserIds = personalMatches.flatMap((pm) => (pm.partnerUserId ? [pm.partnerUserId] : []))
    const opponentUserIds = extractUnifiedH2hIds(h2hList)
    const userMap = await buildUserMap(userId, [...opponentUserIds, ...partnerUserIds])

    return { stats, h2hList, personalMatches, personalGames, userMap }
}
