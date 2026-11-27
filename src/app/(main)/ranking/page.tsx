import Link from 'next/link'
import { redirect } from 'next/navigation'

import { DataList, ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { EmptyState } from '@/components/common/empty-state'
import { LinkTabs } from '@/components/common/link-tabs'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { TYPO } from '@/lib/dashboard/tokens'
import { NAV_LABEL } from '@/lib/nav-items'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const metadata = { title: NAV_LABEL.ranking }

type Props = { searchParams: Promise<{ kind?: string }> }

/** 순위에 오르는 최소 경기 수 — 한두 경기의 우연으로 맨 위에 서지 않게 */
const MIN_GAMES = 5

const TABS = [
    { key: 'all', label: '전체', href: '/ranking' },
    { key: 'singles', label: '단식', href: '/ranking?kind=singles' },
    { key: 'doubles', label: '복식', href: '/ranking?kind=doubles' },
]

const RANK_COLS = '@4xl:grid-cols-[3rem_minmax(0,1fr)_4.5rem_4.5rem_4.5rem_5rem]'
const RANK_HEAD = { cols: RANK_COLS, labels: ['순위', '회원', '경기', '승', '승률', '레이팅'] } as const
const CARD_ONLY = '@max-4xl:rounded-lg @max-4xl:border @max-4xl:border-border @max-4xl:bg-card @max-4xl:px-4 @max-4xl:py-3'
/** 숫자 칸 — 표 모드에서만 따로 선다(카드 모드는 이름 아래 한 줄로 합쳐 말한다) */
const NUM = cn(TYPO.body2, 'hidden tabular-nums @4xl:block')
/** 카드에서는 16px 굵게, 표에서는 14px */
const STRONG = cn(TYPO.bodyStrong, 'tabular-nums @4xl:text-body2 @4xl:font-medium')

/**
 * 개인 랭킹 — 레이팅(개인 경기 기반 NTRP) 순. 탭은 "그 종목을 몇 경기 뛰었나"로 명단을 가른다
 * (레이팅은 종목을 가리지 않는 하나의 값이다). 통계를 비공개로 둔 회원은 오르지 않는다.
 */
export default async function RankingPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { kind: raw } = await searchParams
    const kind = raw === 'singles' || raw === 'doubles' ? raw : 'all'
    const { data } = await supabase.rpc('get_member_rankings', { p_kind: kind, p_min_games: MIN_GAMES, p_limit: 100 })
    const rows = data ?? []

    return (
        <PageContainer>
            <PageHeader title={NAV_LABEL.ranking} description={`${MIN_GAMES}경기 이상 뛴 회원의 레이팅 순위입니다. 세트 하나를 한 경기로 셉니다`} />
            <LinkTabs items={TABS} activeKey={kind} ariaLabel="랭킹 종목" />
            {rows.length === 0 ? (
                <EmptyState size="md" title="아직 순위에 오른 회원이 없습니다" description={`${MIN_GAMES}경기를 채우면 순위에 오릅니다`} />
            ) : (
                <DataList head={RANK_HEAD}>
                    {rows.map((r, i) => {
                        const mine = r.user_id === user.id
                        const rate = r.games > 0 ? Math.round((r.wins / r.games) * 100) : 0
                        return (
                            <Link
                                key={r.user_id}
                                href={`/profile/${r.user_id}`}
                                aria-current={mine ? 'true' : undefined}
                                className={cn(
                                    'flex items-center gap-3 transition-colors hover:bg-muted/50',
                                    CARD_ONLY, ROW_GRID, ROW_PAD, ROW_BOX, RANK_COLS, mine && 'bg-primary/5',
                                )}
                            >
                                <span className={cn(STRONG, 'w-8 shrink-0 text-center @4xl:w-auto @4xl:text-left')}>{i + 1}</span>
                                <span className="min-w-0 flex-1 @4xl:contents">
                                    <span className={cn(STRONG, 'block truncate', mine && 'font-semibold')}>{r.name}{mine && ' (나)'}</span>
                                    <span className={cn(TYPO.body2, 'block tabular-nums @4xl:hidden')}>{r.games}경기 {r.wins}승 · 승률 {rate}%</span>
                                </span>
                                <span className={NUM}>{r.games}</span>
                                <span className={NUM}>{r.wins}</span>
                                <span className={NUM}>{rate}%</span>
                                <span className={STRONG}>{r.rating == null ? '-' : Number(r.rating).toFixed(2)}</span>
                            </Link>
                        )
                    })}
                </DataList>
            )}
        </PageContainer>
    )
}
