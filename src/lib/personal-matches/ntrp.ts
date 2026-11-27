import type { OpponentCandidate } from '@/lib/queries/users'

/**
 * 회원의 공개 NTRP (순수 모듈 — DB 접근 없음).
 *
 * 회원 자리의 NTRP는 사용자가 정하는 값이 아니라 그 회원의 프로필에서 파생된 값이다.
 * 게임을 저장할 때 DB(`insert_game_players`)도 같은 규칙으로 스냅샷을 채운다.
 */
export function derivePublicNtrp(
    c: Pick<OpponentCandidate, 'ntrp' | 'personalNtrp' | 'statsHidden'>,
): number | undefined {
    // 통계 비공개 회원은 동적 개인 NTRP를 감추고 자가선언 값만 쓴다
    const v = c.statsHidden ? c.ntrp : c.personalNtrp ?? c.ntrp
    if (v == null || !Number.isFinite(v) || v < 1 || v > 7) return undefined
    return v
}
