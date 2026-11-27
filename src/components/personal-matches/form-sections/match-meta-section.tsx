'use client'

import type { ReactNode } from 'react'

import { EnumSelect } from '@/components/common/enum-select'
import { Field } from '@/components/common/field'
import { fieldClass, fieldMessageClass } from '@/components/common/field-class'
import { FieldToggle } from '@/components/common/field-toggle'
import { CourtNameAutocomplete } from '@/components/personal-matches/court-name-autocomplete'
import { SURFACE_OPTIONS } from '@/lib/dashboard/surface'
import { COURT_NO_MAX } from '@/lib/matches/court'
import { HOUR_OPTIONS } from '@/lib/format'
import type { CourtSurface } from '@/types'

type MatchMetaSectionProps = {
    playedAt: string
    onPlayedAtChange: (v: string) => void
    playedTime: string
    onPlayedTimeChange: (v: string) => void
    surface: CourtSurface | ''
    onSurfaceChange: (v: CourtSurface) => void
    courtName: string
    onCourtNameChange: (v: string) => void
    recentCourtNames: string[]
    /**
     * 날짜·시각과 **같은 줄**에 이어 붙일 칸(매칭 만들기의 종료 시각). 넘기면 날짜가 두 칸을 차지해
     * 날짜 │ 시작 │ 종료가 위의 4칸 토글(종목·표면)과 열이 맞는다. 넘기지 않으면 직접 기록 폼은 지금처럼 2열이다.
     */
    scheduleExtra?: ReactNode
    /** 일정 줄 바로 아래 한 줄(매칭 폼의 「이미 시작한 시각」 주의 문구) */
    scheduleNote?: ReactNode
    /** 시각 칸 라벨 — 직접 기록은 「경기 시각」, 매칭은 「시작」 */
    timeLabel?: string
    /** 코트 표면 아래 NTRP 안내 — 직접 기록 폼에서만(매칭과 무관하다) */
    surfaceHint?: boolean
    /** 매칭 — 코트명 필수(신청하는 사람이 어디서 치는지 알아야 한다). 직접 기록은 선택 */
    courtRequired?: boolean
    /** 넘기면 코트명(3칸) │ 코트 번호(1칸, 선택) 한 줄 — 매칭 폼만 */
    courtNo?: { value: string; onChange: (v: string) => void }
}

/**
 * 경기 메타 정보 — 날짜·시각(시 단위 셀렉트)·코트 표면(라디오형 FieldToggle)·코트명(선택, 최근 코트 재선택).
 * 칸은 모두 칸 규칙(`field-class`, 44px). 시각은 시만 받는다(네이티브 time 피커는 모바일에서 step을 무시해 분이 노출된다).
 */
export function MatchMetaSection({
    playedAt, onPlayedAtChange, playedTime, onPlayedTimeChange, surface, onSurfaceChange,
    courtName, onCourtNameChange, recentCourtNames, scheduleExtra, scheduleNote, timeLabel = '경기 시각', surfaceHint = true,
    courtRequired = false, courtNo,
}: MatchMetaSectionProps) {
    const court = (
        <Field id="court-name" label="코트명" required={courtRequired} optional={!courtRequired} className={courtNo ? 'col-span-3' : undefined}>
            <CourtNameAutocomplete id="court-name" value={courtName} recentCourtNames={recentCourtNames} onChange={onCourtNameChange} placeholder="예: 양재 시민의숲 테니스장" />
        </Field>
    )
    return (
        <>
            <div>
                {/* 종료 칸이 붙으면 4칸 — 칸 사이도 토글(FieldToggle)과 같은 6px라 날짜·시작·종료가 위 토글의 열에 정확히 선다 */}
                <div className={scheduleExtra ? 'grid grid-cols-2 gap-x-1.5 gap-y-3 sm:grid-cols-4' : 'grid grid-cols-2 gap-3'}>
                    <Field id="played-at" label="경기 날짜" required className={scheduleExtra ? 'col-span-2' : undefined}>
                        <input id="played-at" type="date" value={playedAt} onChange={(e) => onPlayedAtChange(e.target.value)} className={fieldClass()} required />
                    </Field>
                    <Field label={timeLabel} required>
                        <EnumSelect value={playedTime} onValueChange={onPlayedTimeChange} options={HOUR_OPTIONS} placeholder="시각 선택" ariaLabel={timeLabel} />
                    </Field>
                    {scheduleExtra}
                </div>
                {scheduleNote}
            </div>
            <div>
                <FieldToggle label="코트 표면" required options={SURFACE_OPTIONS} value={surface || undefined} onChange={onSurfaceChange} />
                {surfaceHint && <p className={fieldMessageClass()}>선수별 NTRP는 개인 레이팅(NTRP) 계산에 사용됩니다.</p>}
            </div>
            {courtNo ? (
                // 코트명(3칸) │ 코트 번호(1칸) — 칸 사이 6px로 위 토글의 열에 맞춘다
                <div className="grid grid-cols-4 items-start gap-x-1.5">
                    {court}
                    <Field id="court-no" label="코트 번호" optional>
                        <input
                            id="court-no" value={courtNo.value} maxLength={COURT_NO_MAX} placeholder="예: 3"
                            onChange={(e) => courtNo.onChange(e.target.value)} className={fieldClass()}
                        />
                    </Field>
                </div>
            ) : court}
        </>
    )
}
