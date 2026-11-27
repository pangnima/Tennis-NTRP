import { BarChart3, BookOpen, CalendarDays, ClipboardList, Home, PlusCircle, Trophy, UserRound } from 'lucide-react'

/**
 * 메뉴의 단일 출처(Week 72 재구축).
 *
 * 모바일은 하단 탭 다섯(홈 · 매칭 · 경기 기록 · 통계 · 내 정보), PC 사이드바는 **1뎁스 목록**이다:
 * 홈 · 매칭 리스트 · 경기 결과 · 통계 · 랭킹(+ 구분선 아래 사용 가이드). 묶음 제목은 두지 않는다 —
 * 항목이 다섯이라 갈래를 나누면 오히려 읽을 것이 는다(이름이 갈래를 말하게 한다: 「매칭 리스트」「경기 결과」).
 *
 * 「내 정보」는 PC 사이드바에 없다(헤더의 아바타가 같은 곳으로 간다). 모바일은 헤더에 아바타가 없어 하단 탭이 맡는다.
 * 숫자 뱃지는 없다 — 기다릴 차례가 사라졌고, "일어난 일"은 헤더의 종이 맡는다.
 *
 * 라벨을 다른 화면이 인용할 때는 문자열을 다시 적지 않고 `NAV_LABEL`을 읽는다(가이드·빈 상태·페이지 제목).
 */
export const NAV_LABEL = {
    home: '홈',
    matches: '매칭 리스트',
    record: '경기 기록',
    games: '경기 결과',
    stats: '통계',
    ranking: '랭킹',
    settings: '내 정보',
    guide: '사용 가이드',
} as const

/** 로그인 직후·로고·랜딩 리다이렉트의 착지 — 한 곳만 본다 */
export const HOME_PATH = '/home'
export const RECORD_PATH = '/record'
export const SETTINGS_PATH = '/profile/settings'

export type NavItem = {
    href: string
    label: string
    /** 하단 탭은 칸이 좁다 — 긴 라벨 대신 쓸 짧은 이름 */
    tabLabel?: string
    icon: React.ElementType
    /** 이 접두사로 시작하면 활성(없으면 href 완전 일치) */
    prefixes?: string[]
    /** 접두사에 걸려도 활성에서 빼는 경로 — /profile/settings는 통계가 아니다 */
    exclude?: string[]
}

export function statsHref(userId: string): string {
    return `/profile/${userId}`
}

const home: NavItem = { href: HOME_PATH, label: NAV_LABEL.home, icon: Home, prefixes: [HOME_PATH] }
const matches: NavItem = { href: '/matches', label: NAV_LABEL.matches, tabLabel: '매칭', icon: CalendarDays, prefixes: ['/matches'] }
const record: NavItem = { href: RECORD_PATH, label: NAV_LABEL.record, icon: PlusCircle, prefixes: [RECORD_PATH] }
const games: NavItem = { href: '/games', label: NAV_LABEL.games, icon: ClipboardList, prefixes: ['/games'] }
const ranking: NavItem = { href: '/ranking', label: NAV_LABEL.ranking, icon: Trophy, prefixes: ['/ranking'] }
const settings: NavItem = { href: SETTINGS_PATH, label: NAV_LABEL.settings, icon: UserRound }
const stats = (userId: string): NavItem =>
    ({ href: statsHref(userId), label: NAV_LABEL.stats, icon: BarChart3, prefixes: ['/profile/'], exclude: [SETTINGS_PATH] })

export const guideNavItem: NavItem = { href: '/guide', label: NAV_LABEL.guide, icon: BookOpen, prefixes: ['/guide'] }

/** 모바일 하단 탭 — 정확히 다섯, 가운데가 기록 */
export function buildTabItems(userId: string): NavItem[] {
    return [home, matches, record, stats(userId), settings]
}

/** PC 사이드바·모바일 서랍 — 1뎁스. 기록은 맨 위 CTA가, 내 정보는 헤더·하단 탭이 맡아 여기 없다 */
export function buildSideItems(userId: string): NavItem[] {
    return [home, matches, games, stats(userId), ranking]
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
    if (item.exclude?.some((p) => pathname.startsWith(p))) return false
    if (!item.prefixes) return pathname === item.href
    return item.prefixes.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`) || pathname === p.replace(/\/$/, ''))
}
