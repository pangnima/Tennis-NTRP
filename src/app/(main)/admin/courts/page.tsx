import { notFound } from 'next/navigation'

import { CourtMergeBox } from '@/components/admin/court-merge-box'
import { CourtOfficialRow } from '@/components/admin/court-official-row'
import { EmptyState } from '@/components/common/empty-state'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { LIST_CARD, TYPO } from '@/lib/design/tokens'
import { suggestCourtClusters } from '@/lib/matches/court-clusters'
import { fetchCourtOverview } from '@/lib/queries/courts'
import { cn } from '@/lib/utils'

export const metadata = { title: '코트명 정리', robots: { index: false } }

/**
 * 코트명 정리(0103, **관리자 전용**) — 사람들이 쓴 코트명을 정식 명칭(공식 코트) 하나로 합친다.
 * 위에서 아래로: 합칠 만한 묶음(자동 제안 — 틀린 것만 끄고 합친다) → 공식 코트(이름 바꾸기·별칭 빼기) → 모든 이름(직접 고르기).
 * 관리자 판정은 RPC가 한다 — 관리자가 아니면(비로그인 포함) 재료가 오지 않아 404. 메뉴에는 없고 「내 정보」의 관리자 줄에서 들어온다.
 */
export default async function AdminCourtsPage() {
    const overview = await fetchCourtOverview()
    if (!overview) notFound()
    const clusters = suggestCourtClusters(overview.names, overview.courts)

    return (
        <PageContainer>
            <PageHeader
                title="코트명 정리"
                description="사람들이 쓴 코트명을 정식 명칭 하나로 합칩니다. 합치면 매칭·경기의 코트명이 함께 바뀌고, 그 뒤로는 옛 이름으로 적어도 공식 명칭으로 저장됩니다."
            />

            <section className="space-y-3">
                <h2 className={TYPO.h3}>합칠 만한 묶음 {clusters.length}</h2>
                <p className={cn(TYPO.body2Muted, 'break-keep')}>이름이 비슷한 것끼리 자동으로 묶었습니다(숫자는 쓰인 횟수). 다른 코트가 섞였으면 그 이름을 눌러 끄고 합쳐 주세요.</p>
                {clusters.length === 0
                    ? <EmptyState title="합칠 만한 묶음이 없습니다" description="비슷한 이름이 쌓이면 여기에 나타납니다" />
                    : clusters.map((c, i) => (
                        <CourtMergeBox
                            key={c.names.map((n) => n.name).join('|')} id={`cluster-${i}`} names={c.names}
                            courtName={c.court?.name} defaultOfficial={c.official} defaultChecked
                        />
                    ))}
            </section>

            <section className="space-y-3">
                <h2 className={TYPO.h3}>공식 코트 {overview.courts.length}</h2>
                {overview.courts.length === 0
                    ? <EmptyState title="아직 공식 코트가 없습니다" description="위의 묶음을 합치면 공식 코트가 됩니다" />
                    : <div className={LIST_CARD}>{overview.courts.map((c) => <CourtOfficialRow key={c.id} court={c} />)}</div>}
            </section>

            <section className="space-y-3">
                <h2 className={TYPO.h3}>모든 이름 {overview.names.length}</h2>
                <p className={cn(TYPO.body2Muted, 'break-keep')}>아직 공식 코트에 묶이지 않은 이름입니다. 묶음 제안이 놓친 이름은 여기서 직접 골라 합칩니다(이름 하나만 골라 공식 명칭으로 올려도 됩니다).</p>
                {overview.names.length === 0
                    ? <EmptyState title="모든 이름이 공식 코트에 묶여 있습니다" />
                    : <CourtMergeBox key={overview.names.map((n) => n.name).join('|')} id="all-names" names={overview.names} defaultOfficial="" defaultChecked={false} />}
            </section>
        </PageContainer>
    )
}
