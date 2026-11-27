import 'server-only'

import { fetchUsersByIds } from '@/lib/queries/users'
import type { User } from '@/types'
import type { UnifiedHeadToHead } from '@/lib/analytics/head-to-head'

/** 회원 id 목록(본인·빈 값·중복 제외)으로 userMap을 구성한다 — fetchAnalyticsBundle이 쓴다. */
export async function buildUserMap(selfId: string, ids: string[]): Promise<Map<string, User>> {
    const userIds = new Set(ids.filter((id) => id && id !== selfId))
    const allUsers = await fetchUsersByIds([...userIds])
    return new Map(allUsers.map((u) => [u.id, u]))
}

/** UnifiedHeadToHead[] 에서 상대 userId 목록 추출 (null 제외) */
export function extractUnifiedH2hIds(h2hList: UnifiedHeadToHead[]): string[] {
    return h2hList.flatMap((e) => (e.opponentUserId ? [e.opponentUserId] : []))
}
