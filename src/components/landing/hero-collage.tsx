import { CheckCircle2 } from 'lucide-react'

import { DataList } from '@/components/common/data-list'
import { GameSessionBlock } from '@/components/games/game-session'
import { MatchCard } from '@/components/matches/match-card'
import { CARD_BASE, TYPO } from '@/lib/design/tokens'
import { FIXTURE_MATCHES, FIXTURE_SESSION, FIXTURE_VIEWER_ID } from '@/lib/guide/fixtures'
import { cn } from '@/lib/utils'

/** 떠 있는 체크 필 — 기능 섹션과 같은 어휘. lg에서만 절대 위치, 그 아래는 카드 밑에 가로로 감긴다 */
const PILLS = [
    { label: '한 장으로 기록', position: 'lg:absolute lg:-left-10 lg:top-6' },
    { label: '저장 즉시 반영', position: 'lg:absolute lg:-left-4 lg:bottom-16' },
    { label: '승률 · 레이팅 · 랭킹', position: 'lg:absolute lg:-right-4 lg:-bottom-4' },
] as const

/**
 * 히어로 우측 콜라주 — 캡처가 아니라 **실제 행 컴포넌트를 픽스처로** 그린다. 자리가 좁아 `DataList`가 카드 모드로
 * 접는다(같은 컴포넌트가 앱의 넓은 목록에서는 표의 한 줄이다). 뒤에는 옐로우 글로우(색은 `spot-solid` 토큰 알파뿐).
 * `inert`가 클릭·포커스·접근성 트리를 끊으므로 sr-only 한 줄이 그림의 설명을 맡는다.
 */
export function HeroCollage() {
    return (
        <div className="relative isolate text-left lg:px-10 lg:py-8">
            <p className="sr-only">매칭 카드와 기록된 경기 카드 미리보기</p>
            <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-full max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-spot-solid/30 blur-3xl"
            />
            <div inert aria-hidden className="pointer-events-none select-none">
                <DataList className="mx-auto max-w-md">
                    {FIXTURE_MATCHES.map((match) => <MatchCard key={match.id} match={match} />)}
                </DataList>

                <DataList className="mx-auto mt-4 max-w-md lg:absolute lg:right-0 lg:-top-24 lg:mx-0 lg:mt-0 lg:w-72">
                    <GameSessionBlock session={FIXTURE_SESSION} viewerId={FIXTURE_VIEWER_ID} />
                </DataList>

                <ul className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2 lg:contents">
                    {PILLS.map((pill) => (
                        <li key={pill.label} className={cn(CARD_BASE, 'flex items-center gap-2 px-3 py-2', pill.position)}>
                            <CheckCircle2 className="size-4 text-spot-solid" />
                            <span className={TYPO.captionStrong}>{pill.label}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
