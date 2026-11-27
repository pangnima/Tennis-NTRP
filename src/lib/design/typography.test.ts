import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { TEXT_TONE, TEXT_TONES, TYPO, TYPO_SCALE } from './tokens'

/**
 * 타이포 단계의 회귀 가드. 크기는 globals.css의 아홉 단계뿐이고(display·h1~h4·body·body2·caption·micro),
 * 화면은 그 밖의 크기를 쓰지 않는다. `components/ui`는 shadcn 생성물이라 예외다.
 */
const SRC = path.resolve(__dirname, '../..')
const STEPS = ['display', 'h1', 'h2', 'h3', 'h4', 'body', 'body2', 'caption', 'micro']

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = path.join(dir, name)
        return statSync(p).isDirectory() ? walk(p) : [p]
    })
}

const files = walk(SRC).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes(`${path.sep}components${path.sep}ui${path.sep}`))

describe('타이포 단계', () => {
    it('globals.css에 아홉 단계가 모두 정의돼 있다', () => {
        const css = readFileSync(path.join(SRC, 'app/globals.css'), 'utf8')
        for (const step of STEPS) expect(css, step).toMatch(new RegExp(`--text-${step}:`))
    })

    it('단계 밖의 글자 크기를 쓰지 않는다', () => {
        // Tailwind 기본 크기(text-sm 등)와 임의값(text-[13px])
        const off = /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])|text-\[\d/
        const hits = files.flatMap((f) => {
            const lines = readFileSync(f, 'utf8').split('\n')
            // 주석 속 설명("text-sm을 쓰지 않는 이유")은 사용이 아니다
            return lines.flatMap((line, i) => (off.test(line) && !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line) ? [`${path.relative(SRC, f)}:${i + 1}`] : []))
        })
        expect(hits).toEqual([])
    })

    it('TYPO의 값마다 크기 클래스가 정확히 하나', () => {
        for (const [key, cls] of Object.entries(TYPO)) {
            const sizes = cls.split(' ').filter((c) => STEPS.some((s) => c === `text-${s}`))
            expect(sizes, key).toHaveLength(1)
        }
    })

    it('단계표(TYPO_SCALE)는 TYPO에 있는 토큰만 말하고 큰 것부터 적는다', () => {
        for (const row of TYPO_SCALE) expect(TYPO[row.token], row.token).toBeDefined()
        const order = TYPO_SCALE.map((r) => STEPS.findIndex((s) => TYPO[r.token].split(' ').includes(`text-${s}`)))
        expect(order).toEqual([...order].sort((a, b) => a - b))
    })
})

describe('글자색 단계 — 기본과 보조 둘뿐', () => {
    it('단계표(TEXT_TONES)는 TEXT_TONE의 두 단계를 한 번씩 말한다', () => {
        expect(TEXT_TONES.map((r) => r.tone)).toEqual(Object.keys(TEXT_TONE))
        expect(Object.keys(TEXT_TONE)).toHaveLength(2)
    })

    it('TYPO 조합의 글자색은 두 단계 중 하나다(색을 싣지 않는 micro 제외)', () => {
        const tones: string[] = Object.values(TEXT_TONE)
        for (const [key, value] of Object.entries(TYPO)) {
            const colors = value.split(' ').filter((c) => /^text-(foreground|muted-foreground|primary|win|loss|spot|info|destructive)/.test(c))
            if (key === 'micro') expect(colors, key).toEqual([])
            else expect(colors.length === 1 && tones.includes(colors[0]), key + ': ' + colors.join(' ')).toBe(true)
        }
    })
})
