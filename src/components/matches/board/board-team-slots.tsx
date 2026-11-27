'use client'

import { ArrowLeftRight, ArrowUpDown } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { BoardSlotSelect } from '@/components/matches/board/board-slot-select'
import { TYPO } from '@/lib/design/tokens'
import type { BoardRow, PoolPlayer } from '@/lib/games/board'
import { cn } from '@/lib/utils'

type SeatProps = {
    row: BoardRow
    pool: PoolPlayer[]
    /** 자리 index(절대 좌표 순서 — 복식 [팀1 포, 팀1 백, 팀2 포, 팀2 백]) */
    index: number
    /** 읽는 말 — 「1게임 팀 1 포핸드(듀스)」 */
    label: string
    onSlot: (index: number, key: string | null) => void
    /** 보기 모드 — 선택칸 자리에 이름 글자 */
    readOnly?: boolean
    /** 보기 모드에서 이 팀이 이겼다 — **굵은 이름 = 이긴 사람**(진 팀·무승부·예정은 보통 굵기) */
    winner?: boolean
    /** 좁은 칸(카드 모드) — 선택칸에 이름만 */
    compact?: boolean
    /** 보는 사람의 선수 키 — 보기 모드에서 **내 이름은 민트·굵게**(어느 게임에 내가 있는지 한눈에) */
    meKey?: string
    /** 글자 이름을 칸의 오른쪽에 붙인다 — 표의 포핸드 칸(같은 팀 두 이름이 ⇄ 칸을 사이에 두고 맞붙는다), 카드의 팀 2(카드 오른쪽 끝) */
    end?: boolean
}

/** 보기 모드의 이름 한 칸 — 나 = 민트·굵게 / 이긴 팀 = 굵게 / 그 밖 = 보통. `BoardTeamNames`(대칭형 표)도 같은 규칙을 읽는다 */
export function seatNameClass(me: boolean, winner: boolean): string {
    return me ? 'text-body2 font-semibold text-self' : winner ? 'text-body2 font-semibold text-foreground' : TYPO.body2
}

/** 자리 하나 — 편집이면 선수 선택칸, 보기면 이름. 표 모드와 카드 모드가 같은 조각을 다르게 놓는다 */
export function BoardSeat({ row, pool, index, label, onSlot, readOnly = false, winner = false, compact = false, meKey, end = false }: SeatProps) {
    if (readOnly) {
        return (
            <span className={cn(seatNameClass(meKey != null && row.slots[index] === meKey, winner), 'min-w-0 truncate', end && 'text-right')}>
                {pool.find((p) => p.key === row.slots[index])?.name ?? '-'}
            </span>
        )
    }
    return <BoardSlotSelect value={row.slots[index]} pool={pool} label={label} onChange={(k) => onSlot(index, k)} compact={compact} />
}

type SwapProps = {
    label: string
    team: 1 | 2
    onSwap: (team: 1 | 2) => void
    readOnly?: boolean
    /** 카드 모드 — 두 자리가 위아래로 놓여 있어 화살표도 위아래(⇅). 표 모드는 좌우(⇄) */
    vertical?: boolean
}

/**
 * 복식 팀의 포·백 맞바꾸기 — 아이콘이 곧 뜻인 자리라 **바꾸는 두 자리 사이에** 놓고, 화살표는 두 자리가 놓인 방향을 따른다
 * (표 = 좌우 ⇄, 카드 = 위아래 ⇅). 팀 이름 옆의 ⇄는 「팀 1 ↔ 팀 2」로 읽혔다(11-27 피드백).
 * 보기 모드에서는 같은 폭의 빈 칸(칸이 움직이지 않게).
 */
export function BoardSwapButton({ label, team, onSwap, readOnly = false, vertical = false }: SwapProps) {
    const Icon = vertical ? ArrowUpDown : ArrowLeftRight
    if (readOnly) return <span aria-hidden className="w-7" />
    return (
        <ActionButton size="xs" variant="ghost" square aria-label={`${label} 팀 ${team} 포·백 바꾸기`} onClick={() => onSwap(team)}>
            <Icon className="size-3.5" aria-hidden />
        </ActionButton>
    )
}

type Props = Omit<SeatProps, 'index' | 'label' | 'compact'> & {
    team: 1 | 2
    /** 「1게임」 — 읽는 말(aria-label)의 머리 */
    label: string
    onSwap: (team: 1 | 2) => void
}

/**
 * **표 모드**의 팀 하나 — 바깥 grid의 칸으로 풀린다: 복식은 `[포핸드 선수] ⇄ [백핸드 선수]`(첫 자리 = 포·듀스, 둘째 자리 = 백·애드),
 * 단식은 선수 하나. 「포」「백」 글자는 줄마다 반복하지 않고 열 제목이 한 번 말한다. 선수 칸은 고정 폭이라 표가 넓어져도 벌어지지 않는다.
 * 카드 모드(좁은 자리)는 팀을 좌우로 놓으려고 `BoardRow`가 `BoardSeat`·`BoardSwapButton`을 직접 놓는다.
 */
export function BoardTeamSlots({ row, pool, team, label, onSlot, onSwap, readOnly = false, winner = false, meKey }: Props) {
    const half = row.slots.length / 2
    const from = (team - 1) * half
    const seat = (at: number, name: string, end: boolean) => (
        <BoardSeat row={row} pool={pool} index={at} label={`${label} 팀 ${team} ${name}`} onSlot={onSlot} readOnly={readOnly} winner={winner} meKey={meKey} end={end} />
    )
    // 단식은 두 선수가 스코어를 사이에 두고 마주 본다(팀 1 = 오른쪽 정렬)
    if (half === 1) return seat(from, '선수', team === 1)
    // 복식은 **같은 팀끼리 붙인다** — 포 = 오른쪽 정렬, 백 = 왼쪽 정렬. 칸의 남는 폭이 바깥과 스코어 쪽으로 가 스코어 양옆에 여백이 생긴다
    return (
        <div className="contents">
            {seat(from, '포핸드(듀스)', true)}
            <BoardSwapButton label={label} team={team} onSwap={onSwap} readOnly={readOnly} />
            {seat(from + 1, '백핸드(애드)', false)}
        </div>
    )
}

/**
 * **읽기 전용 보드**(확정된 매칭·비참가자·초대 화면)의 팀 하나 — 이름을 「·」로 이은 한 덩어리(앞 = 포, 뒤 = 백).
 * 편집용 열(자리마다 칸 하나 + ⇄ + 버튼 칸)을 보기만 하는 표에 쓰면 이름이 넓게 흩어지고 스코어가 가운데에서 밀린다(11-27 피드백).
 * 팀 1은 스코어 쪽(오른쪽)으로 붙인다(`end`) — 스코어를 가운데 두고 두 팀이 마주 본다.
 */
export function BoardTeamNames({ row, pool, team, winner = false, meKey, end = false }: Pick<Props, 'row' | 'pool' | 'team' | 'winner' | 'meKey'> & { end?: boolean }) {
    const half = row.slots.length / 2
    const keys = row.slots.slice((team - 1) * half, team * half)
    return (
        <span className={cn('flex min-w-0 items-center gap-1.5', end && 'justify-end')}>
            {keys.map((key, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1.5">
                    {i > 0 && <span aria-hidden className="text-body2 text-muted-foreground">·</span>}
                    <span className={cn(seatNameClass(meKey != null && key === meKey, winner), 'min-w-0 truncate')}>
                        {pool.find((p) => p.key === key)?.name ?? '-'}
                    </span>
                </span>
            ))}
        </span>
    )
}
