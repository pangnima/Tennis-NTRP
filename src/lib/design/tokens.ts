export const CARD_BASE = 'rounded-lg border border-border bg-card'
export const CARD_HOVER = 'hover:bg-muted/50 transition-colors'

/**
 * 시맨틱 타이포 스케일 — 8레벨 + 배지 예외 (docs/typography.md).
 * 사이즈·줄간격·자간은 globals.css @theme 토큰(text-display/h1~h4/body/body2/caption/micro)이 담당하고,
 * 여기서는 굵기·색상만 조합한다. 원칙: 태그는 문서 아웃라인, 클래스는 시각 레벨.
 *
 * | 레벨    | 모바일→데스크톱 | 용도                               |
 * | display | 36→48px         | 랜딩 최상단 카피                   |
 * | h1      | 28→36px         | 페이지 대제목 (PageHeader)         |
 * | h2      | 24→28px         | 문서형 화면(랜딩·가이드·인증) 주요 섹션 |
 * | h3      | 20→24px         | 앱 화면 페이지 내 섹션 헤더        |
 * | h4      | 18→20px         | 카드 제목·폼 그룹 제목             |
 * | body    | 16px 고정       | 기본 본문·폼                       |
 * | body2   | 14px 고정       | 부가 텍스트·메타·nav               |
 * | caption | 12px 고정       | 캡션·경고·도움말·범례              |
 * | micro   | 11px (예외)     | 배지·카운트 전용 — 본문 금지       |
 */
export const TYPO = {
    display: 'text-display font-extrabold text-foreground',
    h1: 'text-h1 font-bold text-foreground',
    h2: 'text-h2 font-bold text-foreground',
    h3: 'text-h3 font-semibold text-foreground',
    h4: 'text-h4 font-semibold text-foreground',
    // 값은 Strong·기본(둘 다 기본색 — 위계는 굵기로), Muted는 값이 아닌 설명·도움말 전용이다(글자색 두 단계 — TEXT_TONES)
    bodyStrong: 'text-body font-semibold text-foreground',
    body: 'text-body text-foreground',
    bodyMuted: 'text-body text-muted-foreground',
    body2Strong: 'text-body2 font-medium text-foreground',
    body2: 'text-body2 text-foreground',
    body2Muted: 'text-body2 text-muted-foreground',
    captionStrong: 'text-caption font-medium text-foreground',
    caption: 'text-caption text-muted-foreground',
    /** 열 제목·필드 캡션 — 12px medium muted. 표의 머리 줄과 통계 수치의 이름표 */
    label: 'text-caption font-medium text-muted-foreground',
    /** 소형 대문자 라벨(구 mono-label) — 12px caps + 넓은 자간 */
    eyebrow: 'text-caption font-medium tracking-eyebrow uppercase tabular-nums text-muted-foreground',
    /** 배지·카운트 전용 예외 11px */
    micro: 'text-micro font-medium leading-none',
} as const

/**
 * 타이포 단계표 — `/styleguide`와 문서가 이 배열을 그대로 그린다(화면이 코드와 어긋날 수 없다).
 * `use`가 **자리 규칙**이다: 크기는 자리가 정하고, 한 줄(행) 안에서는 크기 단계 하나만 쓴다(필·칩 제외).
 */
export const TYPO_SCALE: ReadonlyArray<{ token: keyof typeof TYPO; size: string; use: string }> = [
    { token: 'display', size: '36→48px', use: '랜딩 최상단 카피' },
    { token: 'h1', size: '28→36px', use: '페이지 제목 — PageHeader만' },
    { token: 'h2', size: '24→28px', use: '문서형 화면(랜딩·가이드·약관)의 섹션' },
    { token: 'h3', size: '20→24px', use: '앱 화면의 섹션 제목(h2 태그)' },
    { token: 'h4', size: '18→20px', use: '카드·빈 상태·폼 그룹 제목' },
    { token: 'bodyStrong', size: '16px', use: '모바일 카드의 주 정보' },
    { token: 'body', size: '16px', use: '본문·폼 입력' },
    { token: 'body2Strong', size: '14px', use: '목록(표) 행의 주 정보' },
    { token: 'body2', size: '14px', use: '목록 행의 값(날짜·장소·숫자)·메뉴·버튼' },
    { token: 'body2Muted', size: '14px', use: '설명·도움말 문장 — 값에는 쓰지 않는다' },
    { token: 'captionStrong', size: '12px', use: '12px 자리의 값' },
    { token: 'label', size: '12px', use: '열 제목·필드 이름표' },
    { token: 'caption', size: '12px', use: '도움말·범례·눈금 — 값이 아닌 12px' },
    { token: 'micro', size: '11px', use: '배지·카운트 전용(본문 금지)' },
]

// 목록 컨테이너 — 카드 안에서 행을 구분선으로 가른다(목록 화면·명단·라운드 묶음)
export const LIST_CARD = `${CARD_BASE} divide-y divide-border`
// 본문 안 텍스트 링크 — 색·밑줄만 든다. 크기는 자리마다 TYPO를 앞에 붙인다(버튼은 ActionButton)
export const TEXT_LINK = 'text-primary hover:underline'
// 빈 상태도 데이터 카드(CARD_BASE)와 동일한 채워진 surface로 표시 — 라이트 모드 시인성.
// break-keep: 한글이 글자 단위가 아닌 어절(띄어쓰기) 단위로 줄바꿈되도록.
export const EMPTY_BLOCK =
    'rounded-lg border border-border bg-card text-muted-foreground text-body2 text-center py-8 px-4 break-keep'

export const TEXT_MUTED = 'text-muted-foreground'

/**
 * **글자색은 두 단계다** — 기본(값)과 보조(값이 아닌 것). 그 사이 단계를 알파(`text-foreground/70`)나 `opacity`로 만들지 않는다.
 *   · 판정: 그 글자를 지우면 정보가 사라지면 값, 값은 남고 설명만 줄면 이름표·도움말
 *   · 위계는 색이 아니라 굵기로 만든다(주 정보 medium·semibold, 나머지 regular)
 *   · 회색 바탕(`bg-muted`) 위의 값도 기본색. 누를 수 없는 컨트롤만 `disabled:opacity-50`
 * 대비 문턱(`colors.test.ts`가 강제): 기본 7:1 이상, 보조도 카드·배경 위 7:1 이상 · 회색 바탕 위 5.5:1 이상.
 */
export const TEXT_TONE = { base: 'text-foreground', sub: 'text-muted-foreground' } as const
/** 단계표 — `/styleguide`와 문서가 그대로 그린다 */
export const TEXT_TONES: ReadonlyArray<{ tone: keyof typeof TEXT_TONE; name: string; use: string; sample: string }> = [
    { tone: 'base', name: '기본', use: '읽어야 하는 값 — 이름·날짜·시간·장소·숫자·메모·본문. 회색 바탕 위의 값도 기본', sample: '11.26 (목) 10:00~12:00 · 목동 실내코트 · 6-4' },
    { tone: 'sub', name: '보조', use: '값이 아닌 것 — 열 제목·필드 이름표·도움말·구분 기호(· vs)·placeholder·선택 안 된 탭/칩', sample: '날짜 · 경기장 · 스코어 · 한 번만 입력할 수 있습니다' },
]

// 폼의 칸·라벨·아래 한 줄은 `components/common/field-class.ts` 한 곳이 정한다(`docs/forms.md`).
// 옛 칸·라벨 토큰(로그인 폼용 한 벌, 경기 폼용 한 벌)은 칸 모양 두 벌·높이 세 가지를 만들어 지웠다(11-26).

/**
 * 폼·팝업 하단 액션 줄 — 저장(옐로우, ActionButton `solid`) 왼쪽 / 취소 오른쪽, 우측 정렬.
 * 직접 기록 폼의 치수가 정본이고 모든 저장형 팝업과 매칭 만들기가 이것을 그대로 쓴다.
 * 좁은 화면에서는 저장이 폭을 채우고(flex-1), lg부터 고정 폭으로 우측에 붙는다.
 */
export const FORM_ACTION_ROW = 'flex w-full gap-3 lg:justify-end'
// 높이는 여기 적지 않는다 — 버튼 단계(ActionButton lg = 44px)가 정한다. 여기는 폭만
export const FORM_SUBMIT = 'flex-1 lg:flex-none lg:min-w-44'
export const FORM_CANCEL = 'lg:min-w-24'
