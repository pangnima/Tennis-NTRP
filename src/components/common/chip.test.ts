import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { CHIP_SCALE, chipClass } from './chip-class'

/**
 * 칩·뱃지 회귀 가드 (docs/design-system.md §6).
 * 칩 모양(높이·여백·글자·둥글기)은 `chipClass` 한 곳 — 칩마다 손으로 적으면 크기가 다시 다섯 벌로 갈린다(Week 72 이전).
 */
const SRC = path.resolve(__dirname, '../..')

function collect(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const rel = path.relative(SRC, full).split(path.sep).join('/')
        if (rel === 'components/ui') continue // shadcn 생성물
        if (entry.isDirectory()) collect(full, acc)
        else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) acc.push(full)
    }
    return acc
}
const SOURCES = collect(SRC)

/** 줄 단위로 찾아 `파일:줄`을 돌려준다(주석 줄 제외) */
function hits(re: RegExp, skip: string[] = []): string[] {
    return SOURCES.flatMap((f) => {
        const rel = path.relative(SRC, f).split(path.sep).join('/')
        if (skip.includes(rel)) return []
        return readFileSync(f, 'utf-8').split('\n').flatMap((line, i) =>
            /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line) || !re.test(line) ? [] : [`${rel}:${i + 1}`],
        )
    })
}

describe('칩 모양은 chipClass 하나', () => {
    it('components/ui/badge를 앱에서 import하지 않는다', () => {
        expect(hits(/from ['"]@\/components\/ui\/badge['"]/)).toEqual([])
    })

    it('칩 모양을 손으로 적지 않는다(둥근 상자 + py-0.5 조합)', () => {
        // 옛 PILL_BASE·결과 배지·「N연승」이 각자 `px-2 py-0.5 rounded-sm`을 적었다
        expect(hits(/\brounded-(?:sm|xs)\b.*\bpy-0\.5\b|\bpy-0\.5\b.*\brounded-(?:sm|xs)\b/, ['components/common/chip-class.ts'])).toEqual([])
    })

    it('둥글기 임의값(rounded-[Npx])을 쓰지 않는다 — 단계(xs·sm·md·lg·xl·full)만', () => {
        expect(hits(/\brounded-\[\d+px\]/)).toEqual([])
    })
})

describe('chipClass 단계', () => {
    it('단계표와 함수가 같은 단계를 말한다', () => {
        for (const { size } of CHIP_SCALE) expect(chipClass({ size })).toMatch(/\bh-/)
    })

    it('단계마다 높이가 다르다(18·24·32)', () => {
        expect(CHIP_SCALE.map((s) => s.px)).toEqual([18, 24, 32])
        expect(chipClass({ size: 'micro' })).toContain('h-4.5')
        expect(chipClass()).toContain('h-6')
        expect(chipClass({ size: 'sm' })).toContain('h-8')
    })
})
