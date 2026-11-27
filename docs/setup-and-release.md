# 처음부터 배포까지 — 새 PC 세팅 · 매일 개발 · DB 변경 · 실서비스 배포

> **누구를 위한 문서인가**: 프론트엔드는 해 봤지만 배포는 처음인 사람. 위에서부터 순서대로 따라 하면 된다.
> **기준 시점**: 2026-11-27. 대시보드(Vercel·Supabase·Google)의 메뉴 이름은 가끔 바뀐다 — 이름이 다르면 **같은 뜻의 메뉴**를 찾으면 된다.
> **비밀값은 이 문서에 없다.** 「어디서 찾는지」만 적는다. 이 문서는 GitHub에 올라가므로 여기에 키·비밀번호를 적지 않는다.

각 단계는 같은 모양이다.

- **왜** — 이 단계가 하는 일 한 줄
- **할 일** — 번호 순서. 회색 상자의 명령은 그대로 복사해 붙여 넣는다
- **확인** — 성공하면 무엇이 보이는가
- **막히면** — [§8 문제 해결](#8-문제-해결)에서 증상을 찾는다

명령 상자는 운영체제별로 나뉜다. **Windows는 PowerShell**(시작 메뉴 → 「PowerShell」), **Mac은 터미널**(Spotlight → 「터미널」)에 붙여 넣는다.

> 💬 **Claude에게 맡기기** 상자는 Claude Code에게 그대로 말하면 되는 문장이다. Claude 없이 하려면 그 아래 「직접 하기」를 따른다.

---

## 목차

0. [한눈에 보기 — 무엇이 어디에 있나](#0-한눈에-보기)
1. [계정과 로그인](#1-계정과-로그인)
2. [비밀값 지도](#2-비밀값-지도)
3. [새 PC 세팅](#3-새-pc-세팅)
4. [매일 개발하는 흐름](#4-매일-개발하는-흐름)
5. [DB 바꾸기(마이그레이션)](#5-db-바꾸기마이그레이션)
6. [실서비스 배포(릴리스)](#6-실서비스-배포릴리스)
7. [대시보드 설정 기록](#7-대시보드-설정-기록)
8. [문제 해결](#8-문제-해결)
9. [용어집](#9-용어집)

---

## 0. 한눈에 보기

### 코드가 사용자에게 닿기까지

```
 ┌──────────── 내 PC ─────────────┐
 │  코드 고치기 → npm run dev      │   localhost:3000 은 언제나 테스트 DB(dev)에 붙는다
 └──────────────┬─────────────────┘
                │ git push
                ▼
 ┌──────────── GitHub (pangnima/ttd) ────────────┐
 │  dev 브랜치  ── 평소 작업이 쌓이는 곳            │
 │  main 브랜치 ── 실서비스에 나간 코드 (릴리스 때만) │
 └───────┬──────────────────────────┬────────────┘
         │ dev에 push하면 자동         │ main에 push하면 자동
         ▼                           ▼
 ┌─ Vercel Preview ─────┐   ┌─ Vercel Production ───────────────┐
 │ 미리보기 주소(매번 다름) │   │ https://baselineplay.vercel.app   │
 │ → Supabase dev 에 붙음 │   │ → Supabase prod 에 붙음 (실사용자) │
 └──────────────────────┘   └───────────────────────────────────┘

 Supabase dev  (TennisClubs, xiwwbgltkbvxdzxxxoba)        — 테스트 계정 57명, 마음대로 써도 된다
 Supabase prod (baselineplay-prod, rjuhydxaoizgfiatyfpo) — 실사용자. 데이터를 손으로 고치지 않는다
 Google Cloud  — 「Google로 계속하기」 로그인 버튼의 설정
```

**핵심 세 가지**
1. 평소에는 `dev` 브랜치에서만 일한다. `dev`에 push하면 **미리보기**가 만들어질 뿐, 사용자는 아무 영향을 받지 않는다.
2. 실서비스 배포 = `dev`를 `main`에 합치고 push하는 것. 그러면 Vercel이 알아서 빌드해 `baselineplay.vercel.app`을 바꾼다.
3. DB는 둘이다. 내 PC와 미리보기는 **dev DB**, 실서비스만 **prod DB**를 쓴다. DB 구조를 바꿀 때는 dev에 먼저, 실서비스 배포 때 prod에 같은 것을 적용한다.

### 다른 PC로 옮기면 전부 다시 해야 하나? — **아니다**

| 구분 | 무엇 | 새 PC에서 |
|---|---|---|
| **클라우드에 남는 것** | GitHub의 코드·브랜치·기록 / Vercel 프로젝트·환경변수·배포 기록 / Supabase 두 프로젝트(DB·로그인 설정·저장된 사진) / Google 로그인 설정 / Claude 계정 | **아무것도 안 해도 된다.** 로그인만 하면 그대로 있다 |
| **PC마다 다시 하는 것** (약 30~60분) | 프로그램 설치(Git·Node.js·Claude Code) / 코드 받기(`git clone`) / 라이브러리 설치(`npm install`) / `.env.local` 파일 / Claude Code의 MCP 연결 | [§3](#3-새-pc-세팅)을 순서대로 |
| **옮기면 좋은 것** | `.env.local`에 넣은 값 → 비밀번호 관리자에 보관해 두면 새 PC에서 대시보드를 다시 뒤지지 않아도 된다 / Claude의 메모리 폴더(선택, [§3.10](#310-선택-claude-메모리-옮기기)) | 복사 |

> 왜 `.env.local`은 git에 없나? 비밀값이 들어 있어서 `.gitignore`가 일부러 올리지 않는다. 그래서 **clone만으로는 앱이 뜨지 않고**, §3.6에서 손으로 만든다.

---

## 1. 계정과 로그인

**왜** — 개발·배포에 관여하는 서비스는 다섯 곳이다. 새 PC에서는 브라우저로 각각 로그인만 하면 된다.

| 서비스 | 주소 | 여기서 하는 일 | 자주 가는 화면 |
|---|---|---|---|
| **GitHub** | github.com | 코드 보관. 저장소 `pangnima/ttd` | 저장소 → Branches · Pull requests |
| **Vercel** | vercel.com | 코드를 빌드해 인터넷에 올린다. 프로젝트 `baselineplay` | 프로젝트 → Deployments · Settings → Environment Variables |
| **Supabase** | supabase.com/dashboard | DB·로그인 서버. 프로젝트 둘(dev·prod) | 프로젝트 → Table Editor · SQL Editor · Authentication · Project Settings |
| **Google Cloud Console** | console.cloud.google.com | 「Google로 계속하기」 버튼의 OAuth 설정 | APIs & Services → Credentials · OAuth consent screen |
| **Claude** | claude.ai | Claude Code 로그인 | — |

**할 일**
1. 다섯 곳 모두 **어떤 방법으로 가입했는지**(이메일·GitHub로 로그인·Google로 로그인) 비밀번호 관리자나 개인 메모에 적어 둔다. Vercel·Supabase는 보통 「GitHub로 로그인」이다.
2. GitHub·Vercel·Supabase에는 **2단계 인증**(Two-factor)을 켜 둔다. 이 계정을 잃으면 서비스를 통째로 잃는다.

**확인** — 다섯 곳에 로그인했을 때 Vercel에 `baselineplay`, Supabase에 프로젝트 두 개가 보인다.

---

## 2. 비밀값 지도

**왜** — 앱은 「어느 DB에 붙을지」와 「어떤 열쇠를 쓸지」를 **환경변수**로 받는다. 같은 이름의 변수에 **환경마다 다른 값**을 넣는 것이 전부다.

### 가장 중요한 규칙 — 이름의 `NEXT_PUBLIC_`

| 이름 모양 | 뜻 | 이 프로젝트에서 |
|---|---|---|
| `NEXT_PUBLIC_…` | **공개해도 되는 값**에 붙이는 이름표. 브라우저(사용자 PC)까지 전달된다. **빌드할 때 코드 안에 박힌다** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` — **꼭 있어야 한다** |
| 그 외 | 서버에서만 읽는 값 | `SUPABASE_SERVICE_ROLE_KEY` — **유일한 진짜 비밀**. 절대 `NEXT_PUBLIC_`을 붙이지 않는다 |

> ⚠ **실제로 있었던 사고(2026-11-27)** — 「`NEXT_PUBLIC_`은 넣으면 안 된다」고 잘못 이해해 Vercel에서 `NEXT_PUBLIC_SUPABASE_URL`·`_ANON_KEY`를 지웠더니 **실서비스의 모든 페이지가 500**이 됐다(`MIDDLEWARE_INVOCATION_FAILED`). 올바른 규칙은 「**비밀값에** `NEXT_PUBLIC_`을 붙이지 않는다」이다. 공개 값은 `NEXT_PUBLIC_`이 맞다.

### 값마다 — 무엇 · 어디서 · 어디에

| 변수 | 무엇 | 어디서 찾나 (Supabase 대시보드, 해당 프로젝트) | 넣는 곳 | 비밀? |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | DB·로그인 서버 주소 | 프로젝트 화면 위쪽 **[Connect]** 버튼, 또는 **Project Settings → Data API**의 Project URL. 모양: `https://<프로젝트ID>.supabase.co` | 로컬 = dev · Vercel Preview = dev · Vercel Production = prod | 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 브라우저가 쓰는 공개 키(권한은 DB의 RLS가 막는다) | **Project Settings → API Keys** → 「Publishable and secret API keys」 탭의 **Publishable key**(`sb_publishable_…`). 옛 「Legacy API Keys」 탭의 `anon`(`eyJ…`)도 동작한다 | 위와 같음 | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 만능 열쇠. 게임을 기록할 때 레이팅을 다시 계산한다. **없으면 랭킹·레이팅이 멈춘다** | **Project Settings → API Keys** → 「Legacy API Keys」 탭의 `service_role`[Reveal](`eyJ…`) — 또는 같은 화면 「Secret keys」의 `sb_secret_…`(Legacy가 폐지되면 이쪽으로 바꾼다, Supabase 예고는 2026년 말·미확정) | 위와 같음 | **비밀** |
| `NEXT_PUBLIC_SITE_URL` | 링크 미리보기(OG)·로그인 복귀에 쓰는 사이트 주소 | 값은 `https://baselineplay.vercel.app` | **Vercel Production에만**. 로컬·Preview는 비워 둔다 | 공개 |
| `CRON_SECRET` | 매일 1회 prod DB를 깨우는 예약 작업(`/api/keepalive`)의 열쇠. 없어도 동작한다 | 아무 긴 무작위 문자열(직접 만든다) | Vercel Production에만(선택) | 비밀 |
| `DATABASE_URL` | DB 직접 연결 문자열 — `scripts/db-history.ts` 같은 도구 전용. 앱은 쓰지 않는다 | 프로젝트 **[Connect]** → Direct connection. `[YOUR-PASSWORD]`는 DB 비밀번호(모르면 Project Settings → Database → Reset database password) | 로컬 `.env.local`(선택, dev 것만) | 비밀 |
| Google Client ID / Secret | 「Google로 계속하기」의 열쇠 | Google Cloud Console → Credentials → OAuth 2.0 클라이언트 | **코드·`.env`에는 없다.** Supabase 대시보드 Authentication → Sign In / Providers → Google에 넣는다 | Secret은 비밀 |

> 💡 Supabase [Connect] 화면은 키 이름을 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`로 보여 줄 수 있다. **값만** 가져오고 이름은 우리 것(`NEXT_PUBLIC_SUPABASE_ANON_KEY`)으로 쓴다. 이름이 다르면 앱이 키를 못 찾는다.

---

## 3. 새 PC 세팅

순서대로 하면 된다. **3.1~3.8은 필수, 3.9~3.10은 Claude Code를 쓸 때.**

### 3.1 Git 설치

**왜** — 코드를 GitHub에서 받고 올리는 도구.

**할 일**

Windows (PowerShell):
```powershell
winget install --id Git.Git -e
```
> winget이 없다고 나오면 https://git-scm.com/download/win 에서 설치 파일을 받아 기본값으로 「Next」만 누른다.

Mac (터미널):
```bash
xcode-select --install
```
> 창이 뜨면 [설치]. 이미 있으면 「already installed」라고 나온다.

**설치 뒤 PowerShell·터미널을 껐다 다시 연다**(새로 설치한 명령은 새 창에서만 보인다). 그리고 내 이름을 등록한다(커밋에 찍히는 이름).

Windows · Mac 공통:
```bash
git config --global user.name "pwjang"
git config --global user.email "GitHub에-등록한-이메일"
```

**확인**
```bash
git --version
```
→ `git version 2.xx` 가 나오면 성공.

### 3.2 Node.js 설치

**왜** — Next.js 앱을 실행·빌드하는 엔진. `npm`도 함께 깔린다.

**어떤 버전?** — **LTS**(장기 지원판)를 깐다. 가장 안전한 것은 **Vercel이 쓰는 버전과 같은 큰 번호**다.
- Vercel 쓰는 버전 확인: Vercel → 프로젝트 `baselineplay` → **Settings → Build and Deployment → Node.js Version**
- 2026-11 기준: Node **26**이 최신 LTS, **24**도 지원 중(이전 PC는 24). Next.js 16은 둘 다 된다.

**할 일**

Windows (PowerShell):
```powershell
winget install OpenJS.NodeJS.LTS
```

Mac: https://nodejs.org 에서 **LTS** 버튼의 `.pkg`를 받아 설치한다.

> 특정 버전(예: 24)이 필요하면 https://nodejs.org/en/download 에서 버전을 골라 받는다.

**확인** (창을 새로 열고)
```bash
node -v
npm -v
```
→ `v26.x.x`(또는 `v24.x.x`)와 `11.x.x` 같은 숫자가 나오면 성공.

### 3.3 (선택) VS Code

https://code.visualstudio.com 에서 설치. 코드를 읽고 고칠 편집기다. Claude Code만으로 작업한다면 없어도 된다.

### 3.4 코드 받기 (`git clone`)

**왜** — GitHub의 코드를 내 PC로 복사한다.

**어디에?** — Windows는 **`C:\ttd`**, Mac은 **`~/ttd`**(홈 폴더 아래)를 권장한다. 경로가 같으면 Claude의 메모리 폴더 이름도 같아진다([§3.10](#310-선택-claude-메모리-옮기기)).

Windows (PowerShell):
```powershell
cd C:\
git clone https://github.com/pangnima/ttd.git
cd C:\ttd
git checkout dev
```

Mac (터미널):
```bash
cd ~
git clone https://github.com/pangnima/ttd.git
cd ~/ttd
git checkout dev
```

- 저장소가 비공개라 처음 clone(또는 첫 push) 때 **브라우저 창이 떠서 GitHub 로그인**을 물어본다(Git Credential Manager). 로그인하고 [Authorize]를 누르면 이 PC가 기억한다.
- `git checkout dev` — 작업 브랜치로 옮긴다. **평소에는 항상 `dev`에 있어야 한다.**

**확인**
```bash
git branch --show-current
```
→ `dev`

### 3.5 라이브러리 설치 (`npm install`)

**왜** — `package.json`에 적힌 라이브러리(Next.js, React, Supabase…)를 `node_modules` 폴더에 내려받는다.

```bash
npm install
```
→ 1~3분. 마지막에 `added NNN packages` 가 나오면 성공. 빨간 `ERR!`이면 §8.
> 노란 `npm warn allow-scripts … esbuild · msw · unrs-resolver` 경고는 **무시해도 된다**(최신 npm이 설치 스크립트를 묻는 것 — 2026-11 새 clone에서 이 경고가 뜬 채로 확인 4종이 모두 통과했다). `npm approve-scripts`는 하지 않아도 된다.

### 3.6 `.env.local` 만들기

**왜** — 앱이 어느 DB(dev)에 어떤 키로 붙을지 알려 준다. git에 없으므로 PC마다 만든다. **로컬은 언제나 dev 값만 넣는다**(실수로 실서비스 데이터를 건드리지 않게).

**할 일**
1. 견본 파일을 복사한다.

   Windows (PowerShell):
   ```powershell
   Copy-Item .env.example .env.local
   ```
   Mac (터미널):
   ```bash
   cp .env.example .env.local
   ```
2. `.env.local`을 편집기로 연다(VS Code: `code .env.local` / Windows 메모장: `notepad .env.local` / Mac: `open -e .env.local`).
3. Supabase 대시보드에서 **dev 프로젝트(TennisClubs)**를 열고 [§2 표](#값마다--무엇--어디서--어디에)대로 세 줄을 채운다.
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xiwwbgltkbvxdzxxxoba.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_…(대시보드에서 복사)
   SUPABASE_SERVICE_ROLE_KEY=…(대시보드에서 복사)
   ```
   `NEXT_PUBLIC_SITE_URL`은 비워 둔다. 나머지(`#`으로 시작하는 줄)는 그대로 둔다.
4. 저장한다. `=` 앞뒤에 공백이나 따옴표를 넣지 않는다.

> 비밀번호 관리자에 예전 PC의 `.env.local` 값을 보관해 두었다면 그대로 붙여 넣으면 된다.

### 3.7 실행해 보기 (`npm run dev`)

```bash
npm run dev
```
→ `Local: http://localhost:3000` 이 나오면 브라우저로 연다.

**확인**
1. 랜딩 화면이 뜬다.
2. [로그인] → 아이디 `namja01`, 비밀번호 `123123`(dev 테스트 계정 — `docs/e2e/README.md`) → 홈 화면이 뜨면 **DB 연결까지 성공**.
3. 끌 때는 그 창에서 `Ctrl + C`.

### 3.8 확인 명령 네 가지

**왜** — 고친 코드가 실서비스 빌드에서도 통과하는지 미리 본다. 커밋 전마다 돌리는 것이 규칙이다.

Windows (PowerShell) — 한 줄씩:
```powershell
npx tsc --noEmit
npm run lint
npm run build
npx vitest run
```
Mac (터미널) — 한 번에:
```bash
npx tsc --noEmit && npm run lint && npm run build && npx vitest run
```

**확인** — 넷 다 빨간 `error` 없이 끝나면 성공. `build`는 1~3분, `vitest`는 마지막에 `Tests  NNN passed`.

### 3.9 Claude Code 설치와 연결

**왜** — Claude가 코드를 읽고 고치고, MCP로 Supabase DB·브라우저를 다룬다.

**1) 설치** — 공식 설치 프로그램(관리자 권한 필요 없음).

Windows (PowerShell):
```powershell
irm https://claude.ai/install.ps1 | iex
```
Mac (터미널):
```bash
curl -fsSL https://claude.ai/install.sh | bash
```
창을 새로 열고 확인:
```bash
claude --version
claude doctor
```

**2) 로그인** — 프로젝트 폴더에서 `claude`를 실행하면 브라우저로 Claude 계정 로그인을 묻는다.
```bash
cd C:\ttd        # Mac은 cd ~/ttd
claude
```

**3) MCP 연결** — Claude가 쓰는 외부 도구 셋. **Claude를 끈 상태(일반 PowerShell·터미널)**에서 한 번만 실행한다. `--scope user` = 이 PC의 모든 프로젝트에서 쓴다.
```bash
claude mcp add --scope user --transport http supabase https://mcp.supabase.com/mcp
claude mcp add --scope user --transport http context7 https://mcp.context7.com/mcp
claude mcp add --scope user playwright -- npx @playwright/mcp@latest
```
| MCP | 하는 일 |
|---|---|
| `supabase` | Claude가 DB를 조회하고 마이그레이션을 적용한다(dev·prod 둘 다 — 규칙상 prod는 조회와 마이그레이션 적용만) |
| `context7` | 라이브러리 최신 문서를 찾아본다 |
| `playwright` | 브라우저를 띄워 화면을 눌러 보며 테스트(E2E)한다 |

**4) Supabase 인증** — `claude`를 실행하고 입력창에 `/mcp` → `supabase` 선택 → **Authenticate** → 브라우저에서 Supabase 로그인 → 조직 접근 [Authorize].

**확인**
```bash
claude mcp list
```
→ 세 줄 모두 `✔ Connected`. Claude에게 「dev DB의 users 수를 알려줘」라고 물어 숫자가 나오면 끝.

> Windows에서 `playwright`만 연결이 안 되면 지우고 `cmd /c`를 붙여 다시 등록한다:
> `claude mcp remove playwright` → `claude mcp add --scope user playwright -- cmd /c npx @playwright/mcp@latest`

### 3.10 (선택) Claude 메모리 옮기기

**왜** — Claude가 대화에서 배운 「기억」(사용자 취향·주의사항)은 **PC 안에만** 있다. 프로젝트 규칙은 저장소의 `CLAUDE.md`에 있으므로 옮기지 않아도 일은 된다. 기억까지 이어 가고 싶을 때만 한다.

- 위치(이전 PC): `<사용자 폴더>\.claude\projects\C--ttd\memory\` (Mac: `~/.claude/projects/-Users-<이름>-ttd/memory/`)
- 폴더 이름(`C--ttd`)은 **프로젝트 경로**에서 만들어진다. 새 PC에서 프로젝트 폴더로 `claude`를 한 번 실행하면 `projects` 아래에 새 폴더가 생긴다 → 그 안에 `memory` 폴더를 통째로 복사한다.

---

## 4. 매일 개발하는 흐름

**왜** — 이 순서를 지키면 실서비스는 절대 건드리지 않고 안전하게 작업이 쌓인다.

```
① 최신 받기 → ② 고치기 → ③ 확인 4종 → ④ 커밋 → ⑤ push → ⑥ 미리보기 확인
```

> 💬 **Claude에게 맡기기**: 「○○ 기능 고쳐줘」 → 끝나면 「확인하고 dev에 커밋·push해줘」. Claude는 `CLAUDE.md` 규칙대로 확인 명령을 돌리고 `dev`에만 커밋한다.

**직접 하기**

1. 시작 전 — 내가 `dev`에 있는지, 최신인지:
   ```bash
   git checkout dev
   git pull
   ```
2. 코드를 고치고 `npm run dev`로 화면을 본다.
3. [§3.8](#38-확인-명령-네-가지) 확인 명령 넷.
4. 커밋 — 무엇을 바꿨는지 한 줄로:
   ```bash
   git add -A
   git commit -m "✨ feat: 매칭 목록에 정렬 추가"
   ```
   메시지 앞머리는 관례(`feat` 기능 · `fix` 버그 · `docs` 문서 · `refactor` 정리).
5. 올리기:
   ```bash
   git push origin dev
   ```
6. **미리보기 확인** — Vercel → `baselineplay` → **Deployments** 맨 위 줄(Branch `dev`, 환경 Preview)이 `Building` → `Ready`가 되면 그 줄을 눌러 [Visit]. 미리보기는 **dev DB**라 테스트 계정으로 로그인해 본다.
   > 미리보기에서는 구글 로그인이 안 될 수 있다(미리보기 주소가 Supabase 허용 목록에 없어서 — 정상). 아이디 로그인으로 본다.

**왜 `main`에서 작업하지 않나** — `main`에 push하는 순간 실서비스가 바뀐다. 실수 한 번이 사용자에게 바로 보인다. 그래서 `main`은 [§6](#6-실서비스-배포릴리스)의 릴리스 때만 움직인다.

---

## 5. DB 바꾸기(마이그레이션)

**왜** — 테이블·컬럼·함수(RPC)·권한을 바꾸는 일. DB는 코드처럼 「덮어쓰기」가 안 되므로 **바꾸는 SQL을 파일로 남기고, 그 파일을 차례로 적용**한다.

| 말 | 뜻 |
|---|---|
| 마이그레이션 파일 | `supabase/migrations/0113_무엇.sql` — 바꾸는 SQL. 번호가 순서다 |
| 적용 기록 | 각 DB 안의 `supabase_migrations.schema_migrations` 표. 「어디까지 적용했나」 |
| 재현 정본 | `supabase/history/` — dev 적용 기록의 사본. 새 DB를 처음부터 만들 때 쓴다 |

**순서는 언제나 dev 먼저.** prod에는 [§6 릴리스](#6-실서비스-배포릴리스) 때 같은 파일을 적용한다.

> 💬 **Claude에게 맡기기(권장)**: 「○○ 하려면 DB를 어떻게 바꿔야 해? 마이그레이션 만들어서 dev에 적용해줘」
> Claude가 하는 일: 파일 작성 → dev에서 **롤백 스모크**(적용해 보고 결과만 확인한 뒤 되돌림) → dev 적용 → `supabase/history`·`src/types/supabase.ts` 갱신 → 앱 코드 수정 → 확인 4종 → `dev` 커밋. **prod는 건드리지 않는다.**

**직접 하기** (Claude 없이 — 실수하기 쉬우니 가능하면 위 방법)

1. `supabase/migrations/`에 다음 번호로 파일을 만든다(예: `0113_add_match_level.sql`).
2. Supabase 대시보드 → **dev 프로젝트** → **SQL Editor** → [New query] → 파일 내용을 붙여 넣고 **[Run]**. 에러가 없어야 한다.
3. **적용 기록 남기기** — 같은 SQL Editor에서 새 쿼리로 아래를 실행한다. `$mig$`와 `$mig$` 사이에 **2번에서 실행한 파일 내용을 그대로 한 번 더** 붙인다.
   ```sql
   insert into supabase_migrations.schema_migrations (version, name, statements)
   values (
       to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS'),
       '0113_add_match_level',
       array[$mig$
   -- 여기에 파일 내용 전체
   $mig$]
   );
   ```
   > 빠뜨리면 「어디까지 적용했나」가 어긋나 다음 릴리스 때 prod에 무엇을 적용할지 헷갈린다.
4. `supabase/history/`에 같은 내용을 `<위 version>_<name>.sql`로 저장한다(앞의 파일들 머리 두 줄 모양을 따른다).
5. 타입 갱신(`src/types/supabase.ts`)은 Claude에게 「dev 기준으로 supabase 타입 다시 만들어줘」가 가장 쉽다.
6. 확인 4종 → `dev` 커밋·push.

**하지 말 것**
- prod SQL Editor에서 데이터를 직접 고치기(INSERT/UPDATE/DELETE). 실사용자 데이터다.
- 파일 없이 SQL Editor에서만 구조를 바꾸기 — 기록이 없으면 prod에 재현되지 않는다.

---

## 6. 실서비스 배포(릴리스)

**왜** — `dev`에 쌓인 것을 사용자에게 내보낸다. **앱(Vercel)과 DB(Supabase prod)는 따로 움직이므로 순서가 중요하다.**

> 💬 **Claude에게 맡기기**: 「릴리스 진행해줘」
> Claude가 하는 일: 6.1~6.3 확인과 prod 마이그레이션 적용, 6.4 병합·push, 6.6 확인. **사람이 할 일**은 Vercel 화면에서 배포를 지켜보고(6.5) 실서비스를 눌러 보는 것(6.6). 환경변수를 새로 넣어야 하는 릴리스라면 그것도 사람 몫이다(§7.1).

### 6.0 사전 확인 체크리스트

- [ ] `dev`에서 확인 4종 통과
- [ ] 바뀐 흐름의 E2E(`docs/e2e/rebuild-scenarios.md`)를 dev에서 돌렸다
- [ ] 모두 커밋·push했다(`git status`가 깨끗)
- [ ] 미리보기(Preview)가 `Ready`이고 눌러 봤다
- [ ] 새 환경변수가 필요한 변경이면 Vercel **Production**에 미리 넣었다(§7.1)

### 6.1 이번 릴리스에 무엇이 들어가나

```bash
git fetch origin
git log --oneline origin/main..origin/dev
git diff --stat origin/main..origin/dev -- supabase/migrations
```
- 첫 명령: 나갈 커밋 목록.
- 둘째 명령: 아무것도 안 나오면 **DB 변경 없음** → 6.3을 건너뛴다. 파일이 나오면 그 번호들을 prod에 적용해야 한다.

### 6.2 순서 고르기 — DB 먼저? 앱 먼저?

| 이번 DB 변경이 | 순서 | 이유 |
|---|---|---|
| **더하기만**(새 테이블·컬럼·함수, 기존 함수를 호환되게 고침) | **DB 먼저 → 앱** | 옛 앱은 새것을 몰라도 그대로 돈다. 새 앱은 뜨자마자 새 함수가 필요하다 |
| **지우기·이름 바꾸기**(옛 테이블 삭제 등) | **앱 먼저 → DB** | DB를 먼저 지우면 아직 떠 있는 옛 앱이 그것을 찾다가 터진다 |
| 둘 다 섞임 | 더하는 파일 → 앱 → 지우는 파일 | Week 72 실제 순서: `0096`(새 테이블) → 앱 배포 → `0097`(옛 테이블 삭제) → `0098~0112` |

애매하면 Claude에게 「이번 마이그레이션들, 앱보다 먼저 적용해도 안전해?」라고 묻는다.

### 6.3 prod 마이그레이션 적용

> 💬 **Claude에게**: 「0113을 prod에 적용해줘」 — Claude는 적용 뒤 prod와 dev의 함수·정책·권한을 비교해 같은지 확인한다.

**직접 하기** — [§5 직접 하기](#5-db-바꾸기마이그레이션)의 2·3번을 **prod 프로젝트(baselineplay-prod)**에서 한다. 프로젝트 이름을 **두 번 확인**한다. 4번(history 저장)은 하지 않는다(history는 dev 기록의 사본).

### 6.4 `main`에 합치고 올리기 — 두 방법 중 하나

**방법 A — GitHub 웹(초보자 권장, 화면으로 확인하며)**
1. github.com/pangnima/ttd → **Pull requests** → **New pull request**
2. 위쪽 두 칸을 **base: `main`** ← **compare: `dev`** 로 맞춘다(방향 주의).
3. 바뀐 파일 목록을 훑어보고 **Create pull request** → 제목 예: 「릴리스 2026-12-01」
4. **Merge pull request** → **Confirm merge**
5. ⚠ 그 뒤 나오는 **[Delete branch] 버튼은 누르지 않는다** — `dev`는 계속 쓰는 브랜치다.
6. 내 PC를 최신으로:
   ```bash
   git checkout dev
   git pull
   ```

**방법 B — 명령어**

Windows (PowerShell) — 한 줄씩:
```powershell
git checkout main
git pull
git merge dev
git push origin main
git checkout dev
```
Mac (터미널):
```bash
git checkout main && git pull && git merge dev && git push origin main && git checkout dev
```
> 마지막 `git checkout dev`를 잊지 않는다. `main`에 남아 있다가 거기서 작업하면 사고가 난다.

### 6.5 Vercel에서 배포 지켜보기

1. Vercel → `baselineplay` → **Deployments**. 맨 위에 Branch `main` · **Production** 줄이 생긴다.
2. `Building`(1~2분) → **`Ready`** 가 되면 실서비스가 바뀐 것이다.
3. `Error`면 그 줄 → **Build Logs**에서 빨간 줄을 찾는다(대개 환경변수 누락 — §8). 이때 실서비스는 **이전 버전 그대로** 떠 있으니 서두르지 않아도 된다.

### 6.6 실서비스 확인

https://baselineplay.vercel.app 에서:
- [ ] 첫 화면이 뜬다(500·흰 화면이 아니다)
- [ ] [Google로 계속하기] 로그인 → 홈
- [ ] 매칭 목록·경기 결과·통계가 열린다
- [ ] 이번에 바꾼 기능을 한 번 눌러 본다(실데이터가 생기면 끝나고 앱 화면에서 지운다)

### 6.7 문제가 생기면 — 되돌리기

**앱 되돌리기(Instant Rollback)** — Vercel → Deployments → **이전 Production 줄**의 `⋯` → **Instant Rollback**. 몇 초 만에 예전 버전으로 돌아간다(다시 빌드하지 않음).
- ⚠ 무료(Hobby) 플랜은 **바로 직전** Production으로만 되돌릴 수 있다.
- ⚠ 되돌린 뒤에는 `main`에 push해도 **자동으로 실서비스에 반영되지 않는다.** 고친 뒤에는 프로젝트 첫 화면의 Production 카드에서 **Undo Rollback**을 누르거나, 새 배포 줄의 `⋯` → **Promote to Production**을 해야 다시 자동이 된다.
- ⚠ **DB는 되돌아가지 않는다.** 앱만 옛것이 된다. 그래서 6.2의 순서가 중요하다(DB를 「더하기만」 했다면 옛 앱도 그대로 돈다).

**환경변수 문제였다면** — 고치고 해당 배포 줄 `⋯` → **Redeploy**(§7.1 참고).

### 6.8 기록 남기기

> 💬 Claude에게: 「릴리스 끝났어. ROADMAP·CLAUDE.md 릴리스 상태 갱신해서 dev에 커밋해줘」

---

## 7. 대시보드 설정 기록

한 번 해 두면 끝나는 설정들의 **현재 값**이다. 새로 만들거나, 도메인을 바꾸거나, 「뭔가 사라졌다」 싶을 때 이 표와 대조한다.

### 7.1 Vercel — 프로젝트 `baselineplay`

**Settings → Environment Variables.** 변수 하나에 환경(Production / Preview / Development)을 체크해 저장한다. **같은 이름을 환경별로 따로 두 번 만든다**(값이 다르니까).

| 변수 | Production (= prod 값) | Preview (= dev 값) | Development |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ prod URL | ✅ dev URL | 체크 안 해도 됨(로컬은 `.env.local`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ prod publishable | ✅ dev publishable | 〃 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ prod 키 | ✅ dev 키 | 〃 |
| `NEXT_PUBLIC_SITE_URL` | ✅ `https://baselineplay.vercel.app` | 비움 | — |
| `CRON_SECRET` | (선택) | — | — |

> ⚠ **환경변수를 추가·수정·삭제해도 이미 떠 있는 배포는 바뀌지 않는다.** Deployments → 해당 환경의 최신 줄 `⋯` → **Redeploy**해야 반영된다. 특히 `NEXT_PUBLIC_…`는 빌드 때 코드에 박히므로 반드시 다시 빌드해야 한다.

그 밖에:
- **Production 브랜치 = `main`** (Settings → **Environments → Production**의 Branch Tracking, 예전 화면에서는 Settings → Git). 다른 브랜치(`dev`) push는 Preview가 된다.
- **Cron**(코드 `vercel.json`): 매일 `/api/keepalive`를 불러 prod DB가 7일 무활동으로 멈추지 않게 한다. Vercel → 프로젝트 → Settings → **Cron Jobs**에서 실행 기록을 볼 수 있다.

### 7.2 Supabase — 두 프로젝트 각각

| 설정 위치 | dev (TennisClubs) | prod (baselineplay-prod) |
|---|---|---|
| Authentication → **URL Configuration → Site URL** | 로컬 개발용 주소 | `https://baselineplay.vercel.app` |
| Authentication → URL Configuration → **Redirect URLs** | `http://localhost:3000/**` | `https://baselineplay.vercel.app/**` |
| Authentication → **Sign In / Providers → Google** | 켬 · Client ID/Secret(아래 Google 클라이언트) | 켬 · 같은 Client ID/Secret |
| Authentication → Providers → **Email** | Confirm email 끔 · 최소 비밀번호 8 | 같음 |

> Redirect URLs는 「로그인이 끝난 뒤 **우리 앱**으로 돌아올 주소」의 허용 목록이다. 여기에 없는 주소로는 조용히 Site URL로 보내 버린다(에러가 안 나서 엉뚱한 404로 보인다 — §8).

### 7.3 Google Cloud Console — OAuth 클라이언트

**APIs & Services → Credentials → OAuth 2.0 클라이언트(웹 애플리케이션)**

| 칸 | 값 |
|---|---|
| 승인된 리디렉션 URI | `https://xiwwbgltkbvxdzxxxoba.supabase.co/auth/v1/callback` (dev) · `https://rjuhydxaoizgfiatyfpo.supabase.co/auth/v1/callback` (prod) |
| 승인된 JavaScript 원본 | `http://localhost:3000` · `https://baselineplay.vercel.app` (참고용 — 이 흐름에서는 검사되지 않는다) |

> 헷갈리는 점: Google에는 **Supabase 주소**를, Supabase에는 **우리 앱 주소**를 넣는다. 반대로 넣으면 `redirect_uri_mismatch`.
> **OAuth consent screen**이 「테스트」 상태면 테스트 사용자로 등록한 계정만 로그인된다. 실사용자를 받으려면 「프로덕션으로 게시」(개인정보처리방침·약관 링크 필요 — `/privacy`, `/terms`). 자세한 배경은 `docs/social-login.md`.

### 7.4 도메인을 새로 사서 붙일 때

바꿀 곳이 다섯이다: Vercel → Settings → **Domains**에 추가 → Vercel Production `NEXT_PUBLIC_SITE_URL` → Supabase prod **Site URL·Redirect URLs** → Google 「JavaScript 원본」 → 코드 `src/lib/site-url.ts`의 `DEFAULT_SITE_URL`. 그리고 Redeploy.

---

## 8. 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 실서비스 모든 페이지 500, 응답에 `MIDDLEWARE_INVOCATION_FAILED` | Vercel Production에 `NEXT_PUBLIC_SUPABASE_URL`·`_ANON_KEY`가 없다 | §7.1대로 넣고 **Redeploy**. 급하면 먼저 Instant Rollback(§6.7) |
| 환경변수를 바꿨는데 그대로다 | 이미 떠 있는 배포는 안 바뀐다 | 해당 환경 최신 배포 `⋯` → Redeploy |
| 로컬은 되는데 Vercel 빌드만 `Error` | ① 환경변수 누락 ② 로컬에서 `npm run build`를 안 돌렸다 ③ 대소문자만 다른 파일 이름(Windows는 구분 안 함, Vercel은 구분함) | Build Logs의 빨간 줄 확인 → ①은 §7.1, ②는 §3.8, ③은 파일 이름 맞추기 |
| `git push` 때 `Authentication failed` / `Invalid username or token` | GitHub 로그인이 만료됐다 | 한 번 더 push(브라우저 로그인 창이 뜬다). 안 되면 Windows: 「자격 증명 관리자」 → Windows 자격 증명 → `git:https://github.com` 삭제 후 다시 push |
| `git push`가 `rejected (fetch first)` | GitHub에 내 PC에 없는 커밋이 있다(다른 PC에서 올림) | `git pull` 후 다시 push |
| 실수로 `main`에서 커밋했다(**push 전**) | — | 멈추고 Claude에게 「main에 실수로 커밋했어, dev로 옮겨줘」. 직접이면(커밋이 **하나**일 때) 차례로: `git checkout dev` → `git cherry-pick main`(그 커밋을 dev에 복사) → `git checkout main` → `git reset --hard origin/main`(main을 GitHub 상태로) → `git checkout dev`. 이미 push했다면 손대지 말고 Claude에게 |
| 구글 로그인 뒤 `redirect_uri_mismatch` | Google 콘솔의 리디렉션 URI가 Supabase 주소와 다르다 | §7.3 표와 대조 |
| 구글 로그인 뒤 Vercel `404 DEPLOYMENT_NOT_FOUND` 또는 엉뚱한 곳 | Supabase Redirect URLs에 우리 주소가 없어 Site URL(옛 주소)로 갔다 | §7.2 Site URL·Redirect URLs 확인 |
| Supabase 대시보드에 「Project paused」, 로그인이 안 됨 | 무료 플랜은 **7일 무활동이면 정지**된다(prod는 매일 cron이 막는다, dev는 안 막힘) | 대시보드에서 **Restore project**(몇 분) |
| `npm run dev` 때 `Port 3000 is in use` | 다른 창에서 이미 켜져 있다 | 그 창에서 `Ctrl + C`. 못 찾으면 PC 재시작 |
| `npm install`에서 빨간 `ERR!` / `Unsupported engine` | Node 버전이 너무 낮거나 설치가 꼬였다 | `node -v` 확인 → §3.2 LTS 재설치 → `node_modules` 폴더 삭제 후 `npm install` |
| 로컬 화면에 「NEXT_PUBLIC_SUPABASE_URL이(가) 설정되어 있지 않습니다」 | `.env.local`이 없거나 이름이 틀렸다 | §3.6. 파일 이름이 `.env.local.txt`가 되지 않았는지(Windows 메모장 주의) |
| 랭킹·레이팅이 기록해도 안 바뀐다 | `SUPABASE_SERVICE_ROLE_KEY`가 없다(또는 폐지된 Legacy 키) | §2 — 해당 환경에 넣고 Redeploy. Legacy 폐지 뒤에는 `sb_secret_…`로 교체 |
| `claude` 명령을 못 찾는다 | 설치 뒤 창을 새로 열지 않았다 | PowerShell·터미널을 닫고 다시 연다. 그래도 안 되면 `claude doctor` |

---

## 9. 용어집

| 용어 | 한 줄 뜻 |
|---|---|
| 저장소(repository) | 코드와 그 변경 기록 전체. GitHub의 `pangnima/ttd` |
| 브랜치(branch) | 같은 저장소 안의 갈래. `dev` = 작업용, `main` = 실서비스용 |
| 커밋(commit) | 변경을 한 묶음으로 기록한 것(저장 시점) |
| push / pull | 내 PC → GitHub로 올리기 / GitHub → 내 PC로 받기 |
| merge | 한 브랜치의 커밋을 다른 브랜치에 합치기(`dev` → `main`) |
| Pull Request(PR) | GitHub 웹에서 「이 브랜치를 저기에 합쳐도 될까」를 화면으로 보여 주고 합치는 기능 |
| 빌드(build) | 코드를 실제로 돌릴 수 있는 결과물로 바꾸는 과정(`npm run build`) |
| 배포(deploy) | 빌드 결과를 인터넷에 올리는 것. Vercel이 push를 보고 자동으로 한다 |
| Preview / Production | Vercel의 미리보기 배포(`dev`, dev DB) / 실서비스 배포(`main`, prod DB) |
| 환경변수 | 코드 밖에서 넣어 주는 설정값. 환경마다 다른 값을 넣는다 |
| `NEXT_PUBLIC_` | 「브라우저까지 가도 되는 공개 값」 이름표. 빌드 때 코드에 박힌다 |
| 마이그레이션 | DB 구조를 바꾸는 SQL 파일과 그 적용 |
| RLS | DB 행 단위 권한 규칙 — 공개 키로 접속해도 「내 것만 보이게」 막는 장치 |
| MCP | Claude가 외부 도구(Supabase·브라우저 등)를 쓰게 해 주는 연결 |
| Instant Rollback | Vercel에서 실서비스를 직전 배포로 즉시 되돌리기(DB는 그대로) |

---

관련 문서: 프로젝트 규칙 전체는 `CLAUDE.md`, 할 일은 `ROADMAP.md`, 구글 로그인 배경은 `docs/social-login.md`, 테스트 계정·E2E 절차는 `docs/e2e/README.md`, Week 72 릴리스 실제 기록은 `docs/history/week-72-rebuild.md`.
