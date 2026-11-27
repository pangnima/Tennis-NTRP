'use client'

import { fieldClass } from '@/components/common/field-class'
import { BoardScoreValue } from '@/components/matches/board/board-score-value'
import type { ScorePair } from '@/lib/games/board'
import { cn } from '@/lib/utils'

type Props = {
    scores: ScorePair[]
    label: string
    onChange: (set: number, side: 't1' | 't2', value: string) => void
    readOnly?: boolean
    /** 카드 모드의 좌우 배치 — 칸을 40px로 줄여 양쪽 선수 칸에 폭을 내준다 */
    compact?: boolean
}

/** 표 안의 작은 칸(md 36px) — 칸 규칙 한 모양에 폭·가운데 정렬만 덧붙인다 */
const INPUT = fieldClass({ size: 'md', className: 'w-11 px-0 text-center font-semibold tabular-nums' })

/**
 * 스코어 칸 — `[팀1] : [팀2]`. 둘 다 비우면 「예정」 게임이다. 세트가 여럿인 게임은 세트 수만큼 세로로 선다.
 * **보기 모드도 같은 뼈대**(w-11 숫자 칸 : w-11 숫자 칸)라 콜론은 언제나 칸 한가운데(칸 제목 「스코어」도 가운데),
 * 숫자는 입력 칸이 있던 자리 그대로다 — 모드를 바꿔도, 자릿수가 달라도(`10 : 8`) 움직이지 않는다.
 */
export function BoardScoreInput({ scores, label, onChange, readOnly = false, compact = false }: Props) {
    const input = cn(INPUT, compact && 'w-10')
    // 읽기 전용 보드의 예정 게임 — 값이 없다는 표시라 보조색 글자
    if (readOnly && scores.every((s) => s.t1 === '' && s.t2 === '')) {
        return <span className="justify-self-center text-body2 text-muted-foreground">예정</span>
    }
    return (
        <div className="flex flex-col items-center gap-1">
            {scores.map((s, i) => {
                const n = scores.length > 1 ? ` ${i + 1}` : ''
                return (
                    <div key={i} className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5')}>
                        {readOnly ? <BoardScoreValue pair={s} side="t1" /> : (
                            <input inputMode="numeric" aria-label={`${label} 팀1 스코어${n}`} value={s.t1} onChange={(e) => onChange(i, 't1', e.target.value)} className={input} />
                        )}
                        <span aria-hidden className="text-muted-foreground">:</span>
                        {readOnly ? <BoardScoreValue pair={s} side="t2" /> : (
                            <input inputMode="numeric" aria-label={`${label} 팀2 스코어${n}`} value={s.t2} onChange={(e) => onChange(i, 't2', e.target.value)} className={input} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
