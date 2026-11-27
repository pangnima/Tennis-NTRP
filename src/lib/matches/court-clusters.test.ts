import { describe, expect, it } from 'vitest'

import { courtCore, relatedCourts, suggestCourtClusters, type OfficialCourt } from './court-clusters'

const use = (name: string, uses: number) => ({ name, uses })

describe('코트명 정리 — 합칠 만한 묶음 제안', () => {
    it('알맹이 — 흔한 말(테니스장·코트·하드·번호)을 뗀다', () => {
        expect(courtCore('목동 테니스장')).toBe('목동')
        expect(courtCore('서남물 하드')).toBe('서남물')
        expect(courtCore('올림픽공원 3번 코트')).toBe('올림픽공원')
        expect(courtCore('내코트')).toBe('내')
        expect(courtCore('2222')).toBe('')
    })

    it('같은 코트일 법한 이름', () => {
        expect(relatedCourts('목동', '목동테니스장')).toBe(true)
        expect(relatedCourts('올림픽', '올림픽공원')).toBe(true)
        expect(relatedCourts('올공', '올림픽공원')).toBe(true)
        expect(relatedCourts('양시숲', '양재시숲')).toBe(true)
        expect(relatedCourts('양재시민', '양재시숲')).toBe(true)
        expect(relatedCourts('서남물재생', '서남물 하드')).toBe(true)
        // 직접은 안 걸려도(묶음은 건너서 이어진다) · 다른 코트 · 알맹이가 없는 이름
        expect(relatedCourts('양시숲', '양재시민')).toBe(false)
        expect(relatedCourts('목동', '올림픽공원')).toBe(false)
        expect(relatedCourts('서울숲', '서울대')).toBe(false)
        expect(relatedCourts('내코트', '실내코트')).toBe(false)
    })

    it('오너의 예 — 네 묶음, 많이 쓴 묶음부터, 묶음 안은 많이 쓴 이름부터', () => {
        const clusters = suggestCourtClusters([
            use('올림픽공원', 12), use('목동', 8), use('양시숲', 5), use('올공', 5), use('서남물', 4), use('양재시민', 3),
            use('목동테니스장', 3), use('올림픽', 3), use('반포 종합운동장', 3), use('양재시숲', 2), use('서남물재생', 2), use('서남물 하드', 1),
        ], [])
        expect(clusters.map((c) => c.names.map((n) => n.name))).toEqual([
            ['올림픽공원', '올공', '올림픽'],
            ['목동', '목동테니스장'],
            ['양시숲', '양재시민', '양재시숲'],
            ['서남물', '서남물재생', '서남물 하드'],
        ])
        // 공식 명칭 칸의 기본값 = 가장 많이 쓴 이름. 혼자인 이름(반포)은 제안하지 않는다
        expect(clusters.map((c) => c.official)).toEqual(['올림픽공원', '목동', '양시숲', '서남물'])
        expect(clusters.every((c) => c.court === undefined)).toBe(true)
    })

    it('공식 코트에 걸리면 그 코트에 합치기 — 이름 하나여도, 별칭으로 걸려도', () => {
        const courts: OfficialCourt[] = [
            { id: 'c1', name: '양재 시민의 숲', uses: 10, aliases: [{ key: '양시숲', alias: '양시숲' }] },
            { id: 'c2', name: '올림픽공원 테니스장', uses: 4, aliases: [{ key: '올팍', alias: '올팍' }] },
        ]
        const clusters = suggestCourtClusters([use('양재시민', 3), use('양재시숲', 2), use('올팍 2번', 1), use('장충', 1)], courts)
        expect(clusters).toHaveLength(2)
        expect(clusters[0]).toMatchObject({ official: '양재 시민의 숲', court: { id: 'c1' } })
        expect(clusters[0].names.map((n) => n.name)).toEqual(['양재시민', '양재시숲'])
        expect(clusters[1]).toMatchObject({ official: '올림픽공원 테니스장', court: { id: 'c2' } })
        expect(clusters[1].names.map((n) => n.name)).toEqual(['올팍 2번'])
    })
})
