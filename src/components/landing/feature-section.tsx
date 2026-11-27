import { CalendarDays, PencilLine, TrendingUp } from 'lucide-react'

import { TYPO } from '@/lib/design/tokens'
import { NAV_LABEL } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

const FEATURES = [
    {
        icon: PencilLine,
        title: '한 장으로 끝나는 기록',
        description: '상대와 스코어를 한 화면에 넣으면 저장됩니다. 상대가 회원이 아니어도 기록할 수 있고, 틀리면 참가자 누구나 고칩니다.',
    },
    {
        icon: CalendarDays,
        title: '공개 · 비공개 매칭',
        description: '함께 칠 사람을 목록에서 모으거나, 초대 링크 하나로 아는 사람끼리만 엽니다. 매칭 안에서도 같은 화면으로 기록합니다.',
    },
    {
        icon: TrendingUp,
        title: '통계 · 레이팅 · 랭킹',
        description: `기록이 「${NAV_LABEL.games}」에 쌓이고, 승률·강약점·맞대결과 레이팅 순위로 정리됩니다.`,
    },
] as const

/** 기능 3열 — 데모 영상이 없는 대신 "무엇이 되는가"를 세 문장으로. 수치·후기는 넣지 않는다(실제 데이터가 없다). */
export function FeatureSection() {
    return (
        <section id="features" className="mx-auto max-w-6xl scroll-mt-4 border-t border-border px-6 py-16 lg:py-20">
            <h2 className={TYPO.h2}>기록이 쉬워야 쌓입니다</h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
                {FEATURES.map((feature) => (
                    <li key={feature.title}>
                        <span className="grid size-10 place-items-center rounded-md bg-secondary text-spot-solid">
                            <feature.icon className="size-5" />
                        </span>
                        <h3 className={cn(TYPO.h4, 'mt-4')}>{feature.title}</h3>
                        <p className={cn(TYPO.bodyMuted, 'mt-2 break-keep')}>{feature.description}</p>
                    </li>
                ))}
            </ul>
        </section>
    )
}
