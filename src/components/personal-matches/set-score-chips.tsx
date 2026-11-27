import type { PersonalMatchSetScore } from '@/types'
import { gameChipClass } from '@/lib/personal-matches/result-badge'

/** 게임(세트) 스코어 칩 목록 — 게임마다 승/패/무 색이 갈린다. 경기 카드·요약 패널 공용. */
export function GameScoreChips({ sets, className = '' }: { sets: PersonalMatchSetScore[]; className?: string }) {
    return (
        <div className={`flex items-center gap-1.5 flex-wrap min-w-0 ${className}`}>
            {sets.map((s, i) => (
                <span
                    key={i}
                    className={`px-1.5 py-1 rounded-[4px] text-caption font-semibold tabular-nums ${gameChipClass(s)}`}
                >
                    {s.me}-{s.opp}
                </span>
            ))}
        </div>
    )
}
