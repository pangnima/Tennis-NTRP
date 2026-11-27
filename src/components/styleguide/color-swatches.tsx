import { CARD_BASE, TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/**
 * 색 견본 — L2 역할 · L3 도메인 토큰(docs/design-system.md §1). 테마 전환(헤더)으로 라이트/다크를 함께 본다.
 * ⚠ 클래스 이름은 문자열 그대로 적는다 — Tailwind는 소스의 글자를 읽어 클래스를 만들기 때문에 `bg-${name}`으로 조립하면 생기지 않는다.
 */
type Swatch = { name: string; bg: string; use: string }

const ROLE: Swatch[] = [
    { name: 'primary', bg: 'bg-primary', use: '행동 — 링크·포커스·눌린 탭' },
    { name: 'spot-solid', bg: 'bg-spot-solid', use: '채움 CTA·하단 탭 가운데·알림 수' },
    { name: 'spot', bg: 'bg-spot', use: '주의 글자 — 신청 중' },
    { name: 'self', bg: 'bg-self', use: '내 것 — 내 이름·내 줄·내 매칭' },
    { name: 'selected', bg: 'bg-selected', use: '고른 것(틴트) — 고른 칩·눌린 토글' },
    { name: 'selected-solid', bg: 'bg-selected-solid', use: '고른 것(채움) — 폼의 택일 토글' },
    { name: 'win', bg: 'bg-win', use: '승' },
    { name: 'loss', bg: 'bg-loss', use: '패' },
    { name: 'destructive', bg: 'bg-destructive', use: '위험 행동·오류' },
    { name: 'info', bg: 'bg-info', use: '보조 정보' },
    { name: 'data', bg: 'bg-data', use: '순차 데이터 — 히트맵' },
    { name: 'muted', bg: 'bg-muted', use: '회색 면 — 표 머리·인셋' },
]

const DOMAIN: Swatch[] = [
    { name: 'match-singles', bg: 'bg-match-singles', use: '단식' },
    { name: 'match-mens', bg: 'bg-match-mens', use: '남복' },
    { name: 'match-womens', bg: 'bg-match-womens', use: '여복' },
    { name: 'match-mixed', bg: 'bg-match-mixed', use: '혼복' },
    { name: 'surface-hard', bg: 'bg-surface-hard', use: '하드' },
    { name: 'surface-clay', bg: 'bg-surface-clay', use: '클레이' },
    { name: 'surface-turf', bg: 'bg-surface-turf', use: '인조잔디' },
    { name: 'surface-other', bg: 'bg-surface-other', use: '기타 코트' },
    { name: 'tier-iron', bg: 'bg-tier-iron', use: '아이언' },
    { name: 'tier-bronze', bg: 'bg-tier-bronze', use: '브론즈' },
    { name: 'tier-silver', bg: 'bg-tier-silver', use: '실버' },
    { name: 'tier-gold', bg: 'bg-tier-gold', use: '골드' },
    { name: 'tier-platinum', bg: 'bg-tier-platinum', use: '플래티넘' },
    { name: 'tier-diamond', bg: 'bg-tier-diamond', use: '다이아몬드' },
    { name: 'tier-master', bg: 'bg-tier-master', use: '마스터' },
    { name: 'tier-challenger', bg: 'bg-tier-challenger', use: '챌린저' },
]

function Grid({ title, items }: { title: string; items: Swatch[] }) {
    return (
        <div className="space-y-2">
            <p className={TYPO.label}>{title}</p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((s) => (
                    <li key={s.name} className={cn(CARD_BASE, 'flex items-center gap-3 p-3')}>
                        <span className={cn('size-8 shrink-0 rounded-md border border-border', s.bg)} aria-hidden />
                        <span className="min-w-0">
                            <code className={cn(TYPO.captionStrong, 'block')}>{s.name}</code>
                            <span className={cn(TYPO.caption, 'block break-keep')}>{s.use}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function ColorSwatches() {
    return (
        <div className="space-y-4">
            <Grid title="L2 역할" items={ROLE} />
            <Grid title="L3 도메인" items={DOMAIN} />
        </div>
    )
}
