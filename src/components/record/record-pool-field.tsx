'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { PRESS_HEIGHT } from '@/components/common/action-button-class'
import { FIELD_LABEL } from '@/components/common/field-class'
import { MemberResultRow } from '@/components/common/member-search/member-result-row'
import { MemberSearchField } from '@/components/common/member-search/member-search-field'
import { MemberSearchResults } from '@/components/common/member-search/member-search-results'
import { useMemberLookup } from '@/components/common/member-search/use-member-lookup'
import { GuestAddForm } from '@/components/matches/board/guest-add-form'
import type { GameFormState } from '@/components/record/use-game-form'
import { NEUTRAL_PILL } from '@/lib/dashboard/tokens'
import { GENDER_SHORT_LABEL } from '@/lib/profile/signup-fields'
import { cn } from '@/lib/utils'
import { formatNtrp } from '@/lib/rating/display'

/**
 * 직접 기록의 **참가자** — 넣는 방법은 둘(회원 검색 · 비회원)이지만 **들어가는 곳은 하나**다.
 *   · 위 「참가자 N명」: 나·회원·비회원이 같은 모양의 칩으로 선다(회원은 NTRP, 비회원은 「비회원」, 누르면 뺀다)
 *   · 아래 「참가자 추가」: 회원 검색 결과의 줄 끝 **[추가]**를 누르면 위 목록에 올라가고 그 줄은 「추가됨」이 된다.
 *     회원이 아닌 사람은 [+ 비회원]으로 이름·NTRP·주력손을 적어 [추가]
 * 예전에는 회원이 검색 결과의 체크와 그 아래 다른 모양의 칩으로만 남아 "등록됐는지"가 보이지 않았다(11-26 피드백).
 * 검색은 매칭 초대와 같은 조각을 쓴다(초대는 "고르는" 일이라 체크 그대로). 사람 수에 제한이 없고, 누가 어느 게임을 뛰었는지는 「게임」에서 고른다.
 */
export function RecordPoolField({ s, viewerId, viewerName }: { s: GameFormState; viewerId: string; viewerName: string }) {
    const [guestOpen, setGuestOpen] = useState(false)
    const [term, setTerm] = useState('')
    const lookup = useMemberLookup(viewerId)
    const added = new Set(s.members.map((m) => m.key))

    return (
        <div className="space-y-5">
            <div>
                <p className={FIELD_LABEL}>참가자 <span className="tabular-nums">{s.pool.length}명</span></p>
                <ul className="flex flex-wrap items-center gap-1.5">
                    <li className={cn(NEUTRAL_PILL, PRESS_HEIGHT.sm, 'px-3')}>{viewerName}<span className="ml-1.5 text-muted-foreground">나</span></li>
                    {[...s.members, ...s.guests].map((p) => (
                        <li key={p.key}>
                            <ActionButton size="sm" aria-label={`${p.name} 빼기`} onClick={() => s.removePlayer(p.key)}>
                                {p.name}
                                {p.isMember
                                    ? p.ntrp != null && <span className="font-normal tabular-nums">{formatNtrp(p.ntrp)}</span>
                                    : <span className="font-normal text-muted-foreground">비회원{p.gender ? ` · ${GENDER_SHORT_LABEL[p.gender]}` : ''}</span>}
                                <X className="size-3" aria-hidden />
                            </ActionButton>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="space-y-2">
                <p className={FIELD_LABEL}>참가자 추가</p>
                <div className="flex flex-wrap gap-2">
                    <div className="min-w-0 flex-1 basis-64">
                        <MemberSearchField value={term} onChange={setTerm} onSearch={() => lookup.search(term)} loading={lookup.status === 'loading'} placeholder="이름·닉네임으로 회원 검색" />
                    </div>
                    <ActionButton size="lg" aria-expanded={guestOpen} onClick={() => setGuestOpen((v) => !v)}>
                        <Plus className="size-4" aria-hidden />비회원
                    </ActionButton>
                </div>
                {guestOpen && (
                    <GuestAddForm
                        matchType={s.matchType}
                        note="회원이 아닌 사람은 이름·NTRP·성별·주력손을 적어 넣습니다. 저장한 게임에만 남습니다."
                        taken={(key) => s.pool.some((p) => p.key === key)}
                        onAdd={(guest) => { s.addGuest(guest); setGuestOpen(false) }}
                        onCancel={() => setGuestOpen(false)}
                    />
                )}
                <MemberSearchResults
                    status={lookup.status} query={lookup.query} results={lookup.results} hasMore={lookup.hasMore} error={lookup.error}
                    idleText="함께 친 회원을 찾아 [추가]를 누르면 위 참가자 목록에 올라갑니다. 게임마다 누가 뛰었는지는 아래 「게임」에서 고릅니다."
                    renderRow={(c) => (
                        <MemberResultRow
                            key={c.id} candidate={c} selected={added.has(c.id)} selectable={!added.has(c.id)}
                            label={added.has(c.id) ? '추가됨' : undefined} actionLabel="추가" onToggle={() => s.addMember(c)}
                        />
                    )}
                />
            </div>
        </div>
    )
}
