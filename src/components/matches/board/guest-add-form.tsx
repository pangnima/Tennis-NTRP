'use client'

import { useState, useTransition } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { fieldClass } from '@/components/common/field-class'
import { SegmentedToggle } from '@/components/common/segmented-toggle'
import { fixedGuestGender, guestKey, type PoolPlayer } from '@/lib/games/board'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'
import type { MatchType } from '@/types'

type Props = {
    /** 종목 — 남복·여복이면 성별이 그 종목의 성별로 고정된다 */
    matchType: MatchType
    taken: (key: string) => boolean
    /** 넣기 — 서버에 저장하는 자리는 에러 문구(없으면 null)를 약속으로 돌려준다. 기다리는 동안 버튼이 잠기고, 실패하면 입력이 남는다 */
    onAdd: (guest: PoolPlayer) => void | Promise<string | null>
    /** 없으면 [취소]를 그리지 않는다(초대 화면처럼 닫을 일이 없는 자리) */
    onCancel?: () => void
    /** 안내 한 줄 — 기본은 매칭 명단의 말, 다른 자리는 자기 말을 넘긴다 */
    note?: string
    submitLabel?: string
}

const ROSTER_NOTE = '회원이 아닌 사람을 참가자로 넣습니다. 정원에 포함되고, 대진에 넣을 수 있습니다.'
const GENDER_OPTIONS = [{ value: 'male' as const, label: '남' }, { value: 'female' as const, label: '여' }]

/** 패널 안의 작은 칸(md 36px) — 옆의 sm 버튼·토글과 한 줄 */
const INPUT = fieldClass({ size: 'md', className: 'px-2' })

/**
 * 비회원 한 명을 적는 줄 — 이름·NTRP·**성별**·주력손. **네 자리가 이 하나를 쓴다**: 매칭 참가자 표 · 자동 대진표 ·
 * 초대 링크 화면(본인이 적는다) · 경기 기록. 통계가 상대의 NTRP·주력손을 읽고, 대진(혼복 1남1녀)과 이름 옆 표시가 성별을 읽는다.
 * 성별은 종목과 상관없이 언제나 받되 **남복 = 남 · 여복 = 여로 고정**이다(토글은 보이고 잠긴다 — `fixedGuestGender`).
 */
export function GuestAddForm({ matchType, taken, onAdd, onCancel, note = ROSTER_NOTE, submitLabel = '추가' }: Props) {
    const fixed = fixedGuestGender(matchType)
    const [name, setName] = useState('')
    const [ntrp, setNtrp] = useState('')
    const [hand, setHand] = useState<'right' | 'left'>('right')
    const [picked, setPicked] = useState<'male' | 'female'>('male')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const gender = fixed ?? picked

    function add() {
        const trimmed = name.trim()
        const value = Number(ntrp)
        if (trimmed.length < 1 || trimmed.length > 20) return setError('이름을 1~20자로 적어 주세요.')
        if (!Number.isFinite(value) || value < 1 || value > 7) return setError('NTRP는 1.0~7.0 사이로 적어 주세요.')
        if (taken(guestKey(trimmed))) return setError('같은 이름의 비회원이 이미 있습니다.')
        const guest: PoolPlayer = { key: guestKey(trimmed), name: trimmed, ntrp: value, hand, gender, isMember: false }
        startTransition(async () => {
            const failed = await onAdd(guest)
            if (failed) return setError(failed)
            setName('')
            setNtrp('')
            setError(null)
        })
    }

    return (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <p className={cn(TYPO.caption, 'break-keep')}>{note}</p>
            <div className="flex flex-wrap items-center gap-2">
                <input aria-label="비회원 이름" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} className={cn(INPUT, 'w-32')} />
                <input aria-label="비회원 NTRP" placeholder="NTRP" inputMode="decimal" value={ntrp} onChange={(e) => setNtrp(e.target.value)} className={cn(INPUT, 'w-20')} />
                <SegmentedToggle options={GENDER_OPTIONS} value={gender} onValueChange={setPicked} disabled={fixed !== null} ariaLabel="비회원 성별" />
                <SegmentedToggle options={[{ value: 'right', label: '오른손' }, { value: 'left', label: '왼손' }]} value={hand} onValueChange={setHand} ariaLabel="비회원 주력손" />
                <ActionButton size="sm" onClick={add} disabled={isPending}>{submitLabel}</ActionButton>
                {onCancel && <ActionButton size="sm" onClick={onCancel} disabled={isPending}>취소</ActionButton>}
            </div>
            {fixed && <p className={cn(TYPO.caption, 'break-keep')}>{MATCH_TYPE_LABELS[matchType]}이라 성별은 「{fixed === 'male' ? '남' : '여'}」로 정해져 있습니다.</p>}
            {error && <p role="alert" className={cn(TYPO.caption, 'text-destructive')}>{error}</p>}
        </div>
    )
}
