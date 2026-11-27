'use client'

import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'

import { EnumSelect } from '@/components/common/enum-select'
import { Field } from '@/components/common/field'
import { fieldMessageClass } from '@/components/common/field-class'
import { endTimeOptions, hasStarted } from '@/lib/matches/when'
import { RECORD_PATH } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

/**
 * 종료 시각 — 보기는 시작 + 1~6시간(「18:00 (2시간)」, 자정 넘으면 「다음 날 …」). 값은 길이(분)라
 * 시작을 바꾸면 길이는 그대로 두고 종료가 따라 움직인다(캘린더 앱과 같은 방식, DB는 `duration_minutes`).
 */
export function MatchEndField({ start, duration, onChange }: { start: string; duration: string; onChange: (v: string) => void }) {
    return (
        <Field label="종료" required>
            <EnumSelect value={duration} onValueChange={onChange} options={endTimeOptions(start)} ariaLabel="종료 시각" />
        </Field>
    )
}

/**
 * 이미 시작한 시각을 골랐을 때의 주의 한 줄 — 막지는 않는다(모인 뒤 방을 만들어 게임을 적는 경우가 있다).
 * 시작이 지나면 참가 신청을 받을 수 없고, 경기가 끝나면 [전체] 목록에서 사라진다. 지난 경기는 직접 기록으로.
 * `show = false`면 그리지 않는다(수정 화면에서 날짜·시각을 바꾸지 않았을 때 — 진행 중 매칭의 제목만 고치는 경우).
 */
export function MatchStartWarning({ playedAt, playedTime, show = true }: { playedAt: string; playedTime: string; show?: boolean }) {
    if (!show || !hasStarted({ playedAt, playedTime })) return null
    return (
        <p role="status" className={cn(fieldMessageClass('warning'), 'flex items-start gap-1.5')}>
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
                이미 시작한 시각입니다. 이대로 만들면 참가 신청을 받을 수 없고, 경기가 끝나면 목록에서 사라집니다.
                지난 경기는 <Link href={RECORD_PATH} className="underline underline-offset-2">경기 기록</Link>으로 남길 수 있습니다.
            </span>
        </p>
    )
}
