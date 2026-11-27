import Link from 'next/link'

import { GameHistory } from '@/components/games/game-history'
import { GameRow } from '@/components/games/game-row'
import { getMatchTypeBadgeClass, MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { ROLE_LABEL, rolePillClass } from '@/lib/dashboard/member-badges'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import { PILL_BASE, TEXT_LINK, TYPO } from '@/lib/dashboard/tokens'
import type { GameEdit } from '@/lib/games/history'
import { formatTally, sessionTally, sessionWhen, type GameSession } from '@/lib/games/list'
import { formatCourt } from '@/lib/matches/court'
import { cn } from '@/lib/utils'

/** 카드 모드 전용 — 묶음 하나가 카드 한 장. 표 모드에서는 `DataList`가 테두리와 구분선을 맡는다 */
const CARD_ONLY = '@max-4xl:overflow-hidden @max-4xl:rounded-lg @max-4xl:border @max-4xl:border-border @max-4xl:bg-card'

type Props = {
    session: GameSession
    viewerId: string
    /** 이 묶음의 수정 기록(오래된 것부터) — 없으면 아코디언을 그리지 않는다 */
    edits?: GameEdit[]
}

/**
 * 게임 **묶음** — 같은 자리에서 친 게임들(매칭 게임 = 같은 매칭, 직접 기록 = 같은 날짜·시각·코트·종목).
 * `DataList` 안에서 그린다.
 *   · 머리 줄: 일시(「11.26 (목) 20:00~22:00」) · 경기장 · [종목][구분] · 매칭 제목(누르면 그 매칭) · 내 전적(「4게임 3승 1패」)
 *   · 게임 줄(`GameRow`): 1게임부터 · 맨 아래 「수정 기록 N」 아코디언
 * 공통 정보는 머리 줄이 한 번만 말한다. 표 모드에서는 한 표 안의 줄들, 카드 모드에서는 묶음 하나가 카드 한 장이다.
 */
export function GameSessionBlock({ session, viewerId, edits = [] }: Props) {
    const place = [formatCourt(session.courtName, session.courtNo), session.surface && SURFACE_LABELS[session.surface]].filter(Boolean).join(' · ')
    return (
        <section className={cn('divide-y divide-border', CARD_ONLY)}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-muted/30 px-4 py-2.5 @4xl:px-5">
                <span className={cn(TYPO.body2Strong, 'tabular-nums')}>{sessionWhen(session)}</span>
                {place && <span className={TYPO.body2}>{place}</span>}
                <span className="flex items-center gap-1.5">
                    <span className={cn(PILL_BASE, getMatchTypeBadgeClass(session.matchType))}>{MATCH_TYPE_LABELS[session.matchType]}</span>
                    <span className={rolePillClass(session.role)}>{ROLE_LABEL[session.role]}</span>
                </span>
                {session.matchId && (
                    <Link href={`/matches/${session.matchId}`} className={cn(TYPO.body2, TEXT_LINK, 'min-w-0 break-keep')}>
                        {session.title ?? '매칭 보기'}
                    </Link>
                )}
                <span className={cn(TYPO.body2, 'ml-auto shrink-0 tabular-nums')}>{formatTally(sessionTally(session, viewerId))}</span>
            </div>
            {session.games.map((game, i) => <GameRow key={game.id} game={game} index={i} viewerId={viewerId} />)}
            <GameHistory edits={edits} viewerId={viewerId} />
        </section>
    )
}
