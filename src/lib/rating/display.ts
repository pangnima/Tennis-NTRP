import { PROVISIONAL_THRESHOLD } from './constants'

// 잠정기 여부 (확정 경기 수가 임계 미만이면 아직 정착되지 않은 레이팅).
export function isProvisional(matchesPlayed: number): boolean {
    return matchesPlayed < PROVISIONAL_THRESHOLD
}

/**
 * 표시/분석에 쓸 유효 NTRP — 개인경기 기반 진화값(personalNtrp)이 있으면 그것을, 없으면 가입 시드(ntrp)를 쓴다.
 * 0/미설정(게스트)은 시드 그대로 반환.
 */
export function effectiveNtrp(u: { ntrp: number; personalNtrp?: number }): number {
    return u.personalNtrp != null && u.personalNtrp > 0 ? u.personalNtrp : u.ntrp
}

/**
 * NTRP·레이팅 숫자 표시 — 자릿수는 자리마다 다르다: 자가선언·스냅샷 1자리(「3.5」),
 * 홈·랭킹의 레이팅 2자리, 프로필 머리의 개인 레이팅 3자리.
 */
export function formatNtrp(value: number, digits = 1): string {
    return value.toFixed(digits)
}
