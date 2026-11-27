import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { PRESS_HEIGHT } from './action-button-class'
import { FIELD_HEIGHT, fieldClass } from './field-class'

/**
 * 칸의 회귀 가드 — 칸(입력·선택)은 `field-class.ts` 한 곳이 모양과 높이를 정한다(`docs/design-system.md §5`).
 * 화면마다 손으로 칸을 그리면 높이가 다시 44·48·50으로 흩어진다(11-26에 한 번 모았다).
 */
const SRC = path.resolve(__dirname, '../..')
const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/')

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = path.join(dir, name)
        return statSync(p).isDirectory() ? walk(p) : [p]
    })
}

const files = walk(SRC)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .filter((f) => !rel(f).startsWith('components/ui/'))
const read = (f: string) => readFileSync(f, 'utf8')

/** 칸 규칙 밖의 `<input>`·`<select>`·`<textarea>`가 허용된 파일 — 칸이 아닌 입력이다 */
const RAW_FIELD_ALLOWED = new Set([
    'components/auth/avatar-upload-field.tsx',     // 숨은 파일 입력 + hidden
    'components/auth/consent-checkbox.tsx',        // 체크박스
    'components/auth/signup-form.tsx',             // hidden(돌아갈 곳 — 초대 링크, 0108)
    'components/auth/social-login-buttons.tsx',    // hidden(제공자·돌아갈 곳)
    'components/onboarding/profile-onboarding-form.tsx', // hidden(돌아갈 곳)
])
/** 셀렉트 트리거를 직접 쓰는 것이 허용된 파일 — `EnumSelect` 자체와, 카드 머리의 작은 선택(세그먼트 토글과 같은 sm) */
const SELECT_TRIGGER_ALLOWED = new Set([
    'components/common/enum-select.tsx',
    'components/stats/head-to-head/h2h-opponent-select.tsx',
    'components/stats/win-rate-trend-card.tsx',
])
const USES_FIELD = /field-class|<TextField\b|<Field\b|<EnumSelect\b/
const OLD_TOKENS = /\b(FORM_INPUT_BASE|FORM_LABEL_BASE|MATCH_FORM_INPUT|MATCH_FORM_LABEL|MATCH_FORM_FIELD_HEIGHT|MATCH_FORM_SELECT_TRIGGER)\b/

describe('칸 — 모양과 높이는 field-class 하나', () => {
    it('칸 높이는 누름 단계표에서 읽는다(lg 44 · md 36)', () => {
        expect(FIELD_HEIGHT.lg).toBe(PRESS_HEIGHT.lg)
        expect(FIELD_HEIGHT.md).toBe(PRESS_HEIGHT.md)
        expect(fieldClass()).toContain(PRESS_HEIGHT.lg)
        expect(fieldClass({ size: 'md' })).toContain(PRESS_HEIGHT.md)
        expect(fieldClass({ multiline: true })).not.toContain(PRESS_HEIGHT.lg)
    })

    it('옛 칸·라벨 토큰을 쓰지 않는다', () => {
        expect(files.filter((f) => OLD_TOKENS.test(read(f))).map(rel)).toEqual([])
    })

    it('<input>·<select>·<textarea>를 쓰는 파일은 칸 규칙을 쓰거나 허용 목록에 있다', () => {
        const hits = files
            .filter((f) => /<(input|select|textarea)\b/.test(read(f)) && !USES_FIELD.test(read(f)))
            .map(rel)
            .filter((f) => !RAW_FIELD_ALLOWED.has(f))
        expect(hits).toEqual([])
    })

    it('셀렉트 트리거는 EnumSelect를 거친다(허용 목록 밖에서 직접 쓰지 않는다)', () => {
        const hits = files.filter((f) => /<SelectTrigger\b/.test(read(f))).map(rel).filter((f) => !SELECT_TRIGGER_ALLOWED.has(f))
        expect(hits).toEqual([])
    })

    it('허용 목록에 사라진 파일이 남아 있지 않다', () => {
        const existing = new Set(files.map(rel))
        expect([...RAW_FIELD_ALLOWED, ...SELECT_TRIGGER_ALLOWED].filter((f) => !existing.has(f))).toEqual([])
    })
})
