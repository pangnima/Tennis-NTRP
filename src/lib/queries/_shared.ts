import 'server-only'

import { fetchUsersByIds } from '@/lib/queries/users'
import type { Match, User } from '@/types'
import type { UnifiedHeadToHead } from '@/lib/analytics/head-to-head'

/**
 * 매치 참가자 ID와 추가 ID 목록으로 userMap을 구성하는 공통 헬퍼.
 * fetchPlayerStatsBundle·fetchAnalyticsBundle 양쪽에서 사용.
 */
export async function buildUserMap(
    matches: Match[],
    selfId: string,
    extraIds: string[] = [],
): Promise<Map<string, User>> {
    const userIds = new Set<string>()

    for (const m of matches) {
        for (const id of [m.player1Id, m.player2Id, ...(m.team1 ?? []), ...(m.team2 ?? [])]) {
            if (id && id !== selfId) userIds.add(id)
        }
    }

    for (const id of extraIds) {
        if (id && id !== selfId) userIds.add(id)
    }

    const allUsers = await fetchUsersByIds([...userIds])
    return new Map(allUsers.map((u) => [u.id, u]))
}

/** UnifiedHeadToHead[] 에서 상대 userId 목록 추출 (null 제외) */
export function extractUnifiedH2hIds(h2hList: UnifiedHeadToHead[]): string[] {
    return h2hList.flatMap((e) => (e.opponentUserId ? [e.opponentUserId] : []))
}
