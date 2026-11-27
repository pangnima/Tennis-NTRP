import type { Metadata } from 'next'

import { ActionButton } from '@/components/common/action-button'
import { ACTION_VARIANTS, PRESS_SCALE } from '@/components/common/action-button-class'
import { DataList } from '@/components/common/data-list'
import { Field } from '@/components/common/field'
import { FIELD_SCALE, fieldClass } from '@/components/common/field-class'
import { LinkSegments } from '@/components/common/link-segments'
import { LinkTabs } from '@/components/common/link-tabs'
import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { GameSessionBlock } from '@/components/games/game-session'
import { MATCH_HEAD, MatchCard } from '@/components/matches/match-card'
import { CARD_BASE, TEXT_TONE, TEXT_TONES, TYPO, TYPO_SCALE } from '@/lib/dashboard/tokens'
import { FIXTURE_MATCHES, FIXTURE_SESSION, FIXTURE_VIEWER_ID } from '@/lib/guide/fixtures'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: '스타일 가이드', robots: { index: false, follow: false } }

const SAMPLE = '오늘은 어떤 경기를 했나요? 6:4'

function Section({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <div>
                <h2 className={TYPO.h3}>{title}</h2>
                <p className={cn(TYPO.body2Muted, 'mt-1 break-keep')}>{summary}</p>
            </div>
            {children}
        </section>
    )
}

/**
 * 스타일 가이드 — 글자와 버튼의 **단계**를 실제 모양으로 한 화면에. 메뉴에는 없고 주소로만 들어온다(검색 제외).
 * 표는 전부 코드가 쓰는 상수(`TYPO_SCALE`·`TEXT_TONES`·`PRESS_SCALE`·`ACTION_VARIANTS`)에서 그린다 — 화면이 코드와 어긋날 수 없다.
 */
export default function StyleguidePage() {
    return (
        <PageContainer>
            <PageHeader title="스타일 가이드" description="글자 크기·글자색·누르는 것의 크기는 여기 있는 단계에서만 고릅니다" />

            <Section title="글자 단계" summary="크기는 아홉 단계입니다. 자리가 단계를 정하고, 한 줄(행) 안에서는 크기 하나만 씁니다 — 위계는 굵기와 색으로 만듭니다(필·칩 제외).">
                <div className={cn(CARD_BASE, 'divide-y divide-border')}>
                    {TYPO_SCALE.map((row) => (
                        <div key={row.token} className="grid items-baseline gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[8rem_5rem_minmax(0,1fr)_minmax(0,16rem)]">
                            <code className={TYPO.label}>TYPO.{row.token}</code>
                            <span className={cn(TYPO.caption, 'tabular-nums')}>{row.size}</span>
                            <span className={cn(TYPO[row.token], 'truncate')}>{SAMPLE}</span>
                            <span className={cn(TYPO.caption, 'break-keep')}>{row.use}</span>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="글자색 단계" summary="글자색은 둘뿐입니다. 읽어야 하는 값은 기본색, 값이 아닌 이름표·도움말은 보조색입니다. 그 사이 단계를 반투명으로 만들지 않고, 위계는 굵기로 냅니다.">
                <div className={cn(CARD_BASE, 'divide-y divide-border')}>
                    {TEXT_TONES.map((row) => (
                        <div key={row.tone} className="grid items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,16rem)]">
                            <span>
                                <span className={cn(TYPO.body2Strong, 'block')}>{row.name}</span>
                                <code className={TYPO.label}>{TEXT_TONE[row.tone]}</code>
                            </span>
                            <span className={cn('text-body2 truncate', TEXT_TONE[row.tone])}>{row.sample}</span>
                            <span className={cn('truncate rounded-sm bg-muted px-2 py-1 text-body2', TEXT_TONE[row.tone])}>{row.sample}</span>
                            <span className={cn(TYPO.caption, 'break-keep')}>{row.use}</span>
                        </div>
                    ))}
                </div>
                <div className={cn(TYPO.body2Muted, 'flex flex-wrap items-center gap-2 break-keep')}>
                    흐려지는 것은 누를 수 없는 컨트롤뿐입니다
                    <ActionButton size="sm" disabled>비활성</ActionButton>
                </div>
            </Section>

            <Section title="버튼 단계" summary="버튼은 ActionButton 하나입니다. 높이 다섯 단계와 모양 다섯 가지 — 무엇을 하는 버튼인지가 모양을, 놓인 자리가 크기를 정합니다. 한 줄에 놓인 버튼은 높이가 같고, 위계는 모양으로 냅니다.">
                <div className={cn(CARD_BASE, 'divide-y divide-border')}>
                    {PRESS_SCALE.map((row) => (
                        <div key={row.size} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                            <span className="w-28 shrink-0">
                                <code className={TYPO.label}>size=&quot;{row.size}&quot;</code>
                                <span className={cn(TYPO.caption, 'block tabular-nums')}>{row.px}px</span>
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                                {ACTION_VARIANTS.map((v) => (
                                    <ActionButton key={v.variant} size={row.size} variant={v.variant}>{v.variant}</ActionButton>
                                ))}
                            </span>
                            <span className={cn(TYPO.caption, 'min-w-48 flex-1 break-keep')}>{row.use}</span>
                        </div>
                    ))}
                </div>
                <ul className={cn(CARD_BASE, 'space-y-1 p-4')}>
                    {ACTION_VARIANTS.map((v) => (
                        <li key={v.variant} className={TYPO.body2}>
                            <code className={TYPO.label}>variant=&quot;{v.variant}&quot;</code> — {v.use}
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="버튼이 아닌 누름" summary="탭·토글은 자기 컴포넌트를 쓰지만 높이는 같은 단계표를 따릅니다(세그먼트 칸 32px · 탭 36px · 폼의 선택 토글 44px · 하단 탭 56px). 화면을 가르는 축은 밑줄 탭, 같은 목록을 거르는 축은 그 오른쪽의 세그먼트 토글입니다.">
                <div className={cn(CARD_BASE, 'space-y-4 p-4')}>
                    <LinkTabs
                        ariaLabel="탭 견본"
                        activeKey="a"
                        items={[{ key: 'a', label: '전체', href: '/styleguide' }, { key: 'b', label: '내 매칭', href: '/styleguide' }]}
                        trailing={
                            <LinkSegments
                                ariaLabel="세그먼트 견본"
                                activeKey="a"
                                items={[{ key: 'a', label: '종목 전체', href: '/styleguide' }, { key: 'b', label: '단식', href: '/styleguide' }, { key: 'c', label: '복식', href: '/styleguide' }]}
                            />
                        }
                    />
                </div>
            </Section>

            <Section title="칸 단계" summary="입력·선택 칸은 field-class 하나입니다. 높이 두 단계(폼 44px · 표·패널 안 36px)를 누름 단계표에서 읽고, 모양·라벨·아래 한 줄은 어디서나 같습니다. 글자는 늘 16px(iOS 확대 방지).">
                <div className={cn(CARD_BASE, 'space-y-4 p-4')}>
                    {FIELD_SCALE.map(({ size, px, use }) => (
                        <Field key={size} id={`sg-field-${size}`} label={`${size} · ${px}px`} message={use}>
                            <input id={`sg-field-${size}`} readOnly placeholder="예: 남복하실 남자 2명 모집중" className={fieldClass({ size, className: size === 'md' ? 'max-w-xs' : undefined })} />
                        </Field>
                    ))}
                    <Field id="sg-field-error" label="오류 한 줄" required message="방 제목을 1~40자로 적어 주세요." tone="destructive">
                        <input id="sg-field-error" readOnly className={fieldClass()} />
                    </Field>
                    <Field id="sg-field-warn" label="주의 한 줄" optional message="이미 시작한 시각입니다." tone="warning">
                        <input id="sg-field-warn" readOnly defaultValue="2026-11-25 14시" className={fieldClass()} />
                    </Field>
                </div>
            </Section>

            <Section title="목록" summary="목록은 한 줄에 하나입니다. 자리가 넓으면 열 제목이 있는 표, 좁으면 카드로 접힙니다(화면을 줄여 보세요). 표의 행은 높이 56px·글자 14px 하나이고, 값은 전부 기본색입니다.">
                <DataList head={MATCH_HEAD}>
                    {FIXTURE_MATCHES.map((m) => <MatchCard key={m.id} match={m} />)}
                </DataList>
                <DataList grouped>
                    <GameSessionBlock session={FIXTURE_SESSION} viewerId={FIXTURE_VIEWER_ID} />
                </DataList>
            </Section>
        </PageContainer>
    )
}
