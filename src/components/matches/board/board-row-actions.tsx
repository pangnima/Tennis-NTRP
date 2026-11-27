'use client'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import type { MatchBoard } from '@/components/matches/board/use-match-board'
import { isRowDirty, rowMode, type BoardRow } from '@/lib/games/board'

/**
 * 줄의 행동 — 한 줄에 **글자 버튼 둘**, 모두 sm(행동은 글자로 쓴다 — `docs/design-system.md §4`).
 *   보기(스코어 저장됨) = [수정] [삭제] · 편집 = [저장] [삭제] · [수정]을 누른 줄 = [저장] [취소]
 *   점수(저장된 예정 게임 — 선수는 글자, 점수 칸만) = 비어 있으면 [수정](선수 선택칸 열기) [삭제], 점수를 넣으면 [저장] [삭제]
 * [삭제]는 같은 말이되 **데이터가 있을 때만 묻는다**: 저장된 게임은 확인 팝업 뒤 바로 지우고, 저장 전 새 줄은 그냥 뺀다.
 */
export function BoardRowActions({ row, label, board }: { row: BoardRow; label: string; board: MatchBoard }) {
    const mode = rowMode(row, board.loaded, board.editing)
    const busy = board.busy === row.key || board.busy === 'all'
    const remove = row.id ? (
        <ConfirmButton
            size="sm" variant="danger" ariaLabel={`${label} 삭제`} tone="destructive" confirmLabel="삭제"
            title={`${label}을 삭제할까요?`} description="참가자 전적과 통계에서도 사라집니다."
            onConfirm={() => board.deleteRow(row)}
        >
            삭제
        </ConfirmButton>
    ) : (
        <ActionButton size="sm" variant="danger" aria-label={`${label} 삭제`} onClick={() => board.removeRow(row.key)}>삭제</ActionButton>
    )

    return (
        <div className="flex items-center gap-1">
            {mode === 'view' || (mode === 'score' && !isRowDirty(board.loaded, row)) ? (
                <ActionButton size="sm" aria-label={`${label} 수정`} onClick={() => board.startEdit(row.key)}>수정</ActionButton>
            ) : (
                <ActionButton
                    size="sm" variant="solid" aria-label={`${label} 저장`}
                    disabled={busy || (!!row.id && !isRowDirty(board.loaded, row))} onClick={() => board.saveRow(row)}
                >
                    {busy ? '저장 중' : '저장'}
                </ActionButton>
            )}
            {board.editing.has(row.key)
                // 테두리(outline) — 글자만(ghost)이면 보조색이라 꺼진 버튼처럼 읽힌다. 폼의 [저장][취소] 짝과 같은 모양
                ? <ActionButton size="sm" disabled={busy} onClick={() => board.cancelEdit(row.key)}>취소</ActionButton>
                : remove}
        </div>
    )
}
