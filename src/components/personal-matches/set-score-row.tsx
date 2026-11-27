'use client'

import type { PersonalMatchSetScore } from '@/types'
import { fieldClass } from '@/components/common/field-class'
import { AdDeuceToggle } from '@/components/personal-matches/ad-deuce-toggle'
import { cn } from '@/lib/utils'

type SetScoreRowProps = {
    index: number
    set: PersonalMatchSetScore
    isDoubles: boolean
    onChange: (field: 'me' | 'opp', val: string) => void
    onMyAdChange?: (v: 'me' | 'partner' | undefined) => void
    onOppAdChange?: (v: 'opponent' | 'opponent2' | undefined) => void
    // 복식 애드/듀스 토글에 표시할 선수 이름
    myAdLabels?: { me: string; partner: string }
    oppAdLabels?: { opponent: string; opponent2: string }
}

/** 스코어 수정 폼의 스코어 칸 — 폼의 칸이라 lg(44px). 칸 규칙 한 모양에 폭·가운데 정렬만 덧붙인다 */
const scoreInputClass = fieldClass({ className: 'w-14 px-2 text-center font-semibold tabular-nums' })

/**
 * 스코어 수정 폼의 스코어 한 줄(내/상대 점수 + 복식 애드/듀스).
 * 입력 정규화(빈값→NaN→제출 시 0)는 상위 폼이 담당하고, 여기서는 표시·이벤트 전달만 한다.
 * 보는 사람 관점(me/opp)의 모델(PersonalMatchSetScore)이고, 저장할 때 절대 좌표(t1/t2)로 바꾼다(`setsFromSeat`).
 */
export function SetScoreRow({
    index, set, isDoubles,
    onChange, onMyAdChange, onOppAdChange,
    myAdLabels, oppAdLabels,
}: SetScoreRowProps) {
    // 복식 + 라벨·핸들러가 모두 주어졌을 때만 토글 렌더
    const showAdDeuce = isDoubles && !!myAdLabels && !!oppAdLabels && !!onMyAdChange && !!onOppAdChange
    return (
        <div className={isDoubles ? cn('space-y-2', index > 0 && 'mt-6 border-t border-border pt-6') : ''}>
            <div className="flex items-center gap-2">
                <span className="text-caption text-muted-foreground w-10">스코어</span>
                <input
                    type="number"
                    min={0} max={99}
                    value={Number.isNaN(set.me) ? '' : set.me}
                    onChange={(e) => onChange('me', e.target.value)}
                    aria-label="내 점수"
                    className={scoreInputClass}
                />
                <span className="w-3 text-center text-muted-foreground">-</span>
                <input
                    type="number"
                    min={0} max={99}
                    value={Number.isNaN(set.opp) ? '' : set.opp}
                    onChange={(e) => onChange('opp', e.target.value)}
                    aria-label="상대 점수"
                    className={scoreInputClass}
                />
            </div>
            {/* 복식: 게임별 애드/듀스 코트 */}
            {showAdDeuce && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <AdDeuceToggle
                        label="내 팀 백핸드"
                        options={[
                            { value: 'me', label: myAdLabels!.me },
                            { value: 'partner', label: myAdLabels!.partner },
                        ]}
                        value={set.myAd}
                        onChange={onMyAdChange!}
                    />
                    <AdDeuceToggle
                        label="상대팀 백핸드"
                        options={[
                            { value: 'opponent', label: oppAdLabels!.opponent },
                            { value: 'opponent2', label: oppAdLabels!.opponent2 },
                        ]}
                        value={set.oppAd}
                        onChange={onOppAdChange!}
                    />
                </div>
            )}
        </div>
    )
}
