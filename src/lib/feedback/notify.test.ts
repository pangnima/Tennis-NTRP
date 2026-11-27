import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** 토스트는 `notify` 하나로만 — 문구 톤·시간·위치가 화면마다 갈리지 않게(docs/design-system.md §8) */
const SRC = path.resolve(__dirname, '../..')
const ALLOWED = ['lib/feedback/notify.ts', 'components/common/toaster.tsx']

function collect(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) collect(full, acc)
        else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) acc.push(full)
    }
    return acc
}

describe('토스트는 notify로만', () => {
    it('sonner를 notify·Toaster 밖에서 import하지 않는다', () => {
        const hits = collect(SRC)
            .map((f) => path.relative(SRC, f).split(path.sep).join('/'))
            .filter((rel) => !ALLOWED.includes(rel))
            .filter((rel) => /from ['"]sonner['"]/.test(readFileSync(path.join(SRC, rel), 'utf-8')))
        expect(hits).toEqual([])
    })
})
