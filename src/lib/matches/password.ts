/**
 * 비공개 매칭 비밀번호 규칙 — 4~20자, 공백 없음. DB `hash_match_password`의 거울이라 둘이 같은 말을 해야 한다
 * (폼은 저장 전에 알려 주고, DB는 마지막에 막는다). 숫자만일 필요는 없다.
 */
export const MATCH_PASSWORD_MIN = 4
export const MATCH_PASSWORD_MAX = 20

export function validateMatchPassword(value: string): string | null {
    if (value.length < MATCH_PASSWORD_MIN || value.length > MATCH_PASSWORD_MAX) {
        return `비밀번호는 ${MATCH_PASSWORD_MIN}~${MATCH_PASSWORD_MAX}자로 정해 주세요.`
    }
    if (/\s/.test(value)) return '비밀번호에는 공백을 넣을 수 없습니다.'
    return null
}
