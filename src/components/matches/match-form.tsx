'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { fieldMessageClass } from '@/components/common/field-class'
import { FieldToggle } from '@/components/common/field-toggle'
import { FormActions } from '@/components/common/form-actions'
import { FormSectionCard } from '@/components/common/form-section-card'
import { MatchAccessField } from '@/components/matches/match-access-field'
import { MatchFeeFields } from '@/components/matches/match-fee-fields'
import { MatchInviteField } from '@/components/matches/match-invite-field'
import { MatchEndField, MatchStartWarning } from '@/components/matches/match-schedule-fields'
import { MatchTitleField } from '@/components/matches/match-title-field'
import { useMatchForm, type MatchFormValues } from '@/components/matches/use-match-form'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { createMatchAction, updateMatchAction } from '@/lib/actions/matches'
import { MATCH_TYPE_OPTIONS } from '@/lib/design/match-type-style'

type Props = {
    viewerId: string
    initial: MatchFormValues
    recentCourtNames: string[]
    /** 있으면 수정 화면 — typeLocked = 게임이 있어 종목을 바꿀 수 없다, wasPrivate = 지금 비공개(비밀번호는 바꿀 때만) */
    edit?: { matchId: string; typeLocked: boolean; wasPrivate: boolean }
}

/**
 * 매칭 만들기 · 매칭 정보 수정 — 같은 폼이다. 스코어는 여기서 받지 않는다(매칭 안의 게임 보드에서 기록한다).
 * 「매칭 정보」: 종목 → 날짜(2칸) │ 시작 │ 종료 → 표면 → 코트명 │ 코트 번호 → 코트 비용 │ 인원 → **방 제목** → 메모(선택). 「누구와」: 공개 범위 → 회원 초대.
 * 칸은 모두 칸 규칙(`field-class`, 44px). 이미 시작한 시각을 고르면 일정 줄 아래에 주의 한 줄(막지는 않는다) —
 * 수정 화면은 날짜·시각을 바꿨을 때만. 수정 화면에는 회원 초대가 없다(매칭 화면의 [회원 초대]가 맡는다).
 */
export function MatchForm({ viewerId, initial, recentCourtNames, edit }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const { values: v, set, setMatchType, toInput } = useMatchForm(initial)
    const back = edit ? `/matches/${edit.matchId}` : '/matches'
    const scheduleChanged = v.playedAt !== initial.playedAt || v.playedTime !== initial.playedTime

    function submit() {
        setError(null)
        startTransition(async () => {
            const result = edit ? await updateMatchAction(edit.matchId, toInput(), edit.wasPrivate) : await createMatchAction(toInput())
            const id = edit ? edit.matchId : 'matchId' in result ? result.matchId : undefined
            if (result.error || !id) return setError(result.error ?? '저장하지 못했습니다.')
            router.push(`/matches/${id}`)
            router.refresh()
        })
    }

    return (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <FormSectionCard title="매칭 정보" step="01" contentClassName="space-y-4">
                <div>
                    <FieldToggle label="종목" required options={MATCH_TYPE_OPTIONS} value={v.matchType} onChange={setMatchType} disabled={edit?.typeLocked} />
                    {edit?.typeLocked && <p className={fieldMessageClass()}>게임이 있는 매칭은 종목을 바꿀 수 없습니다(대진의 자리 수가 종목을 따릅니다).</p>}
                </div>
                <MatchMetaSection
                    playedAt={v.playedAt} onPlayedAtChange={set('playedAt')}
                    playedTime={v.playedTime} onPlayedTimeChange={set('playedTime')}
                    surface={v.surface} onSurfaceChange={set('surface')}
                    courtName={v.courtName} onCourtNameChange={set('courtName')}
                    recentCourtNames={recentCourtNames}
                    timeLabel="시작" surfaceHint={false} courtRequired
                    courtNo={{ value: v.courtNo, onChange: set('courtNo') }}
                    scheduleExtra={<MatchEndField start={v.playedTime} duration={v.duration} onChange={set('duration')} />}
                    scheduleNote={<MatchStartWarning playedAt={v.playedAt} playedTime={v.playedTime} show={!edit || scheduleChanged} />}
                />
                <MatchFeeFields fee={v.courtFee} onFeeChange={set('courtFee')} capacity={v.capacity} onCapacityChange={set('capacity')} />
                <MatchTitleField value={v.title} onChange={set('title')} />
                <NotesSection
                    notes={v.notes} onNotesChange={set('notes')} label="메모" rows={3}
                    placeholder="준비물·회비·주차 등 — 매칭 화면 위쪽에 보입니다"
                />
            </FormSectionCard>

            <FormSectionCard title="누구와" step="02" contentClassName="space-y-4">
                <MatchAccessField
                    access={v.access} onAccessChange={set('access')} password={v.password} onPasswordChange={set('password')}
                    passwordOptional={!!edit?.wasPrivate}
                />
                {!edit && <MatchInviteField viewerId={viewerId} picks={v.invitees} onChange={set('invitees')} />}
            </FormSectionCard>

            {error && <p role="alert" className="text-body2 text-destructive">{error}</p>}
            <FormActions
                submitLabel={edit ? '저장' : '매칭 만들기'} pendingLabel={edit ? '저장 중...' : '만드는 중...'}
                onCancel={() => router.push(back)} isPending={isPending}
            />
        </form>
    )
}
