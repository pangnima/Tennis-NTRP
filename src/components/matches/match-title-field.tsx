'use client'

import { Field } from '@/components/common/field'
import { fieldClass } from '@/components/common/field-class'
import { MATCH_TITLE_MAX, MATCH_TITLE_PLACEHOLDER } from '@/lib/matches/title'

/**
 * 방 제목 — 목록에 그대로 보이는 한 줄(필수, 40자). 코트명 바로 아래에 둔다(오너 요청).
 * 「남복하실 남자 2명 모집중」·「NTRP 3 이상 여자 모집중」처럼 **누구를 모으는지**를 쓰게 예시를 칸에 넣는다.
 */
export function MatchTitleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <Field
            id="match-title" label="방 제목" required
            message={
                <span className="flex justify-between gap-3">
                    <span>목록에 그대로 보입니다. 어떤 사람을 모으는지 적으면 신청이 빨라집니다.</span>
                    <span className="shrink-0 tabular-nums">{value.trim().length}/{MATCH_TITLE_MAX}</span>
                </span>
            }
        >
            <input
                id="match-title" value={value} maxLength={MATCH_TITLE_MAX} placeholder={MATCH_TITLE_PLACEHOLDER}
                onChange={(e) => onChange(e.target.value)} className={fieldClass()} required
            />
        </Field>
    )
}
