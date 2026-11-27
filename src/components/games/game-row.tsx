import { DeletedBadge } from '@/components/common/deleted-badge'
import { ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { GameCardActions } from '@/components/games/game-card-actions'
import { GameScoreChips } from '@/components/personal-matches/set-score-chips'
import { TYPO } from '@/lib/dashboard/tokens'
import { setsForSeat, viewSeat } from '@/lib/games/perspective'
import { canEditGame, canLockGame } from '@/lib/games/permissions'
import { resolveResultBadge } from '@/lib/personal-matches/result-badge'
import { cn } from '@/lib/utils'
import type { Game, GamePlayer } from '@/types'

/**
 * 표 모드의 열 — 게임 │ 대진 │ 결과 │ 스코어 │ 행동. 전부 고정 폭 또는 fr(행마다 독립 grid라 auto는 어긋난다).
 * 종목·구분·일시·경기장은 **묶음 머리**(`GameSessionBlock`)가 한 번만 말한다 — 같은 값이 줄마다 반복되지 않는다.
 */
export const GAME_COLS = '@4xl:grid-cols-[3.5rem_minmax(0,1fr)_4.5rem_5rem_9.5rem]'
export const GAME_HEAD = { cols: GAME_COLS, labels: ['게임', '대진', '결과', '스코어', ''] } as const

function TeamNames({ players, viewerId }: { players: GamePlayer[]; viewerId: string }) {
    return (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 @4xl:flex-nowrap">
            {players.map((p, i) => (
                <span key={`${p.team}-${p.slot}`} className="inline-flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground">·</span>}
                    <span className={p.userId === viewerId ? 'font-semibold' : undefined}>{p.userId === viewerId ? '나' : p.name}</span>
                    {!p.userId && <span className={cn(TYPO.micro, 'text-muted-foreground')}>비회원</span>}
                    {p.deleted && <DeletedBadge />}
                </span>
            ))}
        </span>
    )
}

type Props = { game: Game; index: number; viewerId: string }

/**
 * 게임 한 줄 = **스코어 하나**(0105). 묶음(`GameSessionBlock`) 안에서 그린다.
 *   · 표 모드: `n게임 │ 대진(+메모) │ 승/패 │ 스코어 │ 행동` 한 줄 · 카드 모드: n게임·대진 / 결과·스코어 / 행동 줄
 * 보는 사람이 뛴 게임은 그 사람 쪽이 왼쪽(승/패도 그 관점), 뛰지 않은 게임은 팀 1이 왼쪽이고 결과 칸을 비운다.
 * 왼쪽 띠가 승패 색이다. 값(이름·메모)은 기본색, 흐린 색은 구분 기호(`·`·`vs`)와 꼬리표에만.
 */
export function GameRow({ game, index, viewerId }: Props) {
    const seat = viewSeat(game, viewerId)
    const played = game.players.some((p) => p.userId === viewerId)
    const sets = setsForSeat(game, seat)
    const left = game.players.filter((p) => p.team === seat.team)
    const right = game.players.filter((p) => p.team !== seat.team)
    const badge = resolveResultBadge(sets)

    return (
        <article className={cn('relative flex flex-col gap-2 px-4 py-3 pl-5', ROW_GRID, ROW_PAD, ROW_BOX, GAME_COLS)}>
            <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', played ? badge.barClass : 'bg-border')} />

            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 @4xl:contents">
                <span className={cn(TYPO.body2, 'shrink-0 tabular-nums')}>{index + 1}게임</span>
                <div className="min-w-0 @4xl:flex @4xl:items-center @4xl:gap-3 @4xl:overflow-hidden">
                    <p className={cn(TYPO.body2Strong, 'flex flex-wrap items-center gap-x-2 gap-y-1 break-keep @4xl:shrink-0 @4xl:flex-nowrap @4xl:whitespace-nowrap')}>
                        <TeamNames players={left} viewerId={viewerId} />
                        <span className="font-normal text-muted-foreground">vs</span>
                        <TeamNames players={right} viewerId={viewerId} />
                    </p>
                    {game.notes && <p className={cn(TYPO.body2, 'min-w-0 break-keep @max-4xl:mt-1 @4xl:truncate')}>{game.notes}</p>}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 @4xl:contents">
                <span className="justify-self-start">
                    {played && <span className={cn('rounded-sm px-2 py-0.5 text-caption font-bold', badge.badgeClass)}>{badge.label}</span>}
                </span>
                <GameScoreChips sets={sets} />
            </div>

            <GameCardActions
                gameId={game.id}
                matchId={game.matchId}
                locked={game.locked}
                canEdit={canEditGame(game, viewerId)}
                canLock={canLockGame(game, viewerId)}
            />
        </article>
    )
}
