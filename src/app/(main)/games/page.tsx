import { Fragment } from 'react'
import { redirect } from 'next/navigation'

import { ActionButton } from '@/components/common/action-button'
import { DataList, DataListGroupLabel } from '@/components/common/data-list'
import { EmptyState } from '@/components/common/empty-state'
import { LinkSegments } from '@/components/common/link-segments'
import { LinkTabs } from '@/components/common/link-tabs'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GameSessionBlock } from '@/components/games/game-session'
import { groupEditsBySession } from '@/lib/games/history'
import {
    filterSessions, formatTally, GAME_RESULT_FILTERS, GAME_ROLE_FILTERS, GAME_TYPE_FILTERS, GAMES_PAGE, groupGamesIntoSessions, groupSessionsByMonth,
    parseGameFilter, parseShown, takeSessions, type GameFilter,
} from '@/lib/games/list'
import { NAV_LABEL, RECORD_PATH } from '@/lib/nav-items'
import { fetchGameEdits, fetchUserGames } from '@/lib/queries/games'
import { fetchMatchesByIds, fetchMatchHeadcounts } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: NAV_LABEL.games }

type Props = { searchParams: Promise<{ type?: string; result?: string; role?: string; n?: string }> }

/** 필터 주소 — 기본값('전체')은 주소에 싣지 않는다. `shown`(그릴 묶음 수)은 「더 보기」만 싣는다 — 필터를 바꾸면 처음부터 */
function hrefOf(filter: GameFilter, shown?: number): string {
    const q = new URLSearchParams()
    if (filter.type !== 'all') q.set('type', filter.type)
    if (filter.result !== 'all') q.set('result', filter.result)
    if (filter.role !== 'all') q.set('role', filter.role)
    if (shown) q.set('n', String(shown))
    const s = q.toString()
    return s ? `/games?${s}` : '/games'
}

/**
 * 경기 결과 — 내가 뛴 게임 전부(매칭 안에서 기록한 것도, 매칭 없이 기록한 것도 한 목록). **한 게임 = 스코어 하나 = 한 줄**이고,
 * 같은 자리에서 친 게임은 **묶음**으로 모인다(매칭 = 같은 매칭, 직접 기록 = 같은 날짜·시각·코트·종목) — 묶음 머리가
 * 일시·경기장·종목·구분을 한 번만 말하고 그 아래 게임 줄, 맨 아래 「수정 기록」 아코디언.
 * 거르기: **구분은 밑줄 탭**(화면을 가르는 축 — 그 경기가 내게 어떤 자리였나), 종목·승패는 탭 줄 오른쪽 세그먼트 토글.
 * **묶음 하나가 카드 한 장**이고 월은 카드 밖의 이름표다(그 달 전체의 내 전적). 처음엔 최근 묶음 10개만 그리고
 * 맨 아래 [이전 경기 더 보기]가 `?n=`을 10씩 늘린다 — 주소가 상태라 새로 고쳐도 같은 화면이다.
 */
export default async function GamesPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const params = await searchParams
    const filter = parseGameFilter(params)
    const shown = parseShown(params.n)
    const all = await fetchUserGames(user.id)
    const matchIds = [...new Set(all.flatMap((g) => (g.matchId ? [g.matchId] : [])))]
    const [matches, edits, headcounts] = await Promise.all([fetchMatchesByIds(matchIds), fetchGameEdits(user.id, matchIds), fetchMatchHeadcounts(matchIds)])
    const hosted = new Set([...matches.values()].filter((m) => m.hostId === user.id).map((m) => m.id))
    const sessions = filterSessions(groupGamesIntoSessions(all, matches, hosted, headcounts), user.id, filter)
    const editsOf = groupEditsBySession(edits)
    const { groups, restGames } = takeSessions(groupSessionsByMonth(sessions, user.id), shown)
    const record = <ActionButton href={RECORD_PATH} variant="solid" size="md">+ {NAV_LABEL.record}</ActionButton>

    return (
        <PageContainer>
            <PageHeader
                title={NAV_LABEL.games}
                description="기록한 경기는 바로 전적에 반영됩니다. 틀린 스코어는 참가자 누구나 고칠 수 있고, 고친 내용은 수정 기록에 남습니다"
                actions={record}
            />
            {all.length === 0 ? (
                <EmptyState
                    size="md"
                    title="아직 기록한 경기가 없습니다"
                    description="오늘 친 경기를 한 장에 기록해 보세요. 상대가 회원이 아니어도 됩니다"
                    actions={record}
                />
            ) : (
                <>
                    <LinkTabs
                        ariaLabel="구분"
                        activeKey={filter.role}
                        items={GAME_ROLE_FILTERS.map((f) => ({ ...f, href: hrefOf({ ...filter, role: f.key }) }))}
                        trailing={
                            <>
                                <LinkSegments
                                    ariaLabel="종목"
                                    activeKey={filter.type}
                                    items={GAME_TYPE_FILTERS.map((f) => ({ ...f, href: hrefOf({ ...filter, type: f.key }) }))}
                                />
                                <LinkSegments
                                    ariaLabel="승패"
                                    activeKey={filter.result}
                                    items={GAME_RESULT_FILTERS.map((f) => ({ ...f, href: hrefOf({ ...filter, result: f.key }) }))}
                                />
                            </>
                        }
                    />
                    {sessions.length === 0 ? (
                        <EmptyState title="조건에 맞는 경기가 없습니다" description="필터를 바꿔 보세요" />
                    ) : (
                        <>
                            <DataList grouped>
                                {groups.map((group) => (
                                    <Fragment key={group.key}>
                                        <DataListGroupLabel count={formatTally(group.tally)}>{group.label}</DataListGroupLabel>
                                        {group.sessions.map((s) => (
                                            <GameSessionBlock key={s.key} session={s} viewerId={user.id} edits={editsOf.get(s.key)} />
                                        ))}
                                    </Fragment>
                                ))}
                            </DataList>
                            {restGames > 0 && (
                                <div className="flex justify-center">
                                    <ActionButton href={hrefOf(filter, shown + GAMES_PAGE)} scroll={false} variant="outline" size="lg">
                                        이전 경기 더 보기 · 남은 {restGames}게임
                                    </ActionButton>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </PageContainer>
    )
}
