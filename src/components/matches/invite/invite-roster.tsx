import { DataList, ROW_BOX, ROW_GRID, ROW_PAD } from '@/components/common/data-list'
import { DeletedBadge } from '@/components/common/deleted-badge'
import { GenderChip } from '@/components/matches/person-cells'
import { ROLE_LABEL, rolePillClass, type RoleKind } from '@/lib/dashboard/member-badges'
import { TYPO } from '@/lib/dashboard/tokens'
import { formatHeadcount } from '@/lib/matches/fee'
import type { InviteKind, InviteRosterEntry } from '@/lib/matches/invite'
import { cn } from '@/lib/utils'

const COLS = '@4xl:grid-cols-[minmax(0,1fr)_5rem]'
const CARD_ONLY = '@max-4xl:flex @max-4xl:items-center @max-4xl:justify-between @max-4xl:gap-3 @max-4xl:rounded-lg @max-4xl:border @max-4xl:border-border @max-4xl:bg-card @max-4xl:p-4'
const ROLE: Record<InviteKind, RoleKind> = { host: 'host', member: 'guest', guest: 'nonmember' }

/**
 * 초대 링크 화면의 참가자(0108) — **이름·성별·구분만**. 로그인하지 않은 사람이 보는 표라 사진·닉네임·NTRP·티어·통계 링크가 없다
 * (DB가 애초에 싣지 않는다 — `get_invited_match`). 매칭 상세의 참가자 표와 같은 구분 필을 쓴다.
 */
export function InviteRoster({ roster, capacity, meKey }: { roster: InviteRosterEntry[]; capacity: number; meKey?: string }) {
    return (
        <section className="space-y-3">
            <h2 className={TYPO.h3}>참가자 {formatHeadcount(roster.length, capacity)}</h2>
            <DataList head={{ cols: COLS, labels: ['참가자', '구분'] }}>
                {roster.map((r) => (
                    <div key={r.key} className={cn(CARD_ONLY, ROW_GRID, ROW_PAD, ROW_BOX, COLS, r.key === meKey && 'bg-self/10 @max-4xl:bg-self/10')}>
                        <span className={cn(TYPO.bodyStrong, 'flex min-w-0 items-center gap-1.5 @4xl:text-body2 @4xl:font-medium')}>
                            <span className="min-w-0 truncate">{r.name}</span>
                            <GenderChip gender={r.gender} />
                            {r.deleted && <DeletedBadge />}
                        </span>
                        <span className="justify-self-start"><span className={rolePillClass(ROLE[r.kind])}>{ROLE_LABEL[ROLE[r.kind]]}</span></span>
                    </div>
                ))}
            </DataList>
        </section>
    )
}
