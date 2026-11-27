'use client'

import { useState } from 'react'

import type { MemberPick } from '@/components/common/member-search/member-pick-chips'
import type { MatchAccess } from '@/components/matches/match-access-field'
import type { MatchInput } from '@/lib/actions/matches'
import { defaultCapacity, parseAmount } from '@/lib/matches/fee'
import type { CourtSurface, MatchType } from '@/types'

/** 매칭 만들기·수정 폼의 값 — 수정 화면은 지금 매칭의 값으로, 만들기는 최근 기록의 기본값으로 연다 */
export type MatchFormValues = {
    title: string
    matchType: MatchType
    playedAt: string
    playedTime: string
    /** EnumSelect가 문자열을 다룬다 */
    duration: string
    surface: CourtSurface | ''
    courtName: string
    /** 코트 번호(선택) */
    courtNo: string
    /** 코트 비용 총액(선택) — 쉼표가 들어간 글자 */
    courtFee: string
    /** 정원(호스트 포함) — 숫자 글자 */
    capacity: string
    notes: string
    access: MatchAccess
    password: string
    invitees: MemberPick[]
}

/**
 * 폼 상태 한 덩어리 — 필드마다 useState를 두면 폼 컴포넌트가 100줄을 넘는다.
 * `set('title')`처럼 필드 이름으로 setter를 꺼내고, 갱신은 함수형이라 한 이벤트에서 여러 번 고쳐도 덮어쓰지 않는다.
 */
export function useMatchForm(initial: MatchFormValues) {
    const [values, setValues] = useState<MatchFormValues>(initial)
    const set = <K extends keyof MatchFormValues>(key: K) => (value: MatchFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }))

    /** 서버 액션에 넘길 모양 */
    function toInput(): MatchInput {
        return {
            title: values.title,
            matchType: values.matchType,
            playedAt: values.playedAt,
            playedTime: values.playedTime,
            durationMinutes: Number(values.duration),
            surface: values.surface || undefined,
            courtName: values.courtName,
            courtNo: values.courtNo,
            courtFee: parseAmount(values.courtFee),
            capacity: parseAmount(values.capacity) ?? Number.NaN,
            notes: values.notes,
            isListed: values.access === 'public',
            password: values.password,
            inviteeIds: values.invitees.map((i) => i.userId),
        }
    }

    /** 종목을 바꾸면 정원이 **그 종목의 기본값일 때만** 새 기본값으로 따라간다(직접 고친 값은 둔다) */
    const setMatchType = (next: MatchType) => setValues((prev) => ({
        ...prev, matchType: next,
        capacity: prev.capacity === String(defaultCapacity(prev.matchType)) ? String(defaultCapacity(next)) : prev.capacity,
    }))

    return { values, set, setMatchType, toInput }
}
