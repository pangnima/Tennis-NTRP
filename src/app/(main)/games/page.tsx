import { Fragment } from 'react'
import { redirect } from 'next/navigation'

import { ActionButton } from '@/components/common/action-button'
import { DataList, DataListDivider } from '@/components/common/data-list'
import { EmptyState } from '@/components/common/empty-state'
import { LinkSegments } from '@/components/common/link-segments'
import { LinkTabs } from '@/components/common/link-tabs'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GAME_HEAD } from '@/components/games/game-row'
import { GameSessionBlock } from '@/components/games/game-session'
import { groupEditsBySession } from '@/lib/games/history'
import {
    filterSessions, GAME_RESULT_FILTERS, GAME_ROLE_FILTERS, GAME_TYPE_FILTERS, groupGamesIntoSessions, groupSessionsByMonth, parseGameFilter,
    type GameFilter,
} from '@/lib/games/list'
import { NAV_LABEL, RECORD_PATH } from '@/lib/nav-items'
import { fetchGameEdits, fetchUserGames } from '@/lib/queries/games'
import { fetchMatchesByIds } from '@/lib/queries/matches'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: NAV_LABEL.games }

type Props = { searchParams: Promise<{ type?: string; result?: string; role?: string }> }

/** 필터 주소 — 기본값('전체')은 주소에 싣지 않는다 */
function hrefOf(filter: GameFilter): string {
    const q = new URLSearchParams()
    if (filter.type !== 'all') q.set('type', filter.type)
    if (filter.result !== 'all') q.set('result', filter.result)
    if (filter.role !== 'all') q.set('role', filter.role)
    const s = q.toString()
    return s ? `/games?${s}` : '/games'
}

/**
 * 경기 결과 — 내가 뛴 게임 전부(매칭 안에서 기록한 것도, 매칭 없이 기록한 것도 한 목록). **한 게임 = 스코어 하나 = 한 줄**이고,
 * 같은 자리에서 친 게임은 **묶음**으로 모인다(매칭 = 같은 매칭, 직접 기록 = 같은 날짜·시각·코트·종목) — 묶음 머리가
 * 일시·경기장·종목·구분을 한 번만 말하고 그 아래 게임 줄, 맨 아래 「수정 기록」 아코디언.
 * 거르기: **구분은 밑줄 탭**(화면을 가르는 축 — 그 경기가 내게 어떤 자리였나), 종목·승패는 탭 줄 오른쪽 세그먼트 토글.
 * 월은 큰 제목이 아니라 목록 안의 얇은 구분 줄이다.
 */
export default async function GamesPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const filter = parseGameFilter(await searchParams)
    const all = await fetchUserGames(user.id)
    const matchIds = [...new Set(all.flatMap((g) => (g.matchId ? [g.matchId] : [])))]
    const [matches, edits] = await Promise.all([fetchMatchesByIds(matchIds), fetchGameEdits(user.id, matchIds)])
    const hosted = new Set([...matches.values()].filter((m) => m.hostId === user.id).map((m) => m.id))
    const sessions = filterSessions(groupGamesIntoSessions(all, matches, hosted), user.id, filter)
    const editsOf = groupEditsBySession(edits)
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
                        <DataList head={GAME_HEAD}>
                            {groupSessionsByMonth(sessions).map((group) => (
                                <Fragment key={group.key}>
                                    <DataListDivider count={`${group.games}경기`}>{group.label}</DataListDivider>
                                    {group.sessions.map((s) => (
                                        <GameSessionBlock key={s.key} session={s} viewerId={user.id} edits={editsOf.get(s.key)} />
                                    ))}
                                </Fragment>
                            ))}
                        </DataList>
                    )}
                </>
            )}
        </PageContainer>
    )
}
