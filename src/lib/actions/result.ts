/**
 * 서버 액션의 결과 모양 하나 — 실패면 화면에 그대로 보일 문구, 성공이면 null(docs/design-system.md §8).
 * 문구는 RPC 오류 키를 사전(`lib/games/errors.ts`·`lib/auth/auth-error-messages.ts`)으로 바꾼 것이다.
 * 성공 뒤 더 돌려줄 것이 있으면 교차 타입으로 넓힌다(`ActionResult & { matchId?: string }`).
 */
export type ActionResult = { error: string | null }
