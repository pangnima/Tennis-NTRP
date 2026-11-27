# 버튼 가이드

버튼은 **`ActionButton` 하나**다(`src/components/common/action-button.tsx`). 높이와 모양의 표는 `action-button-class.ts`가 단일 출처이고, `/styleguide`가 그 상수에서 실제 모양을 그린다.

## 크기 — 다섯 단계 (`PRESS_HEIGHT` · `PRESS_SCALE`)

| size | 높이 | 쓰는 자리 |
|---|---|---|
| `xs` | 28px | 칩 안의 보조 동작, 입력 줄의 작은 삭제 |
| `sm` | 32px | **섹션 제목 옆·카드·목록 행 안의 행동**(초대·수정·확정·삭제) |
| `md` | 36px | **페이지 헤더의 행동** — 주 행동도 여기([+ 경기 기록]·[+ 매칭 만들기]·[+ 게임 기록]) |
| `lg` | 44px | 폼 제출(`FormActions`), 팝업 버튼, 폼 안의 선택 토글 — 모바일 터치 기준 |
| `xl` | 56px | 홈의 큰 진입 버튼 |

높이를 손으로 적지 않는다(`h-11` 등). 예외는 입력칸 옆의 버튼 하나 — 입력칸 높이에 맞춰 늘어난다(`h-auto self-stretch`).

**한 줄에 놓인 버튼은 높이 단계 하나다.** 위계는 높이가 아니라 모양(채움 / 테두리 / 글자)으로 만든다. 한 줄에 버튼이 넷을 넘으면 높이를 키우지 말고 **자리를 나눈다** — 버튼은 자기가 다루는 것 옆에 놓는다. 매칭 상세가 그 예다: 제목 오른쪽(`md`) = 매칭 자체([+ 게임 기록]·[최종 확정]/[매칭 삭제]), 「참가자」 제목 옆(`sm`) = [회원 초대]·[초대 링크 복사], 참가자 표의 내 줄(`sm`) = [나가기].

## 모양 — 다섯 가지 (`ACTION_VARIANTS`)

| variant | 모양 | 쓰는 자리 |
|---|---|---|
| `solid` | 옐로우 채움 | 이 화면에서 눌러야 할 것(저장·기록·참가) — 화면에 하나가 원칙 |
| `outline` (기본) | 테두리 | 보조 행동(취소·수정·초대) |
| `ghost` | 글자만 | 낮은 강조(로그아웃·사이드바 접기) |
| `danger` | 빨간 글자 | **표·카드 행 안 전용** — 삭제·나가기. 줄마다 반복되므로 채우지 않는다 |
| `dangerFill` | 연한 빨강 채움 | 행 밖의 위험 버튼 — 페이지 헤더의 [매칭 삭제], 팝업의 삭제·탈퇴 확정, 설정의 탈퇴 |

아이콘만 있는 버튼은 `square`(폭 = 높이)와 `aria-label`.

## 글자 버튼 · 아이콘 버튼 — 행동은 글자로

**행동은 글자로 쓴다** — 동사 하나: 수정 · 삭제 · 저장 · 취소 · 내보내기 · 나가기 · 승인 · 거절. 위계는 모양(solid / outline / ghost / danger)이 만든다. 같은 글자 버튼이 줄마다 반복되면 `aria-label`로 무엇을 하는지 읽어 준다(「2게임 삭제」 — `ConfirmButton`은 `ariaLabel`).

**아이콘 전용(`square`)은 아이콘이 곧 뜻인 자리만**: 사이드바 접기 · 접힌 사이드바의 [+] · 보드의 포/백 맞바꾸기 ⇄ · 입력칸 옆 비밀번호 보기. 버튼이 아닌 누름(고른 칩 안의 ✕, 모바일 메뉴 열기/닫기)도 같은 이유로 아이콘이다. 이 밖의 파일에서 `square`를 쓰면 `pressable.test.ts`가 막는다(허용 목록 `SQUARE_ALLOWED`).

이유: 게임 보드만 [✕] 아이콘이고 경기 결과·참가자·참가 신청은 글자라 "섞여 보인다"는 피드백(11-26). 모바일에는 뜻을 실을 툴팁이 없고(`title` 금지), 내보내기·나가기·승인·거절은 아이콘만으로 뜻이 갈리지 않는다.

**[삭제]는 같은 말, 묻는 것은 데이터가 있을 때만** — 저장된 것은 확인 팝업(`ConfirmButton`), 저장 전 새 줄은 그냥 뺀다.

## 카드 모드의 행동 자리

표가 좁은 자리에서 카드로 접힐 때(`DataList`):

- **행동이 1~2개면 카드 머리 줄 오른쪽** — 보드 카드 [수정][삭제], 참가자 카드 [내보내기]/[나가기], 참가 신청 카드 [승인][거절]. 사진(32px)과 sm 버튼(32px)이 같은 높이라 카드가 커지지 않는다. 배치는 `data-list.tsx`의 `CARD_GRID`·`CARD_WIDE`·`CARD_HEAD_ACTION`(DOM 순서는 표 순서 그대로라 키보드 순서가 같다).
- **3개 이상이면 맨 아래 행동 줄**(위에 구분선) — 경기 결과 카드 [수정][확정][삭제].
- 행동 버튼 혼자 한 줄을 차지하게 두지 않는다(참가자 카드가 "불필요하게 커 보인다"는 피드백).

## 쓰는 법

```tsx
<ActionButton variant="solid" size="lg" type="submit">경기 저장</ActionButton>
<ActionButton href="/matches/new" variant="solid" size="md">+ 매칭 만들기</ActionButton>   // href가 있으면 링크
<ConfirmButton size="sm" variant="danger" tone="destructive" title="삭제할까요?" …>삭제</ConfirmButton>
<FormActions submitLabel="저장" onCancel={…} />                                           // 폼 하단은 언제나 이것
<Link className={actionButtonClass({ variant: 'solid', size: 'sm' })} …>                  // 클래스만 필요할 때
```

## 버튼이 아닌 누름

칩·탭·토글·메뉴 행은 자기 컴포넌트를 쓰되 **높이는 같은 표**(`PRESS_HEIGHT`)에서 읽는다: 필터 칩·세그먼트 토글 `sm` · 탭·PC 메뉴 행·백핸드 토글 `md` · 폼의 선택 토글·모바일 서랍 행 `lg` · 모바일 하단 탭 `xl`.

## 하지 말 것 (`src/components/common/pressable.test.ts`가 막는다)

- `@/components/ui/button` import — base가 `text-sm`이라 타이포 단계를 우회한다(`components/ui` 안에서만 쓴다)
- `<button>`을 직접 쓰기 — 허용 목록(토글·칩·사진 선택·입력칸 안 아이콘)에 이유와 함께 올린 파일만
- 옛 토큰 `CTA_LINK`·`HEADER_ACTION_LINK`·`buttonVariants`
