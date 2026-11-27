# 칸(입력·선택) 가이드

칸은 **`field-class.ts` 하나**다(`src/components/common/field-class.ts`). 버튼(`action-button-class.ts`)·글자(`TYPO`)와 같은 방식 — 단계와 모양을 한 곳에서 정하고, `/styleguide`가 그 상수에서 실제 모양을 그린다.

왜: 로그인·가입·프로필(작은 대문자 회색 라벨 + ≈50px 칸)과 경기 기록·매칭(본문 라벨 + 48px 칸)이 칸 모양 두 벌을, 매칭 만들기 한 화면이 높이 세 가지(토글 44 · 입력 48 · 코트명 50)를 쓰다가 "사이즈가 다르다"는 피드백을 받았다(11-26).

## 높이 — 두 단계 (`FIELD_HEIGHT` · `FIELD_SCALE`)

| size | 높이 | 쓰는 자리 |
|---|---|---|
| `lg` (기본) | 44px | **폼의 칸** — 같은 줄의 선택 토글(`FieldToggle`)·폼 제출 버튼(`FormActions`)과 같은 높이 |
| `md` | 36px | 표·패널 안의 작은 칸 — 보드 스코어 칸·비회원 추가 줄·1인당 게임 수·보드 선수 select |

높이는 누름 단계표(`PRESS_HEIGHT`)에서 읽는다 — 칸과 옆 버튼·토글이 같은 표다. 손으로 `h-12`·`py-3`를 적지 않는다.

## 모양 — 하나

- 칸: `fieldClass({ size, multiline, className })` — 테두리·바탕·둥글기·좌우 여백·글자 16px(iOS Safari가 16px 미만 칸에 포커스하면 화면을 확대한다)·placeholder 보조색·포커스 테두리·비활성. 여러 줄(textarea)은 `multiline`(높이 대신 위아래 여백).
- 선택(`EnumSelect`): 기본 트리거가 `FIELD_SELECT_TRIGGER` — 같은 44px·같은 모양.
- 바꿀 수 없는 값: `FIELD_READONLY`(같은 높이, 회색 바탕, 값은 기본색).
- 라벨: `FIELD_LABEL` — 본문 크기(16px) 굵게, **보조색**(글자색 규칙: 필드 이름표 = 보조). 필수는 ` *`, 선택은 ` (선택)`.
- 아래 한 줄: `fieldMessageClass(tone)` — 도움말(보조) · 오류(destructive) · 주의(spot), 12px.

## 쓰는 법

```tsx
<Field id="match-title" label="방 제목" required message="목록에 그대로 보입니다.">
    <input id="match-title" className={fieldClass()} />
</Field>
<TextField id="email" label="이메일" message={error} messageTone="destructive" />   // 한 줄 글자 칸
<EnumSelect value={v} onValueChange={set} options={OPTIONS} ariaLabel="시작" />    // 선택 — 트리거가 같은 칸
<input className={fieldClass({ size: 'md', className: 'w-11 px-0 text-center' })} />  // 표 안의 작은 칸
```

## 하지 말 것 (`src/components/common/field.test.ts`가 막는다)

- 옛 토큰(로그인 폼용·경기 폼용 칸·라벨 상수) — 지웠다
- `<input>`·`<select>`·`<textarea>`를 칸 규칙 없이 쓰기 — 허용 목록(체크박스·숨은 파일 입력·hidden)에 이유와 함께 올린 파일만
- `SelectTrigger`를 직접 쓰기 — `EnumSelect`를 거친다(카드 머리의 작은 선택 둘만 허용 목록)
