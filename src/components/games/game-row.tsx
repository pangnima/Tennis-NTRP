import { DeletedBadge } from '@/components/common/deleted-badge'
import { ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { GameCardActions } from '@/components/games/game-card-actions'
import { GameScoreChips } from '@/components/personal-matches/set-score-chips'
import { TYPO } from '@/lib/dashboard/tokens'
import { setsForSeat, teamSides, viewSeat } from '@/lib/games/perspective'
import { canEditGame, canLockGame } from '@/lib/games/permissions'
import { resolveResultBadge } from '@/lib/personal-matches/result-badge'
import { cn } from '@/lib/utils'
import type { Game, GamePlayer } from '@/types'

/**
 * 표 모드의 열 — 게임 │ 대진 │ 결과 │ 스코어 │ 행동. 전부 고정 폭 또는 fr(행마다 독립 grid라 auto는 어긋난다).
 * 종목·구분·일시·경기장·메모는 **묶음 머리**(`GameSessionBlock`)가 한 번만 말한다 — 같은 값이 줄마다 반복되지 않는다.
 * 열 제목 줄은 없다 — 묶음마다 카드라 맨 위 한 줄이 아래와 이어지지 않고, 값(「1게임」·「승」·「6-3」)이 스스로 뜻을 말한다.
 */
const GAME_COLS = '@4xl:grid-cols-[3.5rem_minmax(0,1fr)_4.5rem_5rem_9.5rem]'

/** 포/백 이름표 — 값이 아니라 자리의 이름이라 보조색(micro 11px는 한 글자가 점처럼 보여 caption). 좁은 자리에서는 이름 넷으로 줄이 차서 숨긴다 */
const SIDE_TAG = cn(TYPO.caption, '@max-4xl:hidden')

/** 한 팀의 이름들. 복식에서 자리를 알면(`teamSides`) 포 → 백 순서로 세우고 이름 앞에 이름표를 단다 */
function TeamNames({ game, team, viewerId }: { game: Game; team: 1 | 2; viewerId: string }) {
    const sides = teamSides(game, team)
    const players = game.players.filter((p) => p.team === team)
    const ordered: GamePlayer[] = sides ? [...players].sort((a, b) => Number(a.slot === sides.back) - Number(b.slot === sides.back)) : players
    return (
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 @4xl:flex-nowrap">
            {ordered.map((p, i) => (
                <span key={`${p.team}-${p.slot}`} className="inline-flex items-center gap-1">
                    {i > 0 && <span className="text-muted-foreground">·</span>}
                    {sides && <span className={SIDE_TAG}>{p.slot === sides.back ? '백' : '포'}</span>}
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
 *   · 표 모드: `n게임 │ 대진(복식은 포·백 이름표) │ 승/패 │ 스코어 │ 행동` 한 줄
 *   · 카드 모드: **두 줄** — 1줄 `n게임 · 대진`, 2줄 `승/패 · 스코어 … 행동`(구분선 없이 같은 줄. 세 줄이던 때 한 게임이 135px였다)
 * 보는 사람이 뛴 게임은 그 사람 쪽이 왼쪽(승/패도 그 관점), 뛰지 않은 게임은 팀 1이 왼쪽이고 결과 칸을 비운다.
 * 왼쪽 띠가 승패 색이다. 값(이름)은 기본색, 흐린 색은 구분 기호(`·`·`vs`)와 꼬리표에만.
 */
export function GameRow({ game, index, viewerId }: Props) {
    const seat = viewSeat(game, viewerId)
    const played = game.players.some((p) => p.userId === viewerId)
    const sets = setsForSeat(game, seat)
    const otherTeam = seat.team === 1 ? 2 : 1
    const badge = resolveResultBadge(sets)

    return (
        <article
            className={cn(
                'relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5 pl-5',
                ROW_GRID, ROW_PAD, ROW_BOX, GAME_COLS,
            )}
        >
            <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', played ? badge.barClass : 'bg-border')} />

            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 @max-4xl:col-span-2 @4xl:contents">
                <span className={cn(TYPO.body2, 'shrink-0 tabular-nums')}>{index + 1}게임</span>
                <p className={cn(TYPO.body2Strong, 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 break-keep @4xl:flex-nowrap @4xl:overflow-hidden @4xl:whitespace-nowrap')}>
                    <TeamNames game={game} team={seat.team} viewerId={viewerId} />
                    <span className="font-normal text-muted-foreground">vs</span>
                    <TeamNames game={game} team={otherTeam} viewerId={viewerId} />
                </p>
            </div>

            <div className="flex items-center gap-2 @4xl:contents">
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
