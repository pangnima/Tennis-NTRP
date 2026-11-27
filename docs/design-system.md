# 디자인 시스템

> **화면을 만드는 규칙은 이 문서 하나다.** 코드의 상수가 정본이고(`src/app/globals.css` · `src/lib/design/*` · `src/components/common/*-class.ts`), `/styleguide`가 같은 상수에서 실제 모양을 그린다. 규칙은 테스트가 강제한다(맨 아래 「강제」).
> 옛 문서(`color-system`·`typography`·`buttons`·`forms`)는 이 문서의 장으로 합쳤다 — 2026-11-27.

**원칙 세 줄**
1. **자리가 단계를 정한다.** 크기·굵기·높이를 "보기 좋게" 고르지 않는다. 그 요소가 놓인 자리(페이지 헤더·표의 행·카드·폼)를 보고 표에서 읽는다.
2. **이름은 역할이다.** 색은 「민트」「옐로우」가 아니라 `self`·`spot-solid`처럼 무엇을 하는지로 부른다. 그래야 색을 바꿔도 코드를 고치지 않는다.
3. **한 줄에 한 단계.** 한 줄(행)의 글자는 크기 하나, 버튼은 높이 하나. 위계는 굵기와 모양으로 만든다.

---

## 1. 색

### 1.1 세 계층 — `src/app/globals.css`

| 계층 | 이름 | 무엇 | 규칙 |
|---|---|---|---|
| **L1 팔레트** | `--palette-<색>-<단계>` (`--palette-yellow-300`) | 실제 색값 | **hex는 여기에만.** 유틸리티로 노출하지 않는다. 단계 숫자는 밝기 순(작을수록 밝다) |
| **L2 역할** | `--background` `--primary` `--self` … | 그 색이 하는 일 | `var(--palette-*)`(또는 다른 L2)만 참조. **라이트/다크는 여기서만 갈린다** |
| **L3 도메인** | `--match-*` `--surface-*` `--tier-*` … | 분류의 뜻 | 팔레트만 참조. 결과·행동 색을 빌리지 않는다 |

컴포넌트는 L2·L3의 Tailwind 이름(`text-self`, `bg-match-mixed/10`)만 쓴다.

**바꾸는 법**
- 브랜드 옐로우를 다른 색으로 → L1의 `--palette-yellow-300`(·`-700`) 값만 바꾼다. 채움 버튼·하단 탭·알림 수·선택 토글이 함께 바뀐다.
- 「내 것」 강조만 다른 색으로 → L2 `--self` 한 줄(라이트·다크)만 다른 팔레트로 돌린다. 행동색(`primary`)은 그대로다.
- 새 분류가 생기면(예: 클럽 등급) → L3에 뜻 이름으로 추가하고 `@theme inline`에 노출, `colors.test.ts`의 `DOMAIN_TOKENS`에 넣는다.

### 1.2 역할 토큰 (L2)

| 토큰 | 하는 일 | 지금 값(라이트 / 다크) |
|---|---|---|
| `background` · `card` · `popover` | 바탕 · 카드 · 팝업 면 | ink-50 · ink-0 / ink-950 · ink-900 |
| `secondary` · `muted` · `accent` | 회색 면(표 머리·인셋·자동완성 고른 줄) | ink-100 / ink-800 |
| `foreground` | **값** — 읽어야 하는 글자 | ink-800 / ink-100 |
| `muted-foreground` | **값이 아닌 것** — 이름표·도움말·구분 기호 | ink-700 / ink-400 |
| `border` · `border-subtle` | 카드·표의 1px 선 · 셸(헤더·사이드바·탭 바)의 가장자리 | ink-200 · 글자 5% / ink-750 · 글자 10% |
| `input` · `field` · `ring` | 입력 칸 테두리 · 입력 칸 바탕 · 포커스 | ink-500 · 바탕 / ink-600 · 입력 30% |
| `primary` | **행동** — 링크·포커스·눌린 탭 | blue-700 / mint-400 |
| `spot-solid` · `spot` | **채움 CTA**(ActionButton `solid`·하단 탭 가운데·알림 수) · 주의 글자(「신청 중」) | yellow-300 · yellow-700 / yellow-300 |
| `win` · `loss` | 승 · 패 (결과에만) | mint-700 · coral-700 / mint-400 · coral-300 |
| `destructive` | 위험 행동·오류 — `loss`와 같은 코랄(구분은 자리·모양) | = loss |
| `info` | 보조 정보 | blue-700 / blue-400 |
| `self` | **내 것** — 내 이름·내 줄·내가 만든 매칭·「참가 중」 | blue-700 / mint-400 |
| `selected` · `selected-solid` | **고른 것** — 틴트(고른 회원 칩·눌린 토글) · 채움(폼의 택일 토글) | blue-700 · yellow-300 / mint-400 · yellow-300 |
| `data` | 순차 데이터(활동량 히트맵) — 결과가 아니다 | mint-700 / mint-400 |

`self`·`selected`·`data`는 지금 `primary`·`spot`·`win`과 값이 같다. **그래도 다른 토큰이다** — 「내 것」과 「링크」는 다른 뜻이라 언젠가 갈라질 수 있고, 그때 한 줄만 고치면 되게 둔 것이다. 지금 같은 값이라고 서로 바꿔 쓰지 않는다.

악센트의 세 역할: `--X`(면 위 글자·테두리, AA) / `--X-solid`(비비드 채움 — 글자를 얹지 않는 바·링, `spot-solid` 예외) / `--X-foreground`(채움 위 글자).

### 1.3 도메인 토큰 (L3)

| 묶음 | 토큰 |
|---|---|
| 종목 | `match-singles`(핑크) · `match-mens`(코발트) · `match-womens`(바이올렛) · `match-mixed`(올리브) |
| 코트 표면 | `surface-hard`(블루) · `surface-clay` · `surface-turf` · `surface-other` |
| 복식 자리 · 손 | `side-deuce` · `side-ad` · `hand-right` · `hand-left` |
| 아바타 | `avatar-1..8` — 해시로 고른다. **순서를 바꾸면 모든 회원의 색이 바뀐다** |
| 티어 | `tier-iron` … `tier-challenger` — 게임 랭크의 정체성이라 브랜드색과 따로 간다 |

의도된 공유: 하드코트·듀스·오른손 = 정보 블루(같은 화면에서 뜻이 겹치지 않는다). 종목 칩은 역할색과 공유하지 않는다(테스트가 막는다 — 혼복이 「신청 중」과, 단식이 정보색과 같은 hex였던 Week 72 이전의 충돌).

### 1.4 글자색은 두 단계

**기본(`text-foreground`) = 값**(이름·날짜·시간·장소·숫자·메모), **보조(`text-muted-foreground`) = 값이 아닌 것**(열 제목·필드 이름표·도움말·`·` `vs`·placeholder·선택 안 된 탭). 판정: 그 글자를 지우면 정보가 사라지면 값이다. 회색 바탕 위의 값도 기본색.

- 위계는 색이 아니라 **굵기**로.
- 알파 글자색(`text-foreground/70`)·`opacity-NN`으로 내용을 흐리게 하지 않는다(`disabled:opacity-50`만 예외).
- 대비: 기본·보조 7:1(카드·배경), 보조는 회색 바탕 위 5.5:1, 악센트·도메인 글자 4.5:1, 입력 경계 3:1.

### 1.5 알파 단계

틴트 바탕 `/10`, 테두리 `/40`, 마우스 올림 `/15`. 그 밖의 값은 이유가 있을 때만(히트맵 `data/20~80`).

### 1.6 예외 — 토큰 밖의 색

| 파일 | 이유 |
|---|---|
| `components/ui/*` | shadcn 생성물(수정 금지) |
| `lib/og/brand.ts` | OG 이미지(Satori)는 CSS 변수를 못 읽는다 — 값이 라이트 토큰과 같은지 테스트가 본다 |
| `app/layout.tsx` `themeColor` | 브라우저 크롬 색 — 같은 이유, 같은 검사 |
| `components/auth/provider-marks.tsx` | 구글 브랜드 마크(제3자 가이드) |
| `public/empty/*.svg` | 빈 상태 그림 — 브랜드 옐로우가 박혀 있다. 브랜드색을 바꾸면 함께 바꾼다 |

---

## 2. 크기 — 한 표

높이는 `PRESS_HEIGHT`(`src/components/common/action-button-class.ts`) 하나에서 읽는다. 버튼·칸·토글·칩이 같은 표다.

| 단계 | 높이 | 버튼(`ActionButton`) | 칸(`fieldClass`) | 칩(`chipClass`) | 그 밖의 누름 |
|---|---|---|---|---|---|
| `micro` | 18 | — | — | **꼬리표·카운트**(「비회원」·「잠정」·알림 수) | — |
| `chip` | 24 | — | — | **정보 칩**(종목·상태·역할·결과·티어) | — |
| `xs` | 28 | 칩 안의 보조 동작 | — | — | — |
| `sm` | 32 | **행·카드·섹션 제목 옆의 행동** | — | **고르는/지우는 칩**(고른 회원·참가자) | 세그먼트 토글·필터 칩 |
| `md` | 36 | **페이지 헤더의 행동**(주 행동 포함) | 표·패널 안의 작은 칸 | — | 밑줄 탭·PC 메뉴 행 |
| `lg` | 44 | 폼 제출·팝업 버튼 | **폼의 칸** | — | 폼의 택일 토글·모바일 서랍 행 |
| `xl` | 56 | 홈 진입 버튼 | — | — | 모바일 하단 탭 |

- 높이를 손으로 적지 않는다(`h-11`·`py-3`). 예외는 칸 옆 버튼 하나 — 칸 높이에 맞춰 늘어난다(`self-stretch`).
- 아이콘: `size-3`(12 — micro 칩 안) · `size-3.5`(14 — xs·sm 버튼과 칩) · `size-4`(16 — md·lg 버튼, 본문 옆) · `size-5`(20 — xl, 빈 상태 아님). 표기는 `size-N` 하나(`w-N h-N` 금지).

---

## 3. 글자

크기·줄간격·자간은 `globals.css`의 `@theme`, 굵기·색 조합은 `TYPO`(`src/lib/design/tokens.ts`).

### 3.1 단계

| 토큰 | 모바일 → PC | 줄간격 | 쓰임 |
|---|---|---|---|
| `text-display` | 36 → 48 | 1.2 | 랜딩 최상단 카피, 오류 화면 큰 숫자 |
| `text-h1` | 28 → 36 | 1.25 | 페이지 제목(`PageHeader`만) |
| `text-h2` | 24 → 28 | 1.3 | 문서형 화면(랜딩·가이드·약관·인증)의 섹션 |
| `text-h3` | 20 → 24 | 1.35 | 앱 화면의 섹션 제목(h2 태그) |
| `text-h4` | 18 → 20 | 1.4 | 카드·빈 상태·폼 그룹·**팝업** 제목 |
| `text-body` | 16 | 1.65 → 1.55 | 본문·폼 입력(**모든 input은 16px** — iOS 확대 방지) |
| `text-body2` | 14 | 〃 | 목록 행의 값·메뉴·버튼 |
| `text-caption` | 12 | 1.5 | 메타·도움말·범례·칩 안의 글자 |
| `text-micro` | 11 | 1 | **꼬리표·카운트 전용**(micro 칩, 하단 탭 이름) — 본문·라벨 금지 |

헤딩은 360→1024px 구간에서 `clamp()`로 커진다. `sm:text-*` 같은 반응형 크기 접두어는 쓰지 않는다.

### 3.2 자리 → 토큰 (`TYPO_SCALE`)

| 자리 | `TYPO` |
|---|---|
| 페이지 제목 | `h1` |
| 섹션 제목(h2 태그) | `h3` |
| 카드·빈 상태·폼 그룹·팝업 제목 | `h4` |
| 본문 / 모바일 카드의 주 정보 | `body` / `bodyStrong` |
| **목록(표) 행** — 주 정보 / 값 | `body2Strong` / `body2` |
| 설명·도움말 문장(값이 아님) | `bodyMuted` / `body2Muted` |
| 열 제목·필드 이름표 | `label` |
| 메타·범례 / 12px 자리의 값 | `caption` / `captionStrong` |
| 꼬리표·카운트 | `micro` |

- 숫자 KPI는 단계를 만들지 않고 `text-h4~h1 + font-bold tabular-nums`로 크기만 빌린다.
- **태그는 문서 구조, 클래스는 시각 단계.** 앱 화면: 페이지 `<h1>` H1 → 섹션 `<h2>` **H3** → 카드 `<h3>` H4(H2를 건너뛴다 — 카드가 많은 화면에서 24px 섹션 제목이 페이지 제목과 경쟁한다).

---

## 4. 버튼 — `ActionButton` 하나

`src/components/common/action-button.tsx`. `href`가 있으면 링크, 없으면 `<button type="button">`. 클래스만 필요하면 `actionButtonClass()`.

| variant | 모양 | 쓰는 자리 |
|---|---|---|
| `solid` | `spot-solid` 채움 | 이 화면에서 눌러야 할 것(저장·기록·참가) — **화면에 하나** |
| `outline` (기본) | 테두리 | 보조 행동(취소·수정·초대) |
| `ghost` | 글자만 | 낮은 강조(로그아웃·접기) |
| `danger` | 위험 글자 | **표·카드 행 안 전용** — 삭제·나가기(줄마다 반복되므로 채우지 않는다) |
| `dangerFill` | 연한 위험 채움 | 행 밖의 위험 버튼 — 페이지 헤더의 [매칭 삭제], 팝업의 확정, 설정의 탈퇴 |

- **행동은 글자**(동사 하나: 수정·삭제·저장·취소·내보내기·나가기·승인·거절). 아이콘 전용(`square`)은 아이콘이 곧 뜻인 자리만 — 사이드바 접기 · 포/백 ⇄ · 비밀번호 보기(`SQUARE_ALLOWED`).
- **한 줄 한 높이.** 한 줄에 버튼이 넷을 넘으면 높이를 키우지 말고 자리를 나눈다 — 버튼은 자기가 다루는 것 옆에(매칭 상세: 제목 옆 = 매칭, 「참가자」 옆 = 초대, 내 줄 = 나가기).
- 카드로 접힌 목록의 행동: 1~2개면 머리 줄 오른쪽(`CARD_HEAD_ACTION`), 3개 이상이면 맨 아래 행동 줄.
- 폼 하단은 언제나 `FormActions` — **주 행동 왼쪽 · 취소 오른쪽**(팝업도 같다, §7).
- [삭제]는 같은 말. 묻는 것은 저장된 것일 때만(`ConfirmButton`), 저장 전 새 줄은 그냥 뺀다.

---

## 5. 칸(입력·선택) — `field-class.ts` 하나

| 도구 | 쓰임 |
|---|---|
| `fieldClass({ size, multiline })` | 칸 모양 하나 — 테두리 `input`, 바탕 `field`, 둥글기 8, 글자 16px |
| `FIELD_LABEL` | 이름표 — 16px 굵게, **보조색**. 필수 ` *`, 선택 ` (선택)` |
| `fieldMessageClass(tone)` | 칸 아래 한 줄 — 도움말(보조) · 오류(`destructive`) · 주의(`spot`), 12px |
| `Field` / `TextField` | 이름표·칸·한 줄의 3단 |
| `EnumSelect` | 선택 — 트리거가 같은 칸(`SelectTrigger` 직접 사용 금지) |
| `FIELD_READONLY` | 바꿀 수 없는 값 — 같은 높이, 회색 바탕, 값은 기본색 |
| `FieldToggle` | 폼의 택일(라디오 대신) — 켜진 칸 `selected-solid` |
| `SegmentedToggle` / `LinkSegments` | 카드 머리의 보기 전환 / 주소가 상태인 거르기 |

높이는 두 단계(`lg` 44 폼 · `md` 36 표·패널 안). **입력 화면은 모달이 아니라 전체 화면 페이지**다(모바일 기준) — 칸 1~2개짜리 짧은 입력만 팝업을 허용한다(§7).

---

## 6. 칩 · 뱃지 — `chipClass` 하나

칩은 **값이나 상태를 붙이는 작은 글자 상자**다. 누르지 않는다(누르는 칩은 `sm` 높이의 토글·고른 칩 — 아래 「누르는 칩」).

### 6.1 모양 — `chipClass({ size })` (`src/components/common/chip-class.ts`)

| size | 높이 | 글자 | 둥글기 | 쓰임 |
|---|---|---|---|---|
| `micro` | 18 | `text-micro` | 4 | 꼬리표 — 「비회원」·「탈퇴」·「N연승」, 알림 수(`rounded-full`만 예외) |
| `chip` (기본) | 24 | `text-caption` | 4 | 정보 칩 — 종목·상태(확정됨·모집 마감·신청 중·참가 중)·역할(호스트·게스트)·결과(승·패)·티어·NTRP |
| `sm` | 32 | `text-caption` | 4 | 고르는/지우는 칩 — 고른 회원 ✕, 경기 기록 참가자 ✕ |

높이·여백·글자·둥글기는 이것만 정한다. **색은 아래 표의 맵에서 따로 붙인다.**

### 6.2 색 — 뜻마다 한 맵

| 뜻 | 맵(파일) | 모양 |
|---|---|---|
| 중립(확정됨·모집 마감·손잡이·NTRP) | `NEUTRAL_PILL` | 테두리 `border` + 기본 글자 |
| 주의(신청 중) | `ATTENTION_CHIP` | 테두리 `spot/50` + `spot` 글자 |
| 내 것(참가 중) · 역할(호스트·참가·게스트·비회원) | `member-badges.ts` | 테두리 틴트 / 회색 채움 |
| 종목 | `getMatchTypeBadgeClass` | `match-*` 틴트(테두리 /40 + 바탕 /10 + 글자) |
| 결과(승·패·무) | `result-badge.ts`·`outcome.ts` | 승·패 = **채움**(결과 배지) 또는 틴트(스코어·폼 칸) |
| 티어 | `TIER_STYLE` | `tier-*` 틴트 |

채움(`bg-X text-X-foreground`)은 **결과와 카운트에만**. 나머지 뜻은 틴트나 테두리로 붙인다.

### 6.3 누르는 칩

고른 회원·참가자처럼 누르면 빠지는 칩은 `chipClass({ size: 'sm' })` + `selected` 틴트 + 끝에 ✕(`size-3`). 넣는 방법이 여럿이어도 들어간 사람은 **한 목록에 같은 모양**이다.

---

## 7. 레이어 팝업 — 세 가지

| 종류 | 컴포넌트 | 언제 |
|---|---|---|
| **확인** | `ConfirmButton` (AlertDialog) | 되돌릴 수 없거나 남에게 영향을 주는 행동 — 삭제·확정·내보내기·**탈퇴**. 네이티브 `confirm()` 금지 |
| **짧은 입력** | `AppDialog` (Dialog) | 칸 1~2개 — 비밀번호 입력·변경, 회원 초대. 그보다 길면 전체 화면 페이지 |
| **메뉴** | `DropdownMenu` / `Sheet` | 알림 목록, 모바일 서랍 |

공통 모양
- 제목 `TYPO.h4`, 본문 `TYPO.body2Muted`. 폭 두 단계 — `sm`(384, 확인·비밀번호) · `md`(448, 회원 초대).
- 버튼 줄: **주 행동 왼쪽 · 취소 오른쪽**(`FormActions`와 같은 줄 `FORM_ACTION_ROW` — 모바일에서도 한 줄, 주 행동이 남는 폭을 다 쓴다).
- 오류는 버튼 줄 바로 위 한 줄(`fieldMessageClass('destructive')`).
- 팝업 안에서 의미를 `title` 툴팁에 싣지 않는다(모바일에 없다).

---

## 8. 피드백 — 무엇을 어떻게 알리나

| 상황 | 방법 |
|---|---|
| **화면이 그대로인 성공**(복사·저장·초대·승인·삭제) | **토스트** — `notify.success('…')`(`src/lib/feedback/notify.ts`). 3초, 화면 아래 가운데(모바일은 하단 탭 위) |
| 칸 하나의 잘못 | 칸 아래 한 줄 `fieldMessageClass('destructive')` |
| 폼·행동 전체의 실패 | 그 자리의 **`Notice tone="danger"`**(인라인, `role="alert"`) — 토스트로 오류를 알리지 않는다(사라지면 읽을 수 없다) |
| 페이지 이동이 따르는 성공(저장 → 상세로) | 이동한 화면이 결과다 — 토스트 없음 |
| 서버가 터짐 | `error.tsx` 경계 |
| 진행 중 | 버튼 글자를 「저장 중...」처럼 바꾸고 비활성(스피너 없음) |
| 빈 목록 | `EmptyState`(그림 + 한 문장 + 행동 하나) |

- 토스트는 `notify` 하나로만 부른다(`toast()` 직접 호출 금지) — 문구 톤·시간·위치를 한 곳에서 정한다.
- 서버 액션은 `ActionResult`(`{ error: string | null }`, `src/lib/actions/result.ts`)를 돌려준다. 오류 문구는 RPC의 오류 키를 사전(`lib/games/errors.ts`·`lib/auth/auth-error-messages.ts`)으로 바꾼 것이다.

---

## 9. 목록 · 면 · 그 밖

- **목록은 `DataList` 안에 한 줄에 하나.** 자리가 넓으면(896px 이상, `@4xl:`) 열 제목이 있는 표, 좁으면 카드. 밀도는 `data-list.tsx` 한 곳(`ROW_BOX` 56 · `ROW_PAD` 20 · `ROW_GRID` 16). 열 폭은 고정값 또는 fr(`auto` 금지). 묶음 목록은 `DataList grouped`.
- 카드: `CARD_BASE`(둥글기 8 · `border` · `card`), 안쪽 여백 `p-4 sm:p-5`. 그림자 없이 1px 선으로 영역을 가른다(그림자는 팝업·자동완성만).
- 둥글기: 4(칩) · 6(버튼·토글) · 8(칸·카드) · 12(팝업) · full(아바타·카운트·고른 회원 칩). `rounded-[Npx]` 금지.
- 쌓는 순서: 하단 탭 `z-40` · 팝업·자동완성 `z-50`.
- 거르기: 화면을 가르는 축 = 밑줄 탭(`LinkTabs`), 같은 목록을 거르는 축 = 세그먼트(`LinkSegments`, 탭의 `trailing`).

---

## 강제 — 테스트가 막는 것

| 테스트 | 막는 것 |
|---|---|
| `src/lib/design/colors.test.ts` | 팔레트 클래스(`text-gray-500`)·임의 hex·hex 리터럴 · **`dark:` 분기** · **`cat-N`** · L2/L3의 hex · 대비(기본·보조 7:1, 악센트·도메인 4.5:1) · 종목 칩과 역할색의 거리 · OG/브라우저 크롬 미러 값 |
| `src/lib/design/typography.test.ts` | 단계 밖 크기(`text-sm`·`text-[13px]`) · `TYPO` 값마다 크기 하나 · 글자색 두 단계 |
| `src/components/common/pressable.test.ts` | `ui/button` import · 허용 목록 밖의 `<button>` · `square` |
| `src/components/common/field.test.ts` | 칸 높이 · 칸 규칙 없는 `<input>`·`<select>`·`<textarea>` · `SelectTrigger` 직접 사용 |
| `src/components/common/chip.test.ts` | 칩 모양을 손으로 적기(`px-2 py-0.5 rounded-sm` 조합) · `ui/badge` import · `rounded-[Npx]` |
| `src/lib/feedback/notify.test.ts` | `sonner`의 `toast` 직접 호출 |
