'use client'

import { Plus } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { DataList } from '@/components/common/data-list'
import { fieldMessageClass } from '@/components/common/field-class'
import { BoardRow, type BoardRowHost } from '@/components/matches/board/board-row'
import type { GameFormState } from '@/components/record/use-game-form'

const NONE: ReadonlySet<string> = new Set()

/**
 * 직접 기록의 **게임 줄** — 매칭룸 게임 보드와 같은 줄(`BoardRow`: 자리마다 선수 선택, 복식은 포/백 ⇄, 스코어)을 그대로 쓴다.
 * 다른 점은 셋: 스코어가 필수(예정 게임 없음) · 자동 대진표 없음 · 줄마다 저장하지 않고 폼의 [경기 저장] 한 번.
 * 줄 하나가 한 게임이고 저장하면 게임마다 전적에 따로 들어간다. [게임 추가]는 윗줄의 대진을 이어받는다.
 */
export function RecordGameRows({ s }: { s: GameFormState }) {
    const host: BoardRowHost = {
        pool: s.pool, loaded: [], editing: NONE, rowErrors: s.rowErrors, setSlot: s.setSlot, setScore: s.setScore, swapTeam: s.swapTeam,
    }
    return (
        <div className="space-y-3">
            {/* 폼은 좁은 자리라 늘 카드 모드다 — 열 제목 줄을 두지 않는다(첫 줄 위 구분선이 생기지 않게) */}
            <DataList>
                {s.rows.map((row, i) => (
                    <BoardRow
                        key={row.key} row={row} index={i} board={host} plannedTag={false} plain
                        actions={s.rows.length > 1 && (
                            <ActionButton size="sm" variant="danger" aria-label={`${i + 1}게임 삭제`} onClick={() => s.removeRow(row.key)}>삭제</ActionButton>
                        )}
                    />
                ))}
            </DataList>
            <ActionButton size="sm" disabled={!s.canAdd} onClick={s.addRow}>
                <Plus className="size-3.5" aria-hidden />게임 추가
            </ActionButton>
            <p className={fieldMessageClass()}>
                줄 하나가 한 게임입니다 — 저장하면 게임마다 전적에 따로 반영됩니다. 내가 뛴 게임이 하나 이상이면, 같은 참가자끼리 친 다른 게임도 함께 적을 수 있습니다.
            </p>
        </div>
    )
}
