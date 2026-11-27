import type { HeadToHeadMatchEntry } from '@/lib/analytics/head-to-head'
import { H2H_OUTCOME_STYLE, H2H_OUTCOME_LABEL } from '@/lib/design/outcome'
import { MATCH_TYPE_LABELS, getMatchTypeStyle } from '@/lib/design/match-type-style'
import { SURFACE_LABELS } from '@/lib/design/surface'

type Props = {
    m: HeadToHeadMatchEntry
    myName: string
    opponentDisplayName: string
}

/** 경기 1행 — 타입(텍스트)·표면·스코어·결과 + (복식) 파트너 · 시간/메모 서브라인 */
export function H2HMatchRow({ m, myName, opponentDisplayName }: Props) {
    const isDoubles = m.matchType !== 'singles'
    const sub: string[] = []
    if (m.playedTime) sub.push(m.playedTime)
    if (m.notes) sub.push(m.notes)

    return (
        <div className="py-1.5 border-b border-border last:border-0 space-y-1">
            <div className="flex items-center gap-2 text-caption">
                <span className="w-20 shrink-0 text-left text-foreground">{m.date}</span>
                <span className={`shrink-0 font-medium ${getMatchTypeStyle(m.matchType).textClass}`}>
                    {MATCH_TYPE_LABELS[m.matchType]}
                </span>
                {m.surface && <span className="shrink-0 text-foreground">{SURFACE_LABELS[m.surface]}</span>}
                <span className="flex-1 min-w-0 text-left text-foreground truncate">{m.score || '—'}</span>
                <span className={`inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-sm text-caption font-bold border ${H2H_OUTCOME_STYLE[m.outcome]}`}>
                    {H2H_OUTCOME_LABEL[m.outcome]}
                </span>
            </div>
            {isDoubles && (m.myPartnerName || m.opponentPartnerName) && (
                <p className="text-caption text-foreground pl-1 truncate">
                    {myName}{m.myPartnerName ? `·${m.myPartnerName}` : ''} vs {opponentDisplayName}{m.opponentPartnerName ? `·${m.opponentPartnerName}` : ''}
                </p>
            )}
            {sub.length > 0 && (
                <p className="text-caption text-foreground pl-1 truncate">{sub.join(' · ')}</p>
            )}
        </div>
    )
}
