'use client'

import type { PersonalMatchSetScore } from '@/types'
import { SetScoreRow } from '@/components/personal-matches/set-score-row'

type SetsSectionProps = {
    sets: PersonalMatchSetScore[]
    isDoubles: boolean
    // 스코어 라벨 우측에 표시할 상대(팀) 이름
    opponentLabel: string
    onUpdateSet: (i: number, field: 'me' | 'opp', val: string) => void
    myAdLabels?: { me: string; partner: string }
    oppAdLabels?: { opponent: string; opponent2: string }
    onMyAd?: (i: number, v: 'me' | 'partner' | undefined) => void
    onOppAd?: (i: number, v: 'opponent' | 'opponent2' | undefined) => void
}

/**
 * 스코어 입력 영역 — 나/상대 라벨 + 스코어 한 줄(SetScoreRow). 한 게임 = 스코어 하나(0105).
 */
export function SetsSection({
    sets, isDoubles, opponentLabel, myAdLabels, oppAdLabels,
    onUpdateSet, onMyAd, onOppAd,
}: SetsSectionProps) {
    return (
        <div>
            {/* 왼쪽=나(등록유저), 오른쪽=상대 라벨 */}
            <div className="flex items-center gap-2 mb-1">
                <span className="w-10" />
                <span className="w-16 text-center text-caption text-muted-foreground truncate">나</span>
                <span className="w-3" />
                <span className="w-16 text-center text-caption text-muted-foreground truncate">{opponentLabel}</span>
            </div>
            {/* 복식 게임은 각 행이 mt-6/구분선으로 간격을 가지므로 래퍼 space-y 제거 */}
            <div className={isDoubles ? '' : 'space-y-2'}>
                {sets.map((s, i) => (
                    <SetScoreRow
                        key={i}
                        index={i}
                        set={s}
                        isDoubles={isDoubles}
                        onChange={(field, val) => onUpdateSet(i, field, val)}
                        onMyAdChange={onMyAd ? (v) => onMyAd(i, v) : undefined}
                        onOppAdChange={onOppAd ? (v) => onOppAd(i, v) : undefined}
                        myAdLabels={myAdLabels}
                        oppAdLabels={oppAdLabels}
                    />
                ))}
            </div>
        </div>
    )
}
