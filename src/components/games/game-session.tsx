import { chipClass } from '@/components/common/chip-class'
import Link from 'next/link'

import { GameHistory } from '@/components/games/game-history'
import { GameRow } from '@/components/games/game-row'
import { GameSessionMemo } from '@/components/games/game-session-memo'
import { getMatchTypeBadgeClass, MATCH_TYPE_LABELS } from '@/lib/design/match-type-style'
import { ROLE_LABEL, rolePillClass } from '@/lib/design/member-badges'
import { SURFACE_LABELS } from '@/lib/design/surface'
import { TEXT_LINK, TYPO } from '@/lib/design/tokens'
import type { GameEdit } from '@/lib/games/history'
import { formatTally, sessionTally, sessionWhen, type GameSession } from '@/lib/games/list'
import { formatCourt } from '@/lib/matches/court'
import { cn } from '@/lib/utils'

/** 묶음 하나가 카드 한 장 — 넓은 자리에서도 묶음끼리 떨어져 있다(`DataList grouped`). 한 테두리에 붙이면 어디서 묶음이 바뀌는지 안 보인다 */
const CARD = 'overflow-hidden rounded-lg border border-border bg-card'

/** 머리 줄의 덩어리 사이 세로선 — 넓은 자리(한 줄)에서만. 좁은 자리는 줄바꿈되어 간격이 가른다 */
function HeadRule() {
    return <span aria-hidden className="h-3.5 w-px shrink-0 bg-border @max-4xl:hidden" />
}

type Props = {
    session: GameSession
    viewerId: string
    /** 이 묶음의 수정 기록(오래된 것부터) — 없으면 아코디언을 그리지 않는다 */
    edits?: GameEdit[]
}

/**
 * 게임 **묶음** — 같은 자리에서 친 게임들(매칭 게임 = 같은 매칭, 직접 기록 = 같은 날짜·시각·코트·종목).
 * `DataList grouped` 안에서 그린다.
 *   · 머리 줄(진한 바탕): 일시(「11.26 (목) 20:00~22:00」) · 경기장 · [종목][구분] · 매칭 제목(누르면 그 매칭) · 내 전적(「4게임 3승 1패」)
 *     + 칩 뒤 「4명」(함께 친 인원 — 매칭은 명단, 직접 기록은 그 묶음의 선수)
 *   · 메모 줄(`GameSessionMemo`): 매칭 메모·게임 메모를 한 번만 — 있을 때만
 *   · 게임 줄(`GameRow`): 1게임부터 · 맨 아래 「수정 기록 N」 아코디언
 * 공통 정보는 머리 줄이 한 번만 말한다. 넓든 좁든 묶음 하나가 카드 한 장이고, 넓은 자리에서는 그 안의 게임 줄이 표의 줄이다.
 */
export function GameSessionBlock({ session, viewerId, edits = [] }: Props) {
    const place = [formatCourt(session.courtName, session.courtNo), session.surface && SURFACE_LABELS[session.surface]].filter(Boolean).join(' · ')
    return (
        <section className={cn('divide-y divide-border', CARD)}>
            {/* 좁은 자리는 세 줄로 선다(order) — 일시 … 전적 / 경기장 / 칩 · 인원 · 매칭 제목. 넓은 자리는 DOM 순서대로 한 줄 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-muted/60 px-4 py-2.5 @4xl:px-5">
                <span className={cn(TYPO.body2Strong, 'tabular-nums @max-4xl:order-1')}>{sessionWhen(session)}</span>
                {place && <><HeadRule /><span className={cn(TYPO.body2, '@max-4xl:order-3 @max-4xl:basis-full')}>{place}</span></>}
                <HeadRule />
                <span className="flex items-center gap-1.5 @max-4xl:order-4">
                    <span className={cn(chipClass(), getMatchTypeBadgeClass(session.matchType))}>{MATCH_TYPE_LABELS[session.matchType]}</span>
                    <span className={rolePillClass(session.role)}>{ROLE_LABEL[session.role]}</span>
                    <span className={cn(TYPO.body2, 'ml-1 tabular-nums')}>{session.people}명</span>
                </span>
                {session.matchId && (
                    <Link href={`/matches/${session.matchId}`} className={cn(TYPO.body2, TEXT_LINK, 'min-w-0 break-keep @max-4xl:order-5')}>
                        {session.title ?? '매칭 보기'}
                    </Link>
                )}
                <span className={cn(TYPO.body2, 'ml-auto shrink-0 tabular-nums @max-4xl:order-2')}>{formatTally(sessionTally(session, viewerId))}</span>
            </div>
            <GameSessionMemo memos={session.memos} />
            {session.games.map((game, i) => <GameRow key={game.id} game={game} index={i} viewerId={viewerId} />)}
            <GameHistory edits={edits} viewerId={viewerId} />
        </section>
    )
}
