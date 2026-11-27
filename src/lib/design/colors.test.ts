import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { OG } from '@/lib/og/brand'

/**
 * 컬러 시스템 회귀 가드 (docs/design-system.md §1).
 * 1) globals.css 밖에 하드코딩된 색상·`dark:` 분기·번호 이름(cat-N)이 없는지
 * 2) globals.css 안에서도 hex는 L1 팔레트에만 있는지(역할·도메인 토큰은 팔레트만 참조)
 * 3) 라이트/다크 토큰이 WCAG 대비를 만족하고, 분류색이 역할색과 떨어져 있는지
 * 4) OG 이미지·브라우저 크롬의 수동 미러 값이 토큰과 어긋나지 않았는지
 */

const SRC = path.resolve(__dirname, '../..')
const GLOBALS = path.join(SRC, 'app/globals.css')

// ── 파일 수집 ────────────────────────────────────────────────────────
/** 팔레트 교체 대상에서 제외되는 경로 — 이유는 docs/design-system.md §1 「예외」 */
const ALLOWLIST = [
    'components/ui', // shadcn 자동 생성, 수정 금지
    'lib/og/brand.ts', // Satori는 CSS 변수 미지원 — 아래에서 값 일치를 따로 검증
    'app/layout.tsx', // viewport.themeColor(브라우저 크롬)는 CSS 변수 미지원 — 〃
    'components/auth/provider-marks.tsx', // 제3자 브랜드 마크 — 구글 가이드가 정한 색이라 팔레트 교체 대상이 아니다
]

function collectSources(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const rel = path.relative(SRC, full).split(path.sep).join('/')
        if (ALLOWLIST.some((p) => rel === p || rel.startsWith(`${p}/`))) continue
        if (entry.isDirectory()) collectSources(full, acc)
        else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) acc.push(full)
    }
    return acc
}

const SOURCES = collectSources(SRC)

const TAILWIND_HUES =
    'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const UTILITY_PREFIX =
    'bg|text|border|ring|fill|stroke|from|to|via|divide|outline|placeholder|decoration|shadow|accent|caret'
const BANNED_PALETTE = new RegExp(`\\b(?:${UTILITY_PREFIX})-(?:${TAILWIND_HUES})-(?:50|[1-9]00|[1-9]50)\\b`)
const BANNED_ARBITRARY = new RegExp(`\\b(?:${UTILITY_PREFIX})-\\[#`)
const BANNED_HEX = /['"`]#[0-9a-fA-F]{3,8}['"`]/

describe('색상 하드코딩 금지', () => {
    it('`dark:` 분기를 쓰지 않는다 — 라이트/다크는 토큰이 갈라 쥔다', () => {
        expect(hitsOf(/(?<![\w-])dark:[\w[]/g)).toEqual([])
    })

    it('번호 이름의 분류색(cat-N)을 쓰지 않는다 — 뜻 이름(match-*·surface-* …)만', () => {
        expect(hitsOf(/(?<![\w-])(?:[\w-]+-)?cat-\d\b/g)).toEqual([])
    })

    it('Tailwind 기본 팔레트 클래스를 쓰지 않는다', () => {
        const hits = SOURCES.filter((f) => BANNED_PALETTE.test(readFileSync(f, 'utf-8')))
            .map((f) => path.relative(SRC, f))
        expect(hits).toEqual([])
    })

    it('임의값 색상(bg-[#...])을 쓰지 않는다', () => {
        const hits = SOURCES.filter((f) => BANNED_ARBITRARY.test(readFileSync(f, 'utf-8')))
            .map((f) => path.relative(SRC, f))
        expect(hits).toEqual([])
    })

    it('hex 색상 리터럴을 쓰지 않는다', () => {
        const hits = SOURCES.filter((f) => BANNED_HEX.test(readFileSync(f, 'utf-8')))
            .map((f) => path.relative(SRC, f))
        expect(hits).toEqual([])
    })
})

// ── 글자색은 두 단계 — 흐리게 만드는 다른 길을 막는다 ──────────────────
// 기본(foreground) = 읽어야 하는 값, 보조(muted-foreground) = 이름표·도움말. 그 사이 단계를 알파나 투명도로
// 만들면 대비가 검사 밖으로 빠져나간다(지난 매칭 행의 opacity-60은 보조색을 2.4:1까지 떨어뜨렸다).
/** `text-foreground/70`처럼 알파를 붙인 글자색 — 토큰 이름을 가리지 않고, 상태 접두어(`hover:`)가 붙어도 같다 */
const ALPHA_TEXT = /(?<![\w-])(?:[\w[\]=-]+:)*text-[a-z][\w-]*\/\d+/g
/** `opacity-NN`(임의값 포함)과 그 앞의 접두어들 */
const OPACITY = /(?<![\w-])((?:[\w[\]=-]+:)*)opacity-(\d+|\[[^\]]+\])(?![\w-])/g
/** 투명도를 써도 되는 상태 — 누를 수 없음·마우스 올림. 화면 폭·테마 접두어(`md:`·`dark:`)로는 통과하지 못한다 */
const OPACITY_STATE = /^(hover|focus|focus-visible|active|disabled|aria-disabled|data-disabled|data-\[disabled[^\]]*\]|group-hover|group-disabled|peer-disabled)$/
/** 정보가 아닌 장식에 투명도를 쓰는 자리 — `파일 경로`를 이유와 함께 올린다 */
const OPACITY_ALLOWED: string[] = []

/** 줄 단위로 찾는다 — 주석 줄(금지 예시를 적어 둔 곳)은 건너뛰고, 실패하면 `파일:줄`을 보여 준다 */
function hitsOf(re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true): string[] {
    return SOURCES.flatMap((f) => {
        const rel = path.relative(SRC, f).split(path.sep).join('/')
        return readFileSync(f, 'utf-8').split('\n').flatMap((line, i) =>
            /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line) ? [] : [...line.matchAll(re)].filter(keep).map((m) => `${rel}:${i + 1}: ${m[0]}`),
        )
    })
}

describe('글자색은 두 단계 — 흐리게 만드는 다른 길 금지', () => {
    it('알파를 붙인 글자색을 쓰지 않는다', () => {
        expect(hitsOf(ALPHA_TEXT)).toEqual([])
    })

    it('opacity로 내용을 흐리게 하지 않는다(비활성·마우스 올림 상태와 펼침 전환 제외)', () => {
        const hits = hitsOf(OPACITY, (m) => {
            if (m[2] === '0' || m[2] === '100') return false
            const prefixes = m[1].split(':').filter(Boolean)
            return prefixes.length === 0 || prefixes.some((p) => !OPACITY_STATE.test(p))
        }).filter((h) => !OPACITY_ALLOWED.some((p) => h.startsWith(`${p}:`)))
        expect(hits).toEqual([])
    })
})

// ── globals.css 토큰 파싱 + 대비 계산 ────────────────────────────────
// 주석에 중괄호가 섞이면 블록 파싱이 끊기므로 먼저 제거한다.
const CSS = readFileSync(GLOBALS, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')

/** `:root {...}`(L2 시맨틱 블록) / `.dark {...}` 안의 `--토큰: 값;`을 모은다. */
function readTokens(selector: string): Record<string, string> {
    const out: Record<string, string> = {}
    const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g')
    for (const block of CSS.matchAll(re)) {
        for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
            out[name] = value.trim()
        }
    }
    return out
}

/** L3 도메인 토큰 — 글자로도 쓰이므로 대비를 함께 본다 */
const DOMAIN_TOKENS = [
    'match-singles', 'match-mens', 'match-womens', 'match-mixed',
    'surface-hard', 'surface-clay', 'surface-turf', 'surface-other',
    'side-deuce', 'side-ad', 'hand-right', 'hand-left',
    ...Array.from({ length: 8 }, (_, i) => `avatar-${i + 1}`),
    ...['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'challenger'].map((t) => `tier-${t}`),
]

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const distance = (a: string, b: string) => {
    const [x, y] = [rgb(a), rgb(b)]
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

describe('색 3계층 — hex는 L1 팔레트에만', () => {
    it('역할·도메인 토큰은 hex를 직접 쓰지 않는다(팔레트·다른 토큰만 참조)', () => {
        // 모드마다 따로 본다 — 한 객체로 합치면 다크 값이 같은 이름의 라이트 값을 덮어 라이트 쪽 hex를 놓친다
        const dark = Object.entries(readTokens('\\.dark'))
        expect(dark.length).toBeGreaterThan(40) // 다크 블록을 실제로 읽었는가
        const all = [...Object.entries(readTokens(':root')), ...dark]
        const offenders = all.filter(([name, v]) => !name.startsWith('palette-') && /#[0-9a-fA-F]{3,8}\b/.test(v))
        expect(offenders).toEqual([])
    })

    it('팔레트 값은 모두 6자리 hex다', () => {
        const palette = Object.entries(readTokens(':root')).filter(([name]) => name.startsWith('palette-'))
        expect(palette.length).toBeGreaterThan(0)
        for (const [name, v] of palette) expect(v, name).toMatch(/^#[0-9a-f]{6}$/)
    })
})

const LIGHT = readTokens(':root')
const DARK = { ...LIGHT, ...readTokens('\\.dark') }

/** `var(--x)` 참조를 끝까지 따라가 hex로 해석한다. */
function resolve(tokens: Record<string, string>, name: string, depth = 0): string {
    const raw = tokens[name]
    if (raw === undefined) throw new Error(`토큰 --${name}이 globals.css에 없습니다`)
    const ref = /^var\(--([\w-]+)\)$/.exec(raw)
    if (ref) {
        if (depth > 5) throw new Error(`--${name} 참조가 순환합니다`)
        return resolve(tokens, ref[1], depth + 1)
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(raw)) throw new Error(`--${name}이 6자리 hex가 아닙니다: ${raw}`)
    return raw.toLowerCase()
}

function luminance(hex: string): number {
    const n = parseInt(hex.slice(1), 16)
    const channel = (c: number) => {
        const s = c / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

/** [전경, 배경, 최소 대비] — 배경은 카드·배경 중 불리한 쪽까지 함께 본다. */
const TEXT_ON_SURFACE: [string, number][] = [
    ['foreground', 7], // 본문 (AAA)
    ['muted-foreground', 7], // 보조 텍스트(이름표·도움말)도 AAA — 4.5였을 때 "연한 글자가 안 보인다"는 피드백을 받았다
    ['primary', 4.5], // 링크·액션 텍스트
    ['info', 4.5],
    ['win', 4.5],
    ['loss', 4.5],
    ['spot', 4.5],
    ['destructive', 4.5],
    ['self', 4.5],
    ['selected', 4.5],
    ['data', 4.5],
    ...DOMAIN_TOKENS.map((n): [string, number] => [n, 4.5]),
]

/**
 * 채움 위에 글자를 얹는 실제 조합 — `bg-X text-X-foreground`.
 * 비비드 `--X-solid`는 글자를 얹지 않는 바·링 전용이라 여기에 없다(docs/design-system.md §1.2).
 */
const SOLID_PAIRS: [string, string][] = [
    ['primary-foreground', 'primary'],
    ['win-foreground', 'win'],
    ['loss-foreground', 'loss'],
    ['info-foreground', 'info'],
    ['destructive-foreground', 'destructive'],
    ['spot-foreground', 'spot-solid'], // ActionButton solid
    ['selected-foreground', 'selected-solid'], // FieldToggle·애드/듀스의 켜진 칸
    ['primary-foreground', 'selected'], // 회원 검색 결과의 체크 표시
]

describe.each([
    ['라이트', LIGHT],
    ['다크', DARK],
])('%s 모드 WCAG 대비', (_mode, tokens) => {
    it.each(TEXT_ON_SURFACE)('--%s는 카드·배경 위에서 %s:1 이상이다', (name, min) => {
        const fg = resolve(tokens, name)
        for (const surface of ['card', 'background'] as const) {
            expect(contrast(fg, resolve(tokens, surface))).toBeGreaterThanOrEqual(min)
        }
    })

    it('--muted-foreground는 회색 바탕(muted·secondary) 위에서도 5.5:1 이상이다', () => {
        // 열 제목 줄·구분 줄·중립 칩처럼 회색 바탕 위에 보조색을 얹는 자리가 있다. 카드·배경만 보면 여기가 샌다(옛 값은 라이트 4.17).
        const fg = resolve(tokens, 'muted-foreground')
        // accent = 자동완성에서 고른 줄의 바탕 — 그 위에도 보조색 글자가 놓인다
        for (const surface of ['muted', 'secondary', 'accent'] as const) {
            expect(contrast(fg, resolve(tokens, surface)), surface).toBeGreaterThanOrEqual(5.5)
        }
    })

    it('--foreground는 회색 바탕 위에서도 7:1 이상이다', () => {
        // "회색 바탕 위의 값은 기본색" 규칙을 값으로 고정한다(무승부 배지·집계 필·읽기 전용 입력칸)
        for (const surface of ['muted', 'secondary'] as const) {
            expect(contrast(resolve(tokens, 'foreground'), resolve(tokens, surface)), surface).toBeGreaterThanOrEqual(7)
        }
    })

    it('글자색 두 단계(기본·보조)가 서로 구분된다', () => {
        // 보조색을 밝히다 기본색과 뭉개지면 "값"과 "이름표"의 구분이 사라진다.
        expect(contrast(resolve(tokens, 'muted-foreground'), resolve(tokens, 'foreground'))).toBeGreaterThanOrEqual(1.5)
    })

    it.each(SOLID_PAIRS)('--%s는 --%s 위에서 4.5:1 이상이다', (fg, bg) => {
        expect(contrast(resolve(tokens, fg), resolve(tokens, bg))).toBeGreaterThanOrEqual(4.5)
    })

    it('입력 경계(--input)는 카드 대비 3:1 이상이다 (WCAG 1.4.11)', () => {
        expect(contrast(resolve(tokens, 'input'), resolve(tokens, 'card'))).toBeGreaterThanOrEqual(3)
    })

    it('분류색은 결과색(win·loss)과 눈에 띄게 다르다', () => {
        // "분류 태그는 결과 색을 빌려 쓰지 않는다" (docs/design-system.md §1).
        // 하드코트·듀스·오른손이 정보 블루를 쓰는 것은 의도된 공유라 여기서 info·primary는 보지 않는다.
        for (const name of DOMAIN_TOKENS.filter((n) => !n.startsWith('tier-'))) {
            for (const semantic of ['win', 'loss'] as const) {
                expect(distance(resolve(tokens, name), resolve(tokens, semantic)), `${name} vs ${semantic}`).toBeGreaterThan(30)
            }
        }
    })

    it('종목 칩 넷은 역할색(주의·정보·행동·결과)과도, 서로끼리도 다르다', () => {
        // 혼복 칩이 「신청 중」(spot)과, 단식 칩이 정보 블루(info)와 같은 hex였다(Week 72 이전)
        const MATCH = ['match-singles', 'match-mens', 'match-womens', 'match-mixed']
        for (const m of MATCH) {
            for (const role of ['spot', 'spot-solid', 'info', 'primary', 'self', 'win', 'loss'] as const) {
                expect(distance(resolve(tokens, m), resolve(tokens, role)), `${m} vs ${role}`).toBeGreaterThan(30)
            }
        }
        for (const [i, a] of MATCH.entries()) for (const b of MATCH.slice(i + 1)) {
            expect(distance(resolve(tokens, a), resolve(tokens, b)), `${a} vs ${b}`).toBeGreaterThan(30)
        }
    })

    it('surface 3단(background·secondary·card)이 서로 구분된다', () => {
        // 랜딩·카드 레이아웃이 이 계단에 의존한다. 값이 겹치면 영역 경계가 사라진다.
        const levels = (['background', 'secondary', 'card'] as const).map((n) => resolve(tokens, n))
        expect(new Set(levels).size).toBe(3)
        for (const [a, b] of [
            [levels[0], levels[1]],
            [levels[1], levels[2]],
        ]) {
            expect(Math.abs(luminance(a) - luminance(b))).toBeGreaterThan(0.008)
        }
    })
})

describe('브라우저 크롬 색 미러 값 (viewport.themeColor는 CSS 변수 미지원)', () => {
    const LAYOUT = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf-8')
    const declared = [...LAYOUT.matchAll(/prefers-color-scheme:\s*(light|dark)\)',\s*color:\s*'(#[0-9a-f]{6})'/g)]

    it('라이트·다크 두 항목을 모두 선언한다', () => {
        expect(declared.map(([, scheme]) => scheme)).toEqual(['light', 'dark'])
    })

    it('각 값이 해당 모드의 --background와 같다', () => {
        expect(declared[0]?.[2]).toBe(resolve(LIGHT, 'background'))
        expect(declared[1]?.[2]).toBe(resolve(DARK, 'background'))
    })
})

describe('OG 이미지 미러 값 (Satori는 CSS 변수 미지원)', () => {
    it.each([
        ['background', 'background'],
        ['foreground', 'foreground'],
        ['spot', 'spot-solid'],
        ['mutedForeground', 'muted-foreground'],
        ['card', 'card'],
        ['border', 'border'],
    ] as const)('OG.%s는 라이트 토큰 --%s와 같다', (ogKey, token) => {
        expect(OG[ogKey]).toBe(resolve(LIGHT, token))
    })
})
