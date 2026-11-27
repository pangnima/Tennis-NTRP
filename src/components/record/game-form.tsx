'use client'

import { FieldToggle } from '@/components/common/field-toggle'
import { FormActions } from '@/components/common/form-actions'
import { FormSectionCard } from '@/components/common/form-section-card'
import { MatchEndField } from '@/components/matches/match-schedule-fields'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { RecordGameRows } from '@/components/record/record-game-rows'
import { RecordPoolField } from '@/components/record/record-pool-field'
import { useGameForm, type GameFormDefaults } from '@/components/record/use-game-form'
import { MATCH_TYPE_OPTIONS } from '@/lib/dashboard/match-type-style'

type Props = { defaults: GameFormDefaults; recentCourtNames: string[] }

/**
 * 경기 기록 폼 — 매칭 없이 친 경기를 **한 장**에 남긴다. 구성은 매칭 만들기와 같다:
 *   01 「경기 정보」 종목 → 날짜(2칸) │ 시작 │ 종료 → 표면 → 코트명 │ 코트 번호 → 메모(같은 `MatchMetaSection`)
 *   02 「누구와」 참가자 여러 명(나 + 회원 검색 + 비회원)   03 「게임」 매칭룸 게임 보드와 같은 줄(대진 + 스코어)
 * 줄 하나가 한 게임이다(0105 — 한 게임 = 스코어 하나). 저장하면 곧 전적·통계에 반영되고, 같은 날짜·시각·코트의 게임은
 * 경기 결과에서 한 묶음으로 보인다. 방 제목·코트 비용·인원·공개 범위는 매칭에만 있다.
 */
export function GameForm({ defaults, recentCourtNames }: Props) {
    const s = useGameForm(defaults)

    return (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); s.submit() }}>
            <FormSectionCard title="경기 정보" step="01" contentClassName="space-y-4">
                <FieldToggle label="종목" required options={MATCH_TYPE_OPTIONS} value={s.matchType} onChange={s.setMatchType} />
                <MatchMetaSection
                    playedAt={s.playedAt} onPlayedAtChange={s.setPlayedAt}
                    playedTime={s.playedTime} onPlayedTimeChange={s.setPlayedTime}
                    surface={s.surface} onSurfaceChange={s.setSurface}
                    courtName={s.courtName} onCourtNameChange={s.setCourtName}
                    recentCourtNames={recentCourtNames}
                    timeLabel="시작" surfaceHint={false}
                    courtNo={{ value: s.courtNo, onChange: s.setCourtNo }}
                    scheduleExtra={<MatchEndField start={s.playedTime} duration={s.duration} onChange={s.setDuration} />}
                />
                <NotesSection notes={s.notes} onNotesChange={s.setNotes} label="메모" rows={3} placeholder="경기 관련 메모" />
            </FormSectionCard>

            <FormSectionCard title="누구와" step="02">
                <RecordPoolField s={s} viewerId={defaults.viewerId} viewerName={defaults.viewerName} />
            </FormSectionCard>

            <FormSectionCard title="게임" step="03">
                <RecordGameRows s={s} />
            </FormSectionCard>

            {s.error && <p role="alert" className="text-body2 text-destructive">{s.error}</p>}
            <FormActions submitLabel="경기 저장" onCancel={s.cancel} isPending={s.isPending} />
        </form>
    )
}
