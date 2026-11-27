'use client'

import type { ReactNode } from 'react'

import { ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { BoardRowCard } from '@/components/matches/board/board-row-card'
import { BoardScoreInput } from '@/components/matches/board/board-score-input'
import { BoardTeamNames, BoardTeamSlots } from '@/components/matches/board/board-team-slots'
import type { MatchBoard } from '@/components/matches/board/use-match-board'
import { isPlanned, rowMode, rowWinner, type BoardRow as Row } from '@/lib/games/board'
import { TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/**
 * 표 모드의 열 — 선수 자리마다 칸 하나라 칸 제목이 「포핸드」「백핸드」를 말한다.
 * 스코어 왼쪽 두 칸이 팀 1, 오른쪽 두 칸이 팀 2. [⇄]·스코어·행동 칸은 고정 폭(행마다 독립 grid라 auto면 칸이 어긋난다).
 * 행동 칸 7rem = sm 글자 버튼 둘([저장 중][삭제]). 읽기 전용 보드(확정·비참가자)도 ⇄·행동 칸을 비워 둔 채 같은 열을 쓴다 —
 * 확정해도 이름·스코어 자리가 그대로다(참가자 표가 확정 뒤 빈 행동 칸을 두는 것과 같다).
 */
// **선수 칸은 고정 폭**(8rem, 좁은 표에서는 줄어든다)이고 남는 폭은 양끝의 여백 칸(1fr)이 받는다 — 선수 칸이 1fr이던 때는
// 표가 넓을수록 이름이 벌어졌다(11-27 피드백). 같은 팀 두 이름은 ⇄ 칸을 사이에 두고 맞붙고(포 = 오른쪽·백 = 왼쪽 정렬), 스코어 양옆이 빈다.
const DOUBLES_COLS = '@4xl:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,8rem)_1.75rem_minmax(0,8rem)_7rem_minmax(0,8rem)_1.75rem_minmax(0,8rem)_minmax(0,1fr)_7rem]'
const SINGLES_COLS = '@4xl:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,10rem)_7rem_minmax(0,10rem)_minmax(0,1fr)_7rem]'
/**
 * **읽기 전용 보드**(확정된 매칭·비참가자·초대 화면)의 열 — `게임 │ 팀 1(오른쪽 정렬) │ 스코어 │ 팀 2 │ (게임 칸과 같은 폭의 빈 칸)`.
 * 양끝이 같은 폭이라 스코어가 표의 한가운데에 서고 두 팀이 마주 본다. 고치는 보드는 보기 줄과 편집 줄이 한 표에 섞여
 * 열이 같아야 하므로 위의 편집용 열을 그대로 쓴다.
 */
const VIEW_COLS = '@4xl:grid-cols-[3.5rem_minmax(0,1fr)_7rem_minmax(0,1fr)_3.5rem]'
/** 스코어 칸 제목은 가운데 — 콜론이 칸 한가운데에 서므로 */
const SCORE_HEAD = { label: '스코어', className: 'text-center' }

export function boardHead(doubles: boolean, readOnly = false) {
    if (readOnly) return { cols: VIEW_COLS, labels: ['게임', { label: '팀 1', className: 'text-right' }, SCORE_HEAD, '팀 2', ''] }
    // 열 제목도 이름과 같은 정렬 — 포핸드 오른쪽 · 백핸드 왼쪽(같은 팀이 붙는다). 양끝의 여백 칸은 빈 제목
    const right = (label: string) => ({ label, className: 'text-right' })
    return doubles
        ? { cols: DOUBLES_COLS, labels: ['게임', '', right('포핸드'), '', '백핸드', SCORE_HEAD, right('포핸드'), '', '백핸드', '', ''] }
        : { cols: SINGLES_COLS, labels: ['게임', '', right('선수'), SCORE_HEAD, '선수', '', ''] }
}

/** 줄이 읽는 보드의 부분 — 매칭 보드(`useMatchBoard`)와 직접 기록 폼(`useGameForm`)이 같은 줄을 쓴다 */
export type BoardRowHost = Pick<MatchBoard, 'pool' | 'loaded' | 'editing' | 'rowErrors' | 'setSlot' | 'setScore' | 'swapTeam'>

type Props = {
    row: Row
    index: number
    board: BoardRowHost
    readOnly?: boolean
    /** 줄의 행동 — 매칭 보드는 [저장]/[수정]·[삭제], 직접 기록 폼은 [삭제]만. 없으면 칸만 비운다 */
    actions?: ReactNode
    /** 스코어가 빈 줄에 「예정」 꼬리표 — 직접 기록 폼은 끈다(예정 게임이 없다) */
    plannedTag?: boolean
    /** 카드 모드에서 테두리·안쪽 여백 없는 줄(줄 사이 구분선) — 이미 카드 안인 직접 기록 폼. 폭을 되찾고 카드 속 카드를 피한다 */
    plain?: boolean
    /** 보는 사람의 선수 키 — 보기 모드의 내 이름을 민트·굵게. 줄 배경은 칠하지 않는다(전 게임에 뛰면 표 전체가 칠해진다 — 11-27 피드백) */
    meKey?: string
}

/**
 * 보드의 한 줄 = 한 게임. 같은 상태를 두 모양(표·카드)으로, 두 모드(편집·보기)로 그린다 — **팀은 어느 모양에서나 좌우**다.
 *   · 표(넓은 자리): `게임 │ 포핸드 │ ⇄ │ 백핸드 │ 6 : 4 │ 포핸드 │ ⇄ │ 백핸드 │ 행동`
 *   · 카드(좁은 자리 — 모바일·직접 기록 폼): `팀 1 │ 6 : 4 │ 팀 2`(`BoardRowCard`)
 *   · 읽기 전용 보드의 표: `게임 │ 남자08 · 여자01 │ 6 : 4 │ 김아무개 · 손님 │` — 팀을 한 덩어리로, 스코어를 한가운데에(`VIEW_COLS`)
 *   · 모드는 셋(`rowMode`): 보기 / **점수**(저장된 예정 게임 — 선수는 글자, 점수 칸만 열림) / 편집. 자리와 점수가 따로 열린다
 *   · 보기 = 스코어가 저장된 게임(읽기 전용 보드는 전부) — 이긴 팀 이름은 굵게, 이긴 숫자는 승 색. 편집 = 새 줄·예정 게임·[수정] 중
 */
export function BoardRow({ row, index, board, readOnly = false, actions = null, plannedTag = true, plain = false, meKey }: Props) {
    const label = `${index + 1}게임`
    const doubles = row.slots.length === 4
    const mode = readOnly ? 'view' : rowMode(row, board.loaded, board.editing)
    // 자리(선수)와 점수는 따로 열린다 — 저장된 예정 게임(`score`)은 선수가 글자이고 점수 칸만 열려 있다
    const seatsFixed = mode !== 'edit'
    const view = mode === 'view'
    const winner = view ? rowWinner(row) : null
    const onSlot = (i: number, k: string | null) => board.setSlot(row.key, i, k)
    const onSwap = (t: 1 | 2) => board.swapTeam(row.key, t)
    const score = (compact: boolean) => (
        <BoardScoreInput
            scores={row.scores} label={label} readOnly={view} compact={compact}
            onChange={(set, side, value) => board.setScore(row.key, set, side, value)}
        />
    )
    const team = (t: 1 | 2) => (
        <BoardTeamSlots row={row} pool={board.pool} team={t} label={label} readOnly={seatsFixed} winner={winner === t} onSlot={onSlot} onSwap={onSwap} meKey={meKey} />
    )
    const names = (t: 1 | 2) => <BoardTeamNames row={row} pool={board.pool} team={t} winner={winner === t} meKey={meKey} end={t === 1} />
    const error = board.rowErrors[row.key]
    const below = cn('pb-3 @4xl:px-5 @max-4xl:pt-2', !plain && 'px-4')

    return (
        <div className={cn(plain && 'border-t border-border pt-3 first:border-t-0 first:pt-0')}>
            <div className={cn('space-y-2 @4xl:hidden', !plain && 'rounded-lg border border-border bg-card p-4')}>
                <div className="flex min-h-8 items-center justify-between gap-2">
                    <span className={cn(TYPO.body2Strong, 'tabular-nums')}>
                        {label}
                        {plannedTag && isPlanned(row) && <span className="ml-1.5 text-caption font-normal text-muted-foreground">예정</span>}
                    </span>
                    {actions}
                </div>
                <BoardRowCard row={row} pool={board.pool} label={label} view={seatsFixed} winner={winner} score={score(true)} onSlot={onSlot} onSwap={onSwap} meKey={meKey} />
            </div>
            <div className={cn('hidden', ROW_GRID, ROW_PAD, ROW_BOX, readOnly ? VIEW_COLS : doubles ? DOUBLES_COLS : SINGLES_COLS)}>
                <span className={cn(TYPO.body2Strong, 'tabular-nums')}>{label}</span>
                {readOnly ? <>{names(1)}{score(false)}{names(2)}</> : <><span />{team(1)}{score(false)}{team(2)}<span /></>}
                {actions && <div className="justify-self-end">{actions}</div>}
            </div>
            {view && row.memo && (
                <p className={cn('truncate text-caption text-foreground', below)}>
                    <span className="text-muted-foreground">메모 </span>{row.memo}
                </p>
            )}
            {error && <p role="alert" className={cn(TYPO.caption, 'text-destructive break-keep', below)}>{error}</p>}
        </div>
    )
}
