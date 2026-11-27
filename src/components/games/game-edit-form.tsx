'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { FormActions } from '@/components/common/form-actions'
import { FormSectionCard } from '@/components/common/form-section-card'
import { MatchEndField } from '@/components/matches/match-schedule-fields'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { SetsSection } from '@/components/personal-matches/form-sections/sets-section'
import { useSetScores } from '@/components/personal-matches/use-set-scores'
import { updateGameAction } from '@/lib/actions/games'
import { isDoubles, validateSets } from '@/lib/games/input'
import { setsForSeat, setsFromSeat, viewSeat } from '@/lib/games/perspective'
import { DEFAULT_DURATION_MINUTES } from '@/lib/matches/when'
import type { CourtSurface, Game } from '@/types'

type Props = { game: Game; viewerId: string; recentCourtNames: string[]; returnTo: string }

const nameAt = (game: Game, team: 1 | 2, slot: 1 | 2, viewerId: string) => {
    const p = game.players.find((x) => x.team === team && x.slot === slot)
    return p ? (p.userId === viewerId ? '나' : p.name) : ''
}

/**
 * 스코어 수정(직접 기록의 게임 하나) — **스코어는 하나**(0105)이고 보는 사람의 좌석 관점으로 적는다. 선수 구성은 여기서
 * 못 바꾼다(지우고 다시 기록). 「경기 정보」 칸은 기록 폼·매칭 만들기와 같다(날짜│시작│종료·표면·코트명│코트 번호).
 * 스코어를 바꾸면 수정 기록에 남는다.
 */
export function GameEditForm({ game, viewerId, recentCourtNames, returnTo }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const seat = viewSeat(game, viewerId)
    const doubles = isDoubles(game.matchType)
    const other = seat.team === 1 ? 2 : 1
    const scores = useSetScores(setsForSeat(game, seat))
    const [playedAt, setPlayedAt] = useState(game.playedAt)
    const [playedTime, setPlayedTime] = useState(game.playedTime ?? '')
    const [surface, setSurface] = useState<CourtSurface | ''>(game.surface ?? '')
    const [courtName, setCourtName] = useState(game.courtName ?? '')
    const [duration, setDuration] = useState(String(game.durationMinutes ?? DEFAULT_DURATION_MINUTES))
    const [courtNo, setCourtNo] = useState(game.courtNo ?? '')
    const [notes, setNotes] = useState(game.notes ?? '')

    function submit() {
        const sets = setsFromSeat(scores.sets, seat, doubles)
        const invalid = validateSets(sets)
        if (invalid) return setError(invalid)
        setError(null)
        startTransition(async () => {
            const result = await updateGameAction(game.id, {
                sets, notes, playedAt, playedTime: playedTime || undefined, durationMinutes: Number(duration) || undefined,
                surface: surface || undefined, courtName, courtNo,
            })
            if (result.error) return setError(result.error)
            router.push(returnTo)
            router.refresh()
        })
    }

    return (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <FormSectionCard title="스코어" step="01">
                <SetsSection
                    sets={scores.sets}
                    isDoubles={doubles}
                    single
                    opponentLabel={[nameAt(game, other, 1, viewerId), nameAt(game, other, 2, viewerId)].filter(Boolean).join(' · ')}
                    onUpdateSet={scores.updateSet}
                    myAdLabels={{ me: nameAt(game, seat.team, seat.slot, viewerId), partner: nameAt(game, seat.team, seat.slot === 1 ? 2 : 1, viewerId) }}
                    oppAdLabels={{ opponent: nameAt(game, other, 1, viewerId), opponent2: nameAt(game, other, 2, viewerId) }}
                    onMyAd={scores.setMyAd}
                    onOppAd={scores.setOppAd}
                />
            </FormSectionCard>
            <FormSectionCard title={game.matchId ? '메모' : '경기 정보'} step="02" contentClassName="space-y-4">
                {!game.matchId && (
                    <MatchMetaSection
                        playedAt={playedAt} onPlayedAtChange={setPlayedAt}
                        playedTime={playedTime} onPlayedTimeChange={setPlayedTime}
                        surface={surface} onSurfaceChange={setSurface}
                        courtName={courtName} onCourtNameChange={setCourtName}
                        recentCourtNames={recentCourtNames}
                        timeLabel="시작" surfaceHint={false}
                        courtNo={{ value: courtNo, onChange: setCourtNo }}
                        scheduleExtra={<MatchEndField start={playedTime} duration={duration} onChange={setDuration} />}
                    />
                )}
                <NotesSection notes={notes} onNotesChange={setNotes} />
            </FormSectionCard>
            {error && <p role="alert" className="text-body2 text-destructive">{error}</p>}
            <FormActions submitLabel="수정 완료" onCancel={() => router.push(returnTo)} isPending={isPending} />
        </form>
    )
}
