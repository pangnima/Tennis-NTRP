import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarPlus, PlusCircle } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { DataList } from '@/components/common/data-list'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GameSessionBlock } from '@/components/games/game-session'
import { MATCH_HEAD, MatchCard } from '@/components/matches/match-card'
import { CARD_BASE, CARD_HOVER, TEXT_LINK, TYPO } from '@/lib/dashboard/tokens'
import { groupGamesIntoSessions } from '@/lib/games/list'
import { toPersonalMatches } from '@/lib/games/perspective'
import { summarizeGames } from '@/lib/games/summary'
import { splitMatchesByEnd } from '@/lib/matches/when'
import { NAV_LABEL, RECORD_PATH, statsHref } from '@/lib/nav-items'
import { explodePersonalMatchSets } from '@/lib/personal-matches/explode'
import { fetchUserGames } from '@/lib/queries/games'
import { fetchMatchesByIds, fetchMatchHeadcounts, fetchMatchList } from '@/lib/queries/matches'
import { fetchUserById } from '@/lib/queries/users'
import { replayPersonalRatings } from '@/lib/rating/personal-rating'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { formatNtrp } from '@/lib/rating/display'

export const metadata = { title: NAV_LABEL.home }

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className={cn(CARD_BASE, 'p-4')}>
            <p className={TYPO.label}>{label}</p>
            <p className="mt-1 text-h2 font-bold tabular-nums">{value}</p>
        </div>
    )
}

/**
 * 홈 — 들어오면 **할 수 있는 일**이 먼저 보인다: 경기 기록 · 매칭 만들기. 그 아래 숫자 셋, 내 다가오는 매칭, 최근 경기.
 * 자세한 통계는 「통계」의 일이다(기록이 없는 사람에게 빈 카드 열두 장을 먼저 보이지 않는다).
 */
export default async function HomePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [me, games, myMatches] = await Promise.all([fetchUserById(user.id), fetchUserGames(user.id), fetchMatchList(user.id, 'mine')])
    // 최근 경기 = 최근 묶음 셋(같은 자리에서 친 게임은 한 덩어리) — 경기 결과와 같은 컴포넌트
    const recent = games.slice(0, 12)
    const recentIds = [...new Set(recent.flatMap((g) => (g.matchId ? [g.matchId] : [])))]
    const [recentMatches, headcounts] = await Promise.all([fetchMatchesByIds(recentIds), fetchMatchHeadcounts(recentIds)])
    const hosted = new Set([...recentMatches.values()].filter((m) => m.hostId === user.id).map((m) => m.id))
    const sessions = groupGamesIntoSessions(recent, recentMatches, hosted, headcounts).slice(0, 3)
    const summary = summarizeGames(games, user.id)
    const upcoming = splitMatchesByEnd(myMatches.filter((m) => !m.confirmedAt)).upcoming.slice(0, 3)
    // 레이팅은 통계 화면과 같은 식으로 그 자리에서 계산한다 — 캐시(users.personal_ntrp)를 읽으면 두 화면의 숫자가 갈릴 수 있다
    const snapshot = replayPersonalRatings(explodePersonalMatchSets(toPersonalMatches(games, user.id)), me?.ntrp ?? null, () => undefined)
    const rating = snapshot.matchesPlayed > 0 ? snapshot.rating : me?.ntrp

    return (
        <PageContainer className="max-w-5xl">
            <PageHeader title={`${me?.name ?? ''}님, 오늘은 어떤 경기를 했나요?`} />

            <div className="grid grid-cols-2 gap-3">
                <ActionButton href={RECORD_PATH} size="xl" variant="solid">
                    <PlusCircle className="h-5 w-5" aria-hidden />{NAV_LABEL.record}
                </ActionButton>
                <ActionButton href="/matches/new" size="xl">
                    <CalendarPlus className="h-5 w-5" aria-hidden />매칭 만들기
                </ActionButton>
            </div>

            {summary.games === 0 ? (
                <div className={cn(CARD_BASE, 'p-5')}>
                    <p className={TYPO.h4}>첫 경기를 기록해 보세요</p>
                    <p className={cn(TYPO.body2Muted, 'mt-1 break-keep')}>
                        상대와 스코어만 넣으면 됩니다. 기록이 쌓이면 승률·강약점·랭킹이 채워집니다. 상대가 회원이 아니어도 괜찮습니다.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    <Stat label="경기" value={String(summary.games)} />
                    <Stat label="승률" value={summary.winRate == null ? '-' : `${summary.winRate}%`} />
                    <Stat label="레이팅" value={rating == null ? '-' : formatNtrp(rating, 2)} />
                </div>
            )}

            <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <h2 className={TYPO.h3}>다가오는 내 매칭</h2>
                    <Link href="/matches?tab=mine" className={cn(TYPO.body2, TEXT_LINK)}>내 매칭 전체</Link>
                </div>
                {upcoming.length === 0 ? (
                    <Link href="/matches" className={cn(CARD_BASE, CARD_HOVER, TYPO.body2, 'block p-4')}>
                        예정된 매칭이 없습니다. 열려 있는 매칭을 둘러보세요 →
                    </Link>
                ) : (
                    <DataList head={MATCH_HEAD}>
                        {upcoming.map((m) => <MatchCard key={m.id} match={m} showJoined={false} />)}
                    </DataList>
                )}
            </section>

            {games.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-baseline justify-between">
                        <h2 className={TYPO.h3}>최근 경기</h2>
                        <span className="flex gap-3">
                            <Link href="/games" className={cn(TYPO.body2, TEXT_LINK)}>{NAV_LABEL.games} 전체</Link>
                            <Link href={statsHref(user.id)} className={cn(TYPO.body2, TEXT_LINK)}>{NAV_LABEL.stats} 보기</Link>
                        </span>
                    </div>
                    <DataList grouped>
                        {sessions.map((s) => <GameSessionBlock key={s.key} session={s} viewerId={user.id} />)}
                    </DataList>
                </section>
            )}
        </PageContainer>
    )
}
