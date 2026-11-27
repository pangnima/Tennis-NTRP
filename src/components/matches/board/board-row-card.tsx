'use client'

import type { ReactNode } from 'react'

import { BoardSeat, BoardSwapButton } from '@/components/matches/board/board-team-slots'
import { TYPO } from '@/lib/design/tokens'
import type { BoardRow, PoolPlayer } from '@/lib/games/board'
import { cn } from '@/lib/utils'

/** 칸 사이 4px — 390px 화면의 복식에서 선택칸이 이름(「남자10」·세 글자 이름)을 다 보이려면 86px쯤이 필요하다 */
const GRID = 'grid items-center gap-x-1 gap-y-2'
const DOUBLES = 'grid-cols-[1rem_minmax(0,1fr)_minmax(4rem,auto)_minmax(0,1fr)]'
const SINGLES = 'grid-cols-[minmax(0,1fr)_minmax(4rem,auto)_minmax(0,1fr)]'
const LABEL = cn(TYPO.label, 'text-center')

type Props = {
    row: BoardRow
    pool: PoolPlayer[]
    /** 「1게임」 — 읽는 말(aria-label)의 머리 */
    label: string
    /** 보기 모드(스코어가 저장된 게임·읽기 전용 보드) */
    view: boolean
    winner: 1 | 2 | null
    /** 가운데 스코어 칸(`BoardScoreInput`의 좁은 판 — 표 모드와 같은 조각) */
    score: ReactNode
    onSlot: (index: number, key: string | null) => void
    onSwap: (team: 1 | 2) => void
    /** 보는 사람의 선수 키 — 보기 모드에서 내 이름을 강조한다 */
    meKey?: string
}

/**
 * 카드 모드(좁은 자리 — 모바일·직접 기록 폼)의 대진 — **팀 1 │ 스코어 │ 팀 2**(좌우). 경기 결과의 한 줄
 * (「나·남자02 vs 남자03·남자04 6:4」)과 같은 방향으로 읽힌다. 예전에는 팀을 위아래로 쌓은 점수판형이라
 * "보통은 좌우로 팀을 가른다"는 피드백을 받았다(11-26).
 *   · 단식: `[선수] 6 : 4 [선수]` 한 줄
 *   · 복식: 팀 안에서 위 = 포핸드 · 아래 = 백핸드 — 맨 왼쪽 「포」「백」 이름표가 두 팀의 줄을 함께 가리키고,
 *     스코어는 세로 가운데. 자리 바꾸기는 **두 선수 칸 사이의 [⇅]**(바꾸는 두 자리 사이에 있어야 무엇을 바꾸는지 읽힌다 —
 *     팀 이름 옆에 ⇄를 뒀더니 「팀 1 ↔ 팀 2」로 읽혔다, 11-27). 보기 모드에는 그 줄이 없다
 */
export function BoardRowCard({ row, pool, label, view, winner, score, onSlot, onSwap, meKey }: Props) {
    const doubles = row.slots.length === 4
    const seat = (team: 1 | 2, pos: 0 | 1, name: string) => (
        <BoardSeat
            row={row} pool={pool} index={(team - 1) * (row.slots.length / 2) + pos} label={`${label} 팀 ${team} ${name}`}
            onSlot={onSlot} readOnly={view} winner={winner === team} meKey={meKey} compact end={team === 2}
        />
    )
    // 팀 2는 카드의 오른쪽 끝에 붙인다 — 양끝에 팀, 가운데 스코어(왼쪽 정렬이면 스코어에 붙고 오른쪽이 빈다, 11-27 피드백)
    const teamHead = (team: 1 | 2) => <span className={cn(TYPO.label, team === 2 && 'text-right')}>팀 {team}</span>
    const swap = (team: 1 | 2) => (
        <span className="flex justify-center"><BoardSwapButton label={label} team={team} onSwap={onSwap} vertical /></span>
    )

    return (
        <div className={cn(GRID, doubles ? DOUBLES : SINGLES, doubles && !view && 'gap-y-0.5')}>
            {doubles && <span />}
            {teamHead(1)}<span className={LABEL}>스코어</span>{teamHead(2)}
            {doubles ? (
                <>
                    <span className={LABEL}>포</span>{seat(1, 0, '포핸드(듀스)')}
                    <div className={cn('self-center text-center', view ? 'row-span-2' : 'row-span-3')}>{score}</div>
                    {seat(2, 0, '포핸드(듀스)')}
                    {!view && <><span />{swap(1)}{swap(2)}</>}
                    <span className={LABEL}>백</span>{seat(1, 1, '백핸드(애드)')}{seat(2, 1, '백핸드(애드)')}
                </>
            ) : (
                <>{seat(1, 0, '선수')}{score}{seat(2, 0, '선수')}</>
            )}
        </div>
    )
}
