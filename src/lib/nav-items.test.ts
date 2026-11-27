import { describe, expect, it } from 'vitest'

import { buildSideItems, buildTabItems, isNavItemActive, NAV_LABEL } from './nav-items'

const tabs = buildTabItems('u1')
const active = (pathname: string) => tabs.filter((t) => isNavItemActive(t, pathname)).map((t) => t.label)
const sideLabels = buildSideItems('u1').map((i) => i.label)

describe('메뉴 활성 판정 — 한 경로에 탭은 하나만 켜진다', () => {
    it('하단 탭은 다섯, 가운데가 기록', () => {
        expect(tabs.map((t) => t.label)).toEqual([NAV_LABEL.home, NAV_LABEL.matches, NAV_LABEL.record, NAV_LABEL.stats, NAV_LABEL.settings])
    })

    it('각 화면', () => {
        expect(active('/home')).toEqual([NAV_LABEL.home])
        expect(active('/matches')).toEqual([NAV_LABEL.matches])
        expect(active('/matches/abc')).toEqual([NAV_LABEL.matches])
        expect(active('/record')).toEqual([NAV_LABEL.record])
        expect(active('/profile/u1')).toEqual([NAV_LABEL.stats])
        expect(active('/profile/someone-else')).toEqual([NAV_LABEL.stats])
    })

    it('내 정보는 통계와 겹치지 않는다', () => {
        expect(active('/profile/settings')).toEqual([NAV_LABEL.settings])
    })

    it('접두사가 같은 다른 경로에 걸리지 않는다', () => {
        expect(active('/matches-old')).toEqual([])
        expect(active('/homepage')).toEqual([])
    })
})

describe('사이드바 — 1뎁스', () => {
    it('홈 · 매칭 리스트 · 경기 결과 · 통계 · 랭킹', () => {
        expect(sideLabels).toEqual([NAV_LABEL.home, NAV_LABEL.matches, NAV_LABEL.games, NAV_LABEL.stats, NAV_LABEL.ranking])
    })

    it('기록(CTA가 맡는다)과 내 정보(헤더·하단 탭이 맡는다)는 사이드바에 없다', () => {
        expect(sideLabels).not.toContain(NAV_LABEL.record)
        expect(sideLabels).not.toContain(NAV_LABEL.settings)
        expect(tabs.map((t) => t.label)).toContain(NAV_LABEL.settings)
    })

    it('하단 탭은 긴 라벨 대신 짧은 이름을 쓴다', () => {
        expect(tabs.find((t) => t.label === NAV_LABEL.matches)?.tabLabel).toBe('매칭')
    })
})
