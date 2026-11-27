'use client'

import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import { deleteGameAction, setGameLockedAction } from '@/lib/actions/games'
import { TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/** matchId가 있으면 매칭 게임 — [수정]은 매칭 화면의 게임 보드로 간다(매칭 게임에는 상세 수정 화면이 없다) */
type Props = { gameId: string; matchId?: string; locked: boolean; canEdit: boolean; canLock: boolean }

/**
 * 행동 칸의 틀.
 *   · 표 모드: **세 칸 grid**(확정 │ 수정 │ 삭제). 버튼마다 자기 칸이 정해져 있어 버튼 수가 달라도 세로로 맞는다
 *   · 카드 모드: 둘째 줄의 오른쪽(왼쪽은 승패·스코어 — `GameRow`의 2열 grid), 순서는 수정 · 확정 · 삭제. 구분선은 없다
 */
const SLOT = cn(
    'flex items-center justify-end gap-1.5',
    '@4xl:grid @4xl:grid-cols-3 @4xl:gap-1',
)
/** 표 모드에서 버튼이 자기 칸을 꽉 채운다 — 세 버튼의 폭이 같아진다 */
const CELL = '@4xl:row-start-1 @4xl:w-full @4xl:px-0'
const WIDE = '@4xl:col-span-3 @4xl:justify-self-end'

/**
 * 게임 행의 행동 — [수정]·[삭제]는 잠기기 전 참가자 누구나, [확정]/[확정 취소]는 매칭 밖 게임을 기록한 사람만.
 * 잠긴 게임은 같은 칸에 [확정 취소](기록자) 또는 「확정됨」 표시(그 외)가 온다. 보조 행동이라 **sm(32px)**.
 * 자격은 서버가 계산해 넘긴다(`canEditGame`·`canLockGame` — DB 가드의 거울).
 */
export function GameCardActions({ gameId, matchId, locked, canEdit, canLock }: Props) {
    const router = useRouter()

    async function run(action: () => Promise<{ error: string | null }>): Promise<string | null> {
        const result = await action()
        if (!result.error) router.refresh()
        return result.error
    }

    if (locked) {
        return (
            <div className={SLOT}>
                {canLock ? (
                    <ConfirmButton
                        size="sm"
                        className={WIDE}
                        title="확정을 취소할까요?"
                        description="취소하면 참가자가 다시 스코어를 고칠 수 있습니다."
                        confirmLabel="확정 취소"
                        onConfirm={() => run(() => setGameLockedAction(gameId, false))}
                    >
                        확정 취소
                    </ConfirmButton>
                ) : (
                    <span className={cn(TYPO.captionStrong, 'inline-flex items-center gap-1', WIDE)}>
                        <Lock className="h-3 w-3" aria-hidden />확정됨
                    </span>
                )}
            </div>
        )
    }

    // 고칠 수 없는 남의 게임 — 표 모드에서는 빈 칸으로 열을 지키고, 카드 모드에서는 줄 자체를 그리지 않는다
    if (!canEdit && !canLock) return <div aria-hidden className="hidden @4xl:block" />

    return (
        <div className={SLOT}>
            {canEdit && (
                <ActionButton href={matchId ? `/matches/${matchId}` : `/games/${gameId}/edit`} size="sm" className={cn(CELL, '@4xl:col-start-2')}>수정</ActionButton>
            )}
            {canLock && (
                <ConfirmButton
                    size="sm"
                    className={cn(CELL, '@4xl:col-start-1')}
                    title="이 경기를 확정할까요?"
                    description="확정하면 아무도 스코어를 고치거나 지울 수 없습니다. 확정은 나중에 취소할 수 있습니다."
                    confirmLabel="확정"
                    onConfirm={() => run(() => setGameLockedAction(gameId, true))}
                >
                    확정
                </ConfirmButton>
            )}
            {canEdit && (
                <ConfirmButton
                    size="sm"
                    variant="danger"
                    className={cn(CELL, '@4xl:col-start-3')}
                    tone="destructive"
                    title="이 경기를 삭제할까요?"
                    description="참가한 회원 모두의 전적에서 사라지고, 되돌릴 수 없습니다."
                    confirmLabel="삭제"
                    onConfirm={() => run(() => deleteGameAction(gameId))}
                >
                    삭제
                </ConfirmButton>
            )}
        </div>
    )
}
