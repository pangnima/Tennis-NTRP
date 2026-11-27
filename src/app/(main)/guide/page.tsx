import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { GUIDE_FLOW, GUIDE_SECTIONS } from '@/lib/guide/content'
import { cn } from '@/lib/utils'

export const metadata = { title: '사용 가이드' }

/**
 * 사용 가이드 — (main) 안이지만 보호 라우트가 아니라 비로그인도 열린다(랜딩 푸터가 링크).
 * 문구는 전부 `lib/guide/content.ts`에서 온다. 섹션 id가 앵커다(#record · #matches · #confirm · #stats).
 */
export default function GuidePage() {
    return (
        <PageContainer className="mx-auto w-full max-w-3xl">
            <PageHeader title="사용 가이드" description={GUIDE_FLOW.summary} />

            <section className={cn(CARD_BASE, 'p-5')}>
                <h2 className={TYPO.h3}>{GUIDE_FLOW.title}</h2>
                <ol className="mt-4 space-y-4">
                    {GUIDE_FLOW.steps.map((step, i) => (
                        <li key={step.title} className="flex gap-3">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-spot-solid text-caption font-bold text-spot-foreground">{i + 1}</span>
                            <span>
                                <span className={cn(TYPO.h4, 'block')}>{step.title}</span>
                                <span className={cn(TYPO.body2Muted, 'mt-1 block break-keep')}>{step.body}</span>
                            </span>
                        </li>
                    ))}
                </ol>
            </section>

            {GUIDE_SECTIONS.map((section) => (
                <section key={section.id} id={section.id} className={cn(CARD_BASE, 'scroll-mt-4 p-5')}>
                    <h2 className={TYPO.h3}>{section.title}</h2>
                    <p className={cn(TYPO.body2Muted, 'mt-1 break-keep')}>{section.summary}</p>
                    <ul className="mt-4 list-disc space-y-2 pl-5">
                        {section.points.map((point) => (
                            <li key={point} className={cn(TYPO.body2, 'break-keep')}>{point}</li>
                        ))}
                    </ul>
                </section>
            ))}
        </PageContainer>
    )
}
