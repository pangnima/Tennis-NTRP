'use client'

import { useState } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { fieldClass } from '@/components/common/field-class'
import { SegmentedToggle } from '@/components/common/segmented-toggle'
import { LineupPoolPicker } from '@/components/matches/board/lineup-pool-picker'
import type { PoolPlayer } from '@/lib/games/board'
import {
    COURT_OPTIONS, PER_PLAYER_OPTIONS, buildLineup, gamesForPerPlayer, recommendPerPlayer, toLineupPlayers, type LineupGame,
} from '@/lib/games/lineup'
import { CARD_BASE, TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'
import type { MatchType } from '@/types'

type Props = {
    pool: PoolPlayer[]
    matchType: MatchType
    durationMinutes: number
    hasScored: boolean
    onApply: (games: LineupGame[]) => void
    /** 명단에 비회원을 넣는다(참가자 표의 [+ 비회원 추가]와 같은 문) — 실패하면 문구를 돌려준다 */
    onAddGuest: (guest: PoolPlayer) => Promise<string | null>
    onClose: () => void
}

const ROW = 'flex flex-wrap items-center gap-x-3 gap-y-2'
const LABEL = cn(TYPO.label, 'w-14 shrink-0')

/**
 * 자동 대진표 — 참가자(온 사람만, [+ 비회원]으로 바로 추가) · 코트 면 수 · 1인당 게임 수를 고르면 보드에 대진을 채운다(저장 전).
 * 점수가 들어간 게임은 그대로 두고 예정 게임만 바꾼다. [다시 뽑기]는 시드만 바꿔 같은 조건의 다른 대진을 낸다.
 * 머리에 「자동 대진표」와 [닫기] — 제목 옆 [자동 대진표]도 같은 토글이다.
 */
export function AutoLineupPanel({ pool, matchType, durationMinutes, hasScored, onApply, onAddGuest, onClose }: Props) {
    const [excluded, setExcluded] = useState<Set<string>>(new Set())
    const [courts, setCourts] = useState(1)
    const [seed, setSeed] = useState(1)
    const [warnings, setWarnings] = useState<string[]>([])
    const [built, setBuilt] = useState(false)
    const picked = pool.filter((p) => !excluded.has(p.key))
    const recommended = recommendPerPlayer({ durationMinutes, courts, playerCount: picked.length, matchType })
    const [perPlayer, setPerPlayer] = useState<number | null>(null)
    const per = perPlayer ?? recommended ?? 4
    const total = gamesForPerPlayer(picked.length, per, matchType)

    function build(nextSeed: number) {
        const result = buildLineup(toLineupPlayers(picked.map((p) => ({ ...p, isMember: p.isMember }))), { matchType, games: total, seed: nextSeed, courts })
        setWarnings(result.warnings)
        if (result.games.length > 0) {
            onApply(result.games)
            setBuilt(true)
        }
        setSeed(nextSeed)
    }

    const toggle = (key: string) => setExcluded((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
    })

    return (
        <section aria-label="자동 대진표" className={cn(CARD_BASE, 'space-y-3 p-4')}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={TYPO.body2Strong}>자동 대진표</p>
                    <p className={cn(TYPO.caption, 'break-keep')}>참가자·코트 수·1인당 게임 수를 고르면 보드에 대진을 채웁니다. 저장하기 전까지는 바뀌지 않습니다.</p>
                </div>
                <ActionButton size="sm" variant="ghost" onClick={onClose}>닫기</ActionButton>
            </div>
            <div className="flex items-start gap-3">
                <span className={cn(LABEL, 'pt-2')}>참가자</span>
                <LineupPoolPicker pool={pool} excluded={excluded} onToggle={toggle} matchType={matchType} onAddGuest={onAddGuest} />
            </div>
            <div className={ROW}>
                <span className={LABEL}>코트</span>
                <SegmentedToggle options={COURT_OPTIONS.map((c) => ({ value: String(c), label: `${c}면` }))} value={String(courts)} onValueChange={(v) => setCourts(Number(v))} />
            </div>
            <div className={ROW}>
                <span className={LABEL}>1인당</span>
                <select aria-label="1인당 게임 수" value={per} onChange={(e) => setPerPlayer(Number(e.target.value))}
                    className={fieldClass({ size: 'md', className: 'w-auto px-2' })}>
                    {PER_PLAYER_OPTIONS.map((n) => <option key={n} value={n}>{n}게임{n === recommended ? ' (권장)' : ''}</option>)}
                </select>
                <span className={TYPO.body2}>참가 {picked.length}명 · 총 {total}게임</span>
            </div>
            {hasScored && <p className={TYPO.body2Muted}>스코어가 들어간 게임은 그대로 두고, 예정 게임만 새 대진으로 바꿉니다.</p>}
            {warnings.length > 0 && <ul className={cn(TYPO.body2, 'list-disc space-y-0.5 pl-5 text-spot')}>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            <div className="flex justify-end gap-2">
                {built && <ActionButton size="md" onClick={() => build(seed + 1)}>다시 뽑기</ActionButton>}
                <ActionButton size="md" variant="solid" onClick={() => build(seed)} disabled={total < 1}>대진표 만들기</ActionButton>
            </div>
        </section>
    )
}
