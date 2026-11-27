import { BarChart3, PencilLine, PlusCircle, Zap } from 'lucide-react'

import { TYPO } from '@/lib/design/tokens'
import { GUIDE_FLOW } from '@/lib/guide/content'
import { cn } from '@/lib/utils'

const ICONS = [PlusCircle, Zap, PencilLine, BarChart3]

/** 흐름 네 단계 — 문구는 사용 가이드와 같은 데이터(`lib/guide/content.ts`)를 읽는다. */
export function FlowSection() {
    return (
        <section id="flow" className="mx-auto max-w-6xl scroll-mt-4 border-t border-border px-6 py-16 lg:py-20">
            <h2 className={TYPO.h2}>{GUIDE_FLOW.title}</h2>
            <p className={cn(TYPO.bodyMuted, 'mt-2 max-w-2xl break-keep')}>{GUIDE_FLOW.summary}</p>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {GUIDE_FLOW.steps.map((step, i) => {
                    const Icon = ICONS[i]
                    return (
                        <li key={step.title}>
                            <div className="flex items-center gap-2">
                                <span className={cn(TYPO.caption, 'font-medium tabular-nums')}>{i + 1}</span>
                                <Icon className="size-5 text-spot-solid" />
                            </div>
                            <h3 className={cn(TYPO.h4, 'mt-3 break-keep')}>{step.title}</h3>
                            <p className={cn(TYPO.body2Muted, 'mt-2 break-keep')}>{step.body}</p>
                        </li>
                    )
                })}
            </ol>
        </section>
    )
}
