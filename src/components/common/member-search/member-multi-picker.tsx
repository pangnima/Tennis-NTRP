'use client'

import { useState } from 'react'

import { MemberPickChips, type MemberPick } from '@/components/common/member-search/member-pick-chips'
import { MemberResultRow } from '@/components/common/member-search/member-result-row'
import { MemberSearchField } from '@/components/common/member-search/member-search-field'
import { MemberSearchResults } from '@/components/common/member-search/member-search-results'
import { useMemberLookup } from '@/components/common/member-search/use-member-lookup'
import { TYPO } from '@/lib/design/tokens'
import type { OpponentCandidate } from '@/lib/queries/users'

type Props = {
    selfUserId: string
    picks: MemberPick[]
    onChange: (picks: MemberPick[]) => void
    max: number
    /** 이미 들어와 있어 고를 수 없는 회원 — 감추지 않고 비활성으로 보인다 */
    disabledIds?: string[]
    /** 고른 칩 위의 이름표 — 「초대할 회원」이면 「초대할 회원 2명」 */
    picksLabel?: string
}

/** 회원 여러 명 고르기 — [검색] 명시 조회 + 인라인 결과 + 고른 사람 칩. 매칭 만들기와 매칭 안 초대가 같은 조각을 쓴다. */
export function MemberMultiPicker({ selfUserId, picks, onChange, max, disabledIds = [], picksLabel }: Props) {
    const [term, setTerm] = useState('')
    const lookup = useMemberLookup(selfUserId)
    const picked = new Set(picks.map((p) => p.userId))
    const full = picks.length >= max

    function toggle(c: OpponentCandidate) {
        if (picked.has(c.id)) onChange(picks.filter((p) => p.userId !== c.id))
        else if (!full) onChange([...picks, { userId: c.id, name: c.name, meta: c.nickname }])
    }

    return (
        <div className="space-y-2">
            <MemberSearchField
                value={term}
                onChange={setTerm}
                onSearch={() => lookup.search(term)}
                loading={lookup.status === 'loading'}
                placeholder="이름·닉네임으로 회원 검색"
            />
            <MemberSearchResults
                status={lookup.status}
                query={lookup.query}
                results={lookup.results}
                hasMore={lookup.hasMore}
                error={lookup.error}
                idleText="이름이나 닉네임을 입력하고 검색하세요. 여러 명을 고를 수 있습니다."
                renderRow={(c) => {
                    const selected = picked.has(c.id)
                    const already = disabledIds.includes(c.id)
                    return (
                        <MemberResultRow
                            key={c.id}
                            candidate={c}
                            selected={selected}
                            selectable={!already && (selected || !full)}
                            onToggle={() => toggle(c)}
                        />
                    )
                }}
            />
            {picksLabel && picks.length > 0 && <p className={TYPO.caption}>{picksLabel} <span className="tabular-nums">{picks.length}명</span></p>}
            <MemberPickChips picks={picks} onRemove={(id) => onChange(picks.filter((p) => p.userId !== id))} removeLabel="선택 해제" />
        </div>
    )
}
