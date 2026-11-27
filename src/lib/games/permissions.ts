/** 게임 액션 자격 — DB `lock_editable_game`·`set_game_locked` 가드의 거울. 화면은 이 술어로 버튼을 그린다. */
import type { Game } from '@/types'

/**
 * 고치고 지울 수 있나: 잠기지 않았고, 그 게임의 회원 참가자 ∨ 작성자 ∨ 매칭 호스트 ∨ **그 매칭의 참가자**
 * (매칭 게임은 게임 보드에서 참가자 누구나 대진·스코어를 고친다 — 0098).
 */
export function canEditGame(game: Game, viewerId: string, match?: { hostId?: string; isMember?: boolean }): boolean {
    if (game.locked) return false
    return game.createdBy === viewerId
        || match?.hostId === viewerId
        || (!!game.matchId && match?.isMember === true)
        || game.players.some((p) => p.userId === viewerId)
}

/** 매칭 밖 게임의 [확정]/[확정 취소]는 기록한 사람만. 매칭 게임은 호스트가 매칭을 확정한다. */
export function canLockGame(game: Game, viewerId: string): boolean {
    return !game.matchId && game.createdBy === viewerId
}
