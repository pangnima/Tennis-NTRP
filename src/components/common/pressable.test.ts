import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * "누르는 것"의 회귀 가드 — 버튼은 `ActionButton` 하나이고, 높이는 다섯 단계(`PRESS_HEIGHT`)에서만 고른다.
 * 화면마다 손으로 만든 버튼이 다시 생기면 크기와 글자 단계가 다시 흩어진다(Week 72에 한 번 모았다).
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

/**
 * `<button>`을 직접 쓰는 것이 허용된 파일 — 버튼이 아니라 **다른 종류의 누름 컴포넌트**이거나 입력의 일부다.
 * 여기 없는 파일에서 버튼이 필요하면 `ActionButton`(또는 `ConfirmButton`·`FormActions`)을 쓴다.
 */
const RAW_BUTTON_ALLOWED = new Set([
    'components/common/action-button.tsx',                     // 버튼 그 자체
    'components/common/field-toggle.tsx',                      // 폼의 선택 토글(라디오 그룹)
    'components/common/segmented-toggle.tsx',                  // 카드 머리의 세그먼트 토글
    'components/personal-matches/ad-deuce-toggle.tsx',         // 백핸드 코트 토글
    'components/theme/theme-toggle.tsx',                       // 메뉴 행 모양의 테마 전환
    'components/common/member-search/member-pick-chips.tsx',   // 고른 회원 칩(누르면 해제)
    'components/common/member-search/member-result-row.tsx',   // 검색 결과 행(행 전체가 선택 영역)
    'components/auth/avatar-upload-field.tsx',                 // 사진 선택 영역
    'components/profile/profile-avatar-field.tsx',             // 사진 선택 영역
    'components/auth/login-form.tsx',                          // 입력칸 안의 비밀번호 보기 아이콘
    'components/auth/reset-password-form.tsx',                 // 입력칸 안의 비밀번호 보기 아이콘
])

/**
 * 아이콘 전용 버튼(`square`)을 쓸 수 있는 파일 — **아이콘이 곧 뜻인 자리**만. 행동(수정·삭제·저장·내보내기…)은 글자로 쓴다
 * (`docs/design-system.md §4` 「글자 버튼 · 아이콘 버튼」). 게임 보드만 [✕] 아이콘이고 나머지는 글자라 "섞여 보인다"는 피드백을 받았다.
 */
const SQUARE_ALLOWED = new Set([
    'components/common/action-button-class.ts',     // 정의(클래스 표)
    'components/common/header.tsx',                 // 사이드바 접기
    'components/common/nav-create-link.tsx',        // 접힌 사이드바의 [+ 경기 기록]
    'components/matches/board/board-team-slots.tsx', // 포·백 맞바꾸기 ⇄
    'components/matches/match-access-field.tsx',    // 입력칸 옆 비밀번호 보기
])
/** `square` 속성·값 — `aspect-square` 같은 클래스는 앞 글자가 `-`라 걸리지 않는다 */
const SQUARE_PROP = /(^|[\s{(,])square(?=[\s={}>)]|$)/m

describe('누르는 것 — 버튼은 ActionButton 하나', () => {
    it('아이콘 전용 버튼(square)은 허용 목록의 파일뿐이다 — 행동은 글자로', () => {
        const hits = files.filter((f) => SQUARE_PROP.test(readFileSync(f, 'utf8'))).map(rel).filter((f) => !SQUARE_ALLOWED.has(f))
        expect(hits).toEqual([])
    })

    it('square 허용 목록에 사라진 파일·이제 안 쓰는 파일이 남아 있지 않다', () => {
        const users = new Set(files.filter((f) => SQUARE_PROP.test(readFileSync(f, 'utf8'))).map(rel))
        expect([...SQUARE_ALLOWED].filter((f) => !users.has(f))).toEqual([])
    })

    it('components/ui 밖에서 ui/button을 쓰지 않는다(text-sm이 타이포 단계를 우회한다)', () => {
        const hits = files.filter((f) => /from ['"]@\/components\/ui\/button['"]/.test(readFileSync(f, 'utf8'))).map(rel)
        expect(hits).toEqual([])
    })

    it('<button>을 직접 쓰는 파일은 허용 목록뿐이다', () => {
        const hits = files.filter((f) => /<button[\s>]/.test(readFileSync(f, 'utf8'))).map(rel).filter((f) => !RAW_BUTTON_ALLOWED.has(f))
        expect(hits).toEqual([])
    })

    it('허용 목록에 사라진 파일이 남아 있지 않다', () => {
        const existing = new Set(files.map(rel))
        expect([...RAW_BUTTON_ALLOWED].filter((f) => !existing.has(f))).toEqual([])
    })

    it('옛 버튼형 토큰(CTA_LINK · HEADER_ACTION_LINK · buttonVariants)을 쓰지 않는다', () => {
        const hits = files.filter((f) => /\b(CTA_LINK|HEADER_ACTION_LINK|buttonVariants)\b/.test(readFileSync(f, 'utf8'))).map(rel)
        expect(hits).toEqual([])
    })
})
