'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { DataList } from '@/components/common/data-list'
import { FormActions } from '@/components/common/form-actions'
import { AutoLineupPanel } from '@/components/matches/board/auto-lineup-panel'
import { boardHead, BoardRow } from '@/components/matches/board/board-row'
import { BoardRowActions } from '@/components/matches/board/board-row-actions'
import { BoardEmptyState, BoardTools } from '@/components/matches/board/board-tools'
import { useMatchBoard } from '@/components/matches/board/use-match-board'
import { addMatchGuestAction } from '@/lib/actions/matches'
import type { PoolPlayer } from '@/lib/games/board'
import { countMine, isPlanned } from '@/lib/games/board'
import { TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'
import type { Game, MatchType } from '@/types'

type Props = {
    matchId: string
    matchType: MatchType
    durationMinutes: number
    games: Game[]
    /** 매칭 명단 — 대진에 넣을 수 있는 사람(회원(탈퇴 제외) + 명단의 비회원, 0108) */
    roster: PoolPlayer[]
    /** 확정된 매칭·참가자가 아닌 사람 — 같은 보드를 보기 모드로만(버튼·자동 대진표·저장 없음) */
    readOnly?: boolean
    /** 보는 사람의 선수 키(회원 = userId, 초대 화면의 비회원 = `guest:이름`) — 내 게임 줄을 강조하고 「내 게임 N」을 센다 */
    meKey?: string
}

/**
 * 매칭의 게임 보드 — **대진과 스코어를 한 장에서**. [자동 대진표]로 선수를 배치하고, 자리를 손으로 바꾸고,
 * 스코어만 넣는다. 스코어가 없는 게임은 「예정」이라 전적·통계에 들어가지 않는다.
 * 저장은 **게임마다**(줄의 [저장]) 또는 **한 번에**(아래 [모두 저장 (N)] — 바뀐 게임 전부). 스코어가 저장된 게임은 글자로 보이고
 * [수정]을 누르면 같은 자리에서 다시 입력 칸이 열린다(매칭 게임은 상세 수정 화면이 없다).
 * 참가자 누구나 고친다(기다리는 단계가 없다). 다른 참가자가 먼저 고친 게임은 저장 때 알려 준다.
 * 확정된 매칭·비참가자·초대 화면에는 **읽기 전용**으로 — 표는 팀을 한 덩어리로 묶고 스코어를 한가운데 둔 대칭형이다(`boardHead(…, true)`).
 * 내가 든 게임은 줄 배경과 이름으로 강조하고 제목 옆에 「내 게임 N」을 적는다.
 */
export function MatchGameBoard({ matchId, matchType, durationMinutes, games, roster, readOnly = false, meKey }: Props) {
    const router = useRouter()
    const board = useMatchBoard({ matchId, matchType, games, roster })
    // 자동 대진표 패널은 처음엔 닫혀 있다 — 열고 닫는 것은 [자동 대진표]와 패널의 [닫기]
    const [panel, setPanel] = useState(false)
    // 새 대진의 후보는 **명단에 있는 사람만** — 내보낸 회원·뺀 비회원은 이미 든 게임에만 남는다
    const rosterKeys = new Set(roster.map((m) => m.key))
    const lineupPool = board.pool.filter((p) => rosterKeys.has(p.key))
    const mine = countMine(board.rows, meKey)

    /** 보드의 [+ 비회원]도 참가자 표와 같은 문 — 명단에 넣고 새로 그린다(넣는 곳은 명단 하나) */
    async function addGuest(guest: PoolPlayer): Promise<string | null> {
        const result = await addMatchGuestAction(matchId, { name: guest.name, ntrp: guest.ntrp ?? 0, gender: guest.gender, hand: guest.hand })
        if (result.error) return result.error
        router.refresh()
        return null
    }

    return (
        <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-baseline gap-3">
                    <h2 className={TYPO.h3}>게임 {board.rows.length}</h2>
                    {mine > 0 && <span className={cn(TYPO.body2, 'tabular-nums')}>내 게임 {mine}</span>}
                </div>
                {!readOnly && <BoardTools panel={panel} onTogglePanel={() => setPanel((v) => !v)} onAddRow={board.addRow} />}
            </div>

            {panel && (
                <AutoLineupPanel
                    pool={lineupPool}
                    matchType={matchType}
                    durationMinutes={durationMinutes}
                    hasScored={board.rows.some((r) => !isPlanned(r))}
                    onApply={board.applyLineup}
                    onAddGuest={addGuest}
                    onClose={() => setPanel(false)}
                />
            )}

            {board.rows.length === 0 ? (
                !panel && <BoardEmptyState />
            ) : (
                <DataList head={boardHead(matchType !== 'singles', readOnly)}>
                    {board.rows.map((row, i) => (
                        <BoardRow
                            key={row.key} row={row} index={i} board={board} readOnly={readOnly} meKey={meKey}
                            actions={readOnly ? null : <BoardRowActions row={row} label={`${i + 1}게임`} board={board} />}
                        />
                    ))}
                </DataList>
            )}

            {board.error && <p role="alert" className={cn(TYPO.body2, 'text-destructive break-keep')}>{board.error}</p>}
            {board.changes > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                    <span className={TYPO.body2Muted}>저장하지 않은 변경 {board.changes}건</span>
                    <div className="w-full sm:w-auto">
                        <FormActions
                            submitLabel={`모두 저장 (${board.changes})`} cancelLabel="되돌리기" onSubmit={board.saveAll} onCancel={board.reset}
                            isPending={board.busy === 'all'} disabled={board.busy !== null}
                        />
                    </div>
                </div>
            )}
        </section>
    )
}
