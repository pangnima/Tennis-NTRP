'use client'

import { Field } from '@/components/common/field'
import { fieldClass } from '@/components/common/field-class'

type NotesSectionProps = {
    notes: string
    onNotesChange: (v: string) => void
    /** 라벨 — 매칭 폼은 「메모」(선택)로 방 제목 아래에 둔다. 없으면 라벨 없이 칸만(직접 기록의 「메모」 카드 안) */
    label?: string
    placeholder?: string
    rows?: number
}

/** 메모 입력 — 여러 줄 칸(칸 규칙 `fieldClass({ multiline: true })`) */
export function NotesSection({ notes, onNotesChange, label, placeholder = '경기 관련 메모', rows = 2 }: NotesSectionProps) {
    const textarea = (
        <textarea
            id={label ? 'notes' : undefined}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={fieldClass({ multiline: true })}
        />
    )
    return label ? <Field id="notes" label={label} optional>{textarea}</Field> : <div>{textarea}</div>
}
