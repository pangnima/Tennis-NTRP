# 테니스 매칭·경기 기록 플랫폼 — CLAUDE.md

> 이 문서는 **현재 규칙과 구조**만 담는다. Week 72 재구축의 배경·달라진 점·남은 일은 `docs/history/week-72-rebuild.md`, 그 이전(Week 1~71)의 규칙과 서사는 `docs/history/claude-md-2026-11-25.md`(재구축 직전 CLAUDE.md 전문)·`…09-16.md`·`…09-08.md`에 있다. 사람용 진입 문서는 `README.md`, **할 일은 `ROADMAP.md`**, 설계 문서는 `docs/`(**design-system** = 화면 규칙 하나 · rating · social-login), **브라우저 E2E는 `docs/e2e/`**(README = 계정·도구 규약 / `rebuild-scenarios.md` = 현행 절차서 / `runs.md` 실행 기록).

## 프로젝트 정의
개인 회원 중심의 테니스 **매칭 + 경기 기록** 서비스. 공개/비공개 매칭이나 매칭 없는 기록으로 회원·비회원 경기를 쌓고, 그 누적으로 통계·강약점·랭킹을 돌려준다. 핵심 기능은 **매칭 · 경기 기록 · 내 정보** 셋. 클럽은 이후(지금은 코드도 DB도 없다).

**설계 원칙(Week 72)**: 간편화가 최우선이다. ① 기록은 **한 장**에서 끝난다(참가자 + 스코어). ② **기다리는 단계가 없다** — 저장 즉시 반영, 틀리면 참가자 누구나 고친다. **예외 하나: 공개 매칭 참가는 호스트 승인**(오너 결정 11-26, 무분별한 입장 방지 — 0099). ③ 상태는 **둘**이다(진행 중/확정됨) — **모집 마감**(0101)은 상태가 아니라 「신청 중」처럼 따로 붙는 모집 여부다. ④ 새 개념·새 상태·새 버튼을 더하기 전에 화면을 먼저 의심한다(설명이 필요해지면 복잡해진 것이다). 오버엔지니어링 금지.

## 환경 (dev / prod 두 프로젝트)
| | dev (테스트 전용) | prod (실사용자 전용) |
|---|---|---|
| Supabase ref | `xiwwbgltkbvxdzxxxoba` (TennisClubs, 서울) | `rjuhydxaoizgfiatyfpo` (baselineplay-prod, 서울) |
| 누가 붙나 | 로컬 `npm run dev`(`.env.local`) · E2E · Vercel **Preview/Development** | Vercel **Production**(baselineplay.vercel.app)만 |
| 계정 | 남자01~·여자01~·관리자 등 테스트 계정 57명(비밀번호 123123, `docs/e2e/README.md`). **남자01(`aaa@aaa.com`)·여자01(`aaaa@aaaa.com`)은 기록 0건의 초기 상태 계정**, 나머지 일부는 시드 기록이 있다(`scripts/seed-dev.sql` — 11-26에 경기·매칭을 전부 지우고 다시 넣었다) | 실사용자만 |
| git 브랜치 | **`dev`** — 평소 작업·커밋은 전부 여기 | **`main`** — 릴리스 전용. `dev`를 merge할 때만 움직인다 |
| MCP | `apply_migration`·`execute_sql` 쓰기 자유 | **읽기 조회 + 마이그레이션 적용만** — `execute_sql`로 데이터를 만들거나 고치지 않는다, E2E·시드 금지 |

**브랜치·릴리스**: 개발은 `dev`에서 커밋·push(Vercel 프리뷰 = dev DB). 릴리스는 ① 마이그레이션을 **prod DB에 먼저** 적용 → ② `git checkout main && git merge dev && git push` → ③ Vercel Production 배포 → ④ `git checkout dev`. `main`에 직접 커밋하지 않는다.
**마이그레이션**: dev 롤백 스모크 → dev 적용 → prod 적용. 재현 정본은 `supabase/history/`(원격 `schema_migrations` 사본) — 적용 뒤 `scripts/db-history.ts export`로 갱신한다. 히스토리 밖에서 `execute_sql`로만 한 DDL·권한 변경은 prod에 재현되지 않는다. Auth 설정(Google provider·Site URL·Redirect URLs)은 두 대시보드에서 각각.
**Week 72 릴리스**: 11-27 완료 — prod에 0096~0112 적용, `main` = `7667afb`. 두 DB의 스키마가 같다. ⚠ Vercel 환경변수는 **Production(prod 값)·Preview(dev 값)를 따로** 둔다: `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY`(공개용 — 빌드 때 코드에 박히므로 바꾸면 재배포) + `SUPABASE_SERVICE_ROLE_KEY`(비밀 — `NEXT_PUBLIC_` 금지, 없으면 레이팅 캐시가 멈춘다). 앞의 둘이 빠지면 미들웨어가 모든 요청에서 죽는다(`MIDDLEWARE_INVOCATION_FAILED` — 11-27에 실제로 겪었다). `docs/history/week-72-rebuild.md` 「릴리스」.

## 기술 스택
Next.js 16 (App Router) · React 19 · TypeScript strict · shadcn/ui(@base-ui/react) + Tailwind v4 · Supabase(Auth + PostgreSQL + Storage) · Vercel · vitest(순수 함수만)

## 폴더 구조
```
src/
├── app/
│   ├── (auth)/                  login · signup · find-id · forgot-password · reset-password
│   ├── auth/confirm · callback  재설정 메일 토큰 / 소셜 로그인 착지
│   ├── onboarding/profile/      소셜 가입자 프로필 완성 — (main) 밖(게이트가 그 레이아웃에 있어 안에 두면 루프)
│   ├── matches/join/[token]/    초대 링크 착지(route handler, **보호 라우트 아님**) — 로그인 회원은 참가시키고 매칭으로, 비로그인은 `/invite/<token>`으로
│   ├── api/keepalive/           Vercel Cron(매일 1회) — prod 무활동 정지 방지
│   ├── (main)/                  로그인 후 셸 + 프로필 완성 게이트
│   │   ├── home/                홈 — 할 일(경기 기록·매칭 만들기) + 다가오는 내 매칭 + 최근 경기 + 숫자 셋
│   │   ├── matches/             목록(전체/내 매칭) · new · [id](상세)
│   │   ├── invite/[token]/      초대받은 매칭(0108) — **비로그인도 열린다**: 요약 · [회원으로 참가]/[비회원으로 참가] · 명단 · 대진(읽기 전용)
│   │   ├── record/              경기 기록(직접 기록) — 한 장: 경기 정보 → 누구와(참가자 여러 명) → 게임(줄마다 대진·스코어)
│   │   ├── games/               경기 결과(묶음 목록 + 수정 기록) · [id]/edit(직접 기록의 게임 하나 — 스코어 수정)
│   │   ├── ranking/             개인 랭킹(전체/단식/복식)
│   │   ├── profile/[userId]     통계(본인/타인) · profile/settings(내 정보)
│   │   ├── me/notifications/    알림 전체 목록
│   │   ├── admin/courts/        코트명 정리(**관리자 전용**, 메뉴 없음 — 관리자가 아니면 404)
│   │   └── guide/ terms/ privacy/  비로그인도 열린다
│   └── page.tsx                 랜딩(정적, 다크)
├── components/
│   ├── ui/                      shadcn 생성물 — 직접 수정 금지
│   ├── common/                  셸(Header·Sidebar·MobileTabBar·MobileNav)·PageHeader·FormActions·**ActionButton**(+`action-button-class.ts` 단계표)·ConfirmButton·**AppDialog**(짧은 입력 팝업)·**chip-class**(칩 모양)·Toaster·**DataList**(표/카드 그릇)·LinkTabs(화면을 가르는 축, 오른쪽 `trailing`)·**LinkSegments**(거르는 축 — 링크 세그먼트 토글)·member-search/
│   ├── record/                  GameForm(직접 기록 폼)·use-game-form(참가자 풀 + 게임 줄)·RecordPoolField(참가자 목록 하나 + 검색 결과 [추가]·[+ 비회원])·RecordGameRows(보드의 `BoardRow`를 그대로, `plain`)
│   ├── games/                   **GameSessionBlock**(묶음: 머리 줄 + 메모 줄 `GameSessionMemo` + 게임 줄 + 수정 기록)·GameRow(게임 한 줄)·GameHistory(아코디언)·GameCardActions·GameEditForm
│   ├── matches/                 MatchCard·MatchForm(+MatchAccessField 공개/비공개·비밀번호)·match-actions(헤더·나가기·내보내기)·MatchApplyButton·MatchApplicationList(호스트의 신청 목록)·MatchPasswordGate·MatchHostTools(초대·링크·비밀번호 변경)·**MatchHeadline**(머리 한 덩어리 — 상세·초대 화면 공용)·MatchMembersSection/MatchMemberRow·**MatchGuestRow**(명단의 비회원 줄)·match-guest-actions([+ 비회원 추가]·[빼기])·**invite/**(초대 화면 — InviteJoinPanel·InviteRoster)·person-cells(이름·성별·NTRP·티어)·**board/**(게임 보드 — 대진표 + 스코어, 포/백, 자동 대진표 패널. `BoardRow` = 표 한 줄 + `BoardRowCard`(좁은 자리의 좌우 배치), 자리·[⇄]는 `BoardSeat`·`BoardSwapButton`)
│   ├── personal-matches/        폼 조각(스코어 줄·애드 토글·경기 정보·코트명 자동완성) — record/·games/·matches/가 쓴다
│   ├── styleguide/              /styleguide의 색 견본·팝업 견본
│   ├── stats/ profile/          통계 카드 한 벌·프로필 헤더·설정 폼
│   ├── admin/                   코트명 정리 — CourtMergeBox(이름 칩 + 공식 명칭 + 합치기)·CourtOfficialRow(이름 바꾸기·별칭 빼기)
│   └── notifications/ auth/ onboarding/ landing/ theme/ legal/
├── lib/
│   ├── games/                   게임 규칙(순수, vitest) — perspective(관점 변환)·input(직접 기록 입력·검증)·permissions·summary·**list(묶음·필터·구분·월 묶기)**·**history(수정 기록 문구)**·**lineup(자동 대진표)**·**board(보드 편집·저장 차이)**·errors·map·defaults / recompute(레이팅 캐시, server-only)
│   ├── matches/                 when.ts — 시간 표기·종료 시각·상태(DB `match_end_at`의 거울) · court.ts(코트명 찾기 규칙) · court-clusters.ts(관리자 화면의 「합칠 만한 묶음」 제안) · **invite.ts**(초대 링크로 읽는 매칭 — `toInviteView`) · invite-landing.ts(로그인·가입 직후의 초대 링크 착지, server-only)
│   ├── actions/                 Server Actions — 쓰기는 전부 여기(games·matches·auth·profile·onboarding·notifications·admin-courts)
│   ├── queries/                 read-only(games·matches·invite·analytics·notifications·users·courts)
│   ├── analytics/ rating/       통계 집계·레이팅 엔진(순수) — 입력은 `PersonalMatch` 관점 모양
│   ├── personal-matches/        analytics가 읽는 관점 타입의 도우미(explode·winner·result-badge·ntrp)
│   ├── design/                  **화면 토큰** — tokens.ts(TYPO·TYPO_SCALE·TEXT_TONES·CARD)·도메인 스타일 맵(match-type-style·surface·outcome·member-badges)·강제 테스트(colors·typography) · feedback/notify.ts(토스트 하나)
│   ├── guide/                   content.ts = 안내 문구 단일 출처 · fixtures.ts = 랜딩 콜라주 더미
│   ├── notifications/           labels.ts = 알림 13종 문구·링크 단일 출처
│   ├── supabase/                env · client · server · middleware · **admin(service_role, server-only)**
│   └── nav-items.ts(메뉴 단일 출처) · stats.ts(승률 winRateOf·PlayerStats) · auth/ profile/ format/ legal/ image/ og/
├── middleware.ts                세션 갱신 + 보호 라우트(POST는 통과)
└── types/                       index.ts(도메인 타입) · supabase.ts(DB 타입)
scripts/                         db-history.ts · backfill-personal-ntrp.ts · e2e-cleanup.sql · **seed-dev.sql**(dev 시드 — 비우고 통째로 실행, RPC로 넣는다)
supabase/                        migrations/(00NN_slug) · history/(재현 정본)
```

## 화면 (사이트맵)
메뉴의 단일 출처는 `lib/nav-items.ts`다. **모바일 하단 탭 다섯** — 홈 · 매칭 · 경기 기록(가운데, 채움) · 통계 · 내 정보. **PC 사이드바는 1뎁스 목록** — 맨 위 [경기 기록] CTA, 그 아래 홈 · 매칭 리스트 · 경기 결과 · 통계 · 랭킹, 구분선 아래 사용 가이드(묶음 제목은 두지 않는다 — 다섯 항목에 갈래를 나누면 읽을 것만 는다). 「내 정보」는 PC 사이드바에 없다(헤더 아바타가 맡는다 — 모바일은 헤더에 아바타가 없어 하단 탭이 맡는다). 라벨은 `NAV_LABEL`만 읽는다(하단 탭은 칸이 좁아 `tabLabel` 「매칭」). **숫자 뱃지는 없다** — 기다릴 차례가 없고, "일어난 일"은 헤더의 종이 맡는다.
```
/                       랜딩 (로그인 상태면 /home)
/login /signup /find-id /forgot-password /reset-password · /auth/confirm · /auth/callback · /onboarding/profile
/home                   로그인 후 착지. [경기 기록][매칭 만들기] · 다가오는 내 매칭 · 최근 경기 · 경기 수/승률/레이팅. 0경기면 안내 1장
/matches                매칭 리스트 — 탭 [전체 / 내 매칭(?tab=mine)]. 큰 묶음 제목 없이 **임박한 일정부터 한 목록**: 열 = 종목·날짜·시간·**제목**(방 제목 + 칩)·경기장·호스트·**1인당**(코트비 ÷ 정원 — 「5,000원」·「미정」·「무료」)·참가(「2/4명」 = 참가/정원, 비공개 참가 전은 「-/4명」). [전체] = **일정이 끝나지 않은 매칭만**(종료 시각 기준 — 끝나면 사라진다, 비공개 매칭도 자물쇠로 보인다, 참가 전엔 인원 「-」), [내 매칭] = 예정(임박순) → 얇은 구분 줄 「지난 매칭」 → 지난 것(최근순). 제목이 남는 폭을 다 갖고 **말줄임 없이** 다 보인다(40자 제한, 길면 칸 안 줄바꿈 — 표 행 한 줄 규칙의 예외). 비공개 = 제목 앞 **자물쇠**, **내가 만든 매칭 = 줄 배경 옅은 민트 + 호스트 칸 이름 민트·굵게**(모든 탭, 표·카드), 칩은 확정됨|모집 마감(호스트 마감 또는 **정원이 참**) · 참가 중([전체]만) · 신청 중. 비밀번호를 넣을 수 있는 비공개 줄은 누르면 **비밀번호 팝업**(페이지 이동 없이, 맞으면 그 매칭으로)
/matches/new            매칭 만들기 — 카드 「매칭 정보」: 종목·날짜·**시작·종료**(종료 = 시작 + 길이 보기, DB는 길이)·표면·**코트명(필수)│코트 번호(선택)**·**코트 비용(선택 — 총액, 비우면 칸 아래 주의 한 줄·막지 않음, 적으면 「1인당 약 N원」)│인원(정원, 기본 단식 2·복식 4 — 종목을 바꾸면 기본값일 때만 따라간다)**·**방 제목**(필수 40자)·메모 / 「누구와」: **공개 범위 [공개 | 비공개]**(비공개면 입장 비밀번호 4~20자 필수) · 회원 초대. 기본 일시는 다음 정각, 이미 시작한 시각이면 일정 줄 아래 주의 한 줄(막지 않는다). 스코어는 받지 않는다
/matches/[id]           매칭 상세 — 머리 한 덩어리: 큰 제목 = 방 제목(없으면 일시)·칩 / 일시·장소·호스트 / **「코트비 40,000원 · 1인당 약 10,000원 · 정원 4명 (2명 참가)」**(비용 없으면 「코트비 미정」, 비공개 참가 전에도 보인다 — 총액은 여기, 목록에는 1인당 금액만) / 「메모」 줄, 오른쪽 위 호스트 버튼(PC는 제목이 길어도 아래로 밀리지 않는다) → (호스트) **참가 신청 목록**([승인][거절] — 정원이 차면 [승인]이 막히고 이유 한 줄) → 참가자 표(사진·이름·**성별** │ 구분 │ NTRP·**티어** │ 주력손 │ 내 줄 [나가기]·호스트에게 남의 줄 [내보내기]. **명단의 비회원**(0108)은 회원 줄 뒤에 같은 열로 — 닉네임 자리에 「OO 추가」/「초대 링크」, 구분 「비회원」, [빼기]는 호스트·넣은 사람. 인원 「3/4명」은 회원 + 비회원) → 표 아래 **[+ 비회원 추가]**(참가자 누구나 — 정원이 찼거나 모집 마감이면 호스트만) → 게임 보드(대진표 + 스코어, 복식은 포/백 자리, 이긴 쪽은 스코어 민트·이름 굵게, **팀은 언제나 좌우**(PC는 한 줄 표 `포 ⇄ 백 │ 6 : 4 │ 포 ⇄ 백`, 모바일 카드는 `팀 1 │ 스코어 │ 팀 2` — 팀 안에서 위 = 포·아래 = 백) — **게임마다 [저장]**, 아래 [모두 저장 (N)]. 게임 0개면 설명만 있는 빈 상태, [자동 대진표]는 처음엔 닫힘(열리면 눌린 모양·▲, 패널에 [닫기]), 비회원은 참가자 칩 끝 [+ 비회원]을 눌러야 입력 줄이 열리고, 넣으면 **명단에 올라간다**(표 아래 [+ 비회원 추가]와 같은 문 — 자동 대진표의 후보는 명단에 있는 사람만). 스코어가 저장된 게임은 글자로 보이고 [수정]을 누르면 같은 자리에서 입력 칸이 열린다, 저장된 예정 게임은 **선수는 글자, 점수 칸만** 열어 둔다(대진을 읽고 점수만 넣는다 — 선수를 바꾸려면 [수정]. 줄의 모드는 셋: 보기/점수/편집, `rowMode`). 매칭 게임은 상세 수정 화면이 없다. **확정된 매칭·비참가자·초대 화면은 읽기 전용 보드** — PC 표가 대칭형이다: `게임 │ 팀 1(오른쪽 정렬, 「남자08 · 여자01」) │ 6 : 4 │ 팀 2`, 스코어가 표의 한가운데(0109 — 편집용 열을 그대로 쓰면 이름이 흩어진다). **내가 든 게임**은 내 이름 민트·굵게(선수가 글자로 보이는 모든 줄 — 고치는 보드의 예정 게임 포함) + 제목 옆 「내 게임 N」. 줄 배경은 칠하지 않는다(전 게임에 뛰면 표 전체가 칠해진다)). 입구: 공개 = 제목 오른쪽 [참가 신청]→「신청 중」/[신청 취소](모집 마감·경기 시작 뒤 「모집 마감」), 비공개 = **비밀번호 카드**(마감 중엔 「모집이 마감된 매칭입니다」)(맞으면 바로 참가, 명단·게임은 참가 전 비공개), 초대 링크 = 바로 참가. 「참가자」 옆 **[모집 마감]/[마감 해제]**·[회원 초대]·[초대 링크 복사](마감 중 숨김)·[비밀번호 변경]은 **호스트만**. 제목 오른쪽 호스트 = **[수정]** + 관리 버튼 하나(스코어 있는 게임 0개 = [매칭 삭제] / 있으면 [최종 확정] / 확정 뒤 [확정 취소])
/matches/[id]/edit      매칭 정보 수정(호스트·확정 전) — 만들기와 같은 폼(방 제목·일시·장소·공개 범위·메모, 초대 없음). 게임이 있으면 종목 잠금, 비공개 유지 시 비밀번호는 바꿀 때만, 공개→비공개면 대기 신청 정리
/matches/join/[token]   초대 링크 — 로그인 회원은 참가 후 상세로. **비로그인은 `/invite/[token]`으로**(0108)
/invite/[token]         초대받은 매칭(0108, **비로그인도 열린다** · noindex · 제목 = 방 제목) — 매칭 상세와 같은 머리(요약·코트비·정원·메모) → 「OO님이 초대한 매칭입니다」 [회원으로 참가](→ `/login?next=`·`/signup?next=` — 로그인·가입을 마치면 바로 참가자, 가입해도 초대가 이어진다) / [비회원으로 참가](이름·NTRP·성별·주력손 → 명단에 「비회원」) → 참가자(**이름·성별·구분만** — 사진·닉네임·NTRP·티어·통계 링크 없음) → 게임 보드(읽기 전용). 모집 마감·정원·확정이면 버튼 대신 한 줄(보기는 된다). 비회원은 스코어를 적지 못하고 참가 취소는 호스트가 [빼기]. **매칭 종료 7일 뒤 닫힌다**(「열 수 없는 초대 링크」). 로그인 상태로 열면 바로 참가시킨다. **등록한 비회원은 기기가 기억한다**(0109, httpOnly 쿠키) — 다시 열면 버튼 대신 「OO님으로 참가 중입니다」 + [참가 취소], 명단의 내 줄과 대진의 내 게임 강조. 기기를 바꿨으면 「이미 참가했나요? 내 이름을 누르세요」의 이름 칩 → 「OO님으로 보고 있습니다」 + [내가 아니에요](강조만 — 이름은 비밀이 아니라 [참가 취소]는 처음 등록한 기기에서만)
/record                 경기 기록 — **매칭 없이 친 경기 전용**, 매칭 만들기와 같은 구성의 한 장: 01 「경기 정보」(종목 → 날짜│시작│종료 → 표면 → 코트명(선택)│코트 번호 → 메모) · 02 「누구와」(**참가자 목록 하나** — 「참가자 N명」에 나·회원(NTRP)·비회원이 같은 모양의 칩으로 서고 ×로 뺀다. 그 아래 「참가자 추가」: 회원 검색 결과의 줄 끝 **[추가]** → 위 목록에 올라가고 그 줄은 「추가됨」 / [+ 비회원]. 넣는 방법은 둘, 들어가는 곳은 하나) · 03 「게임」(**매칭룸 보드와 같은 줄, 팀은 좌우** — `팀 1 │ 6 : 4 │ 팀 2`, 복식은 팀 안에서 위 = 포·아래 = 백, 팀 이름 옆 [⇄]. 줄마다 풀에서 대진을 고르고 스코어, [게임 추가]는 윗줄의 대진을 이어받는다. 스코어 필수·자동 대진표 없음). 맨 아래 [경기 저장] 한 번 — 줄마다 한 게임. 내가 뛴 게임이 하나 이상이면 같은 참가자끼리의 게임(3명이 번갈아 단식의 B vs C)도 함께 적는다. 옛 `?match=<id>`는 매칭 상세로 보낸다(매칭 게임은 게임 보드)
/games                  경기 결과(내가 뛴 게임 전부 — 스코어가 들어간 매칭 게임 + 직접 기록). **한 게임 = 스코어 하나 = 한 줄**, 같은 자리에서 친 게임은 **묶음**(매칭 = 같은 매칭 / 직접 기록 = 같은 날짜·시각·코트·종목): 묶음 머리(「11.26 (목) 20:00~22:00」·경기장·[종목][구분]·**「4명」**(함께 친 인원 — 매칭은 명단, 직접 기록은 그 묶음의 선수)·매칭 제목 링크·「4게임 3승 1패」) → **메모 줄**(매칭 메모 + 게임 메모를 묶음이 한 번만 — 한 줄 말줄임, 누르면 전체. 없으면 줄도 없다. 게임 줄에는 메모를 그리지 않는다) → 게임 줄(n게임 │ 대진 │ 결과 │ 스코어 │ 행동 — PC는 복식 이름 앞에 「포」「백」 이름표, **모바일은 두 줄**: 대진 / 승패·스코어 + 버튼) → 「수정 기록 N」 아코디언. **묶음 하나가 카드 한 장**(PC·모바일 모두 — 묶음 사이 12px, 열 제목 줄 없음), 월은 카드 밖의 이름표(「2026년 11월 26게임 18승 8패」 — 그 달 전체의 내 전적). **처음엔 최근 묶음 10개**, 맨 아래 [이전 경기 더 보기 · 남은 N게임]이 `?n=`을 10씩 늘린다(스크롤 유지, 거르기를 바꾸면 처음부터). 거르기 = **밑줄 탭(구분 ?role=host|guest|direct) + 오른쪽 세그먼트 토글 둘**(?type=singles|doubles · ?result=win|loss — 승패는 게임 단위로 걸러 빈 묶음은 뺀다) · /games/[id]/edit 스코어 수정(**직접 기록 전용**, 스코어 한 줄 + 경기 정보 — 매칭 게임의 [수정]·이 주소는 매칭 화면으로 보낸다)
/ranking                랭킹 — ?kind=singles|doubles, 5경기 이상, 레이팅 순
/styleguide             스타일 가이드(메뉴 없음·noindex) — 글자 단계·버튼 단계·목록 견본을 실제 모양으로. 코드의 상수에서 그린다
/profile/[userId]       통계 — 본인은 탭 [내 통계 / 랭킹], 타인은 공개 요약(비공개면 잠금 카드)
/profile/settings       내 정보(관리자에게만 맨 위 「관리자 — [코트명 정리]」 줄) · /me/notifications 알림 목록 · /guide /terms /privacy
/admin/courts           코트명 정리(**관리자 전용**, 메뉴 없음·noindex — 관리자가 아니면 404) — 「합칠 만한 묶음」(비슷한 이름 자동 제안: 이름 칩을 켜고 끄고 → 공식 명칭 → [합치기], 되돌릴 수 없어 한 번 묻는다) → 「공식 코트」(이름·사용 수·별칭 칩 [빼기]·[이름 바꾸기]) → 「모든 이름」(아직 안 묶인 이름에서 직접 골라 합치기)
```
옛 경로(`/match-rooms/*`·`/me/match-rooms`·`/me/personal-matches/*`·`/me/analytics`·`/tiers`)는 `next.config.ts`가 새 화면으로 리다이렉트한다.

## 데이터 흐름
```
Server Component (read)  → lib/queries/*.ts → createServerClient → PostgreSQL (RLS)
Server Action (mutation) → lib/actions/*.ts → RPC(쓰기는 전부 RPC) → revalidatePath('/', 'layout')
Client Component (read)  → lib/supabase/client.ts — RLS로 보호된 read-only만(회원 검색)
```

## DB 스키마 (0096~0097 재구축 — 테이블 8개 + 코트 2개 + 수정 기록 1개 + 명단 비회원 1개)
| 테이블 | 핵심 규칙 |
|---|---|
| `users` | **email·phone·login_id는 컬럼 권한으로 본인만**(0110 — 남의 것은 API로도 못 읽는다, 본인 것은 `get_my_account()`. 공개 컬럼 목록은 `PUBLIC_USER_COLUMNS`, `select('*')` 금지 — 새 컬럼은 공개라면 `grant select (…)`를 따로). 본인만 UPDATE — **단, 보호 칸은 트리거 `guard_user_protected_columns`가 막는다(0103)**: `role` 변경 불가 · `personal_ntrp`는 서버의 service_role만(탈퇴 익명화로 비우는 것만 허용) · `ntrp`·`login_id`는 비어 있을 때 1회 · `email`은 탈퇴 익명화 때만 · `deleted_at`은 되돌릴 수 없다(0110)(어기면 `protected_column`). 화면(PostgREST)에서 온 UPDATE만 본다. `users_select`는 `authenticated` 전용. 행 생성은 `handle_new_user` 트리거. `login_id`(가입 시 1회 후 불변)·`ntrp`(자가선언, 가입 1회)·`personal_ntrp`(개인 경기 레이팅 **캐시**)·`deleted_at`(soft delete)·`stats_hidden`. 닉네임·아이디 부분 유니크(탈퇴 행 제외) |
| `matches` | 매칭. `host_id`·**`title`**(방 제목 1~40자, 0101 이전 행은 null)·종목·`played_at`·`played_time`·`duration_minutes`(기본 120)·표면·코트명(새 매칭은 필수, 저장할 때 같은 코트의 대표 철자로)·**`court_no`**(코트 번호, 선택 10자, 0102)·**`court_fee`**(코트 비용 총액, 선택, 0104)·**`capacity`**(정원, 호스트 포함 2~50, 0104)·메모·**`is_listed`**(공개)·**`confirmed_at`**(호스트 최종 확정 = 잠금)·**`closed_at`**(모집 마감, 0101). SELECT: **로그인 회원 전원**(0099 — 비공개도 목록에 자물쇠로). 명단·게임은 `can_see_match`(공개 ∨ 참가자) |
| `match_secrets` | `invite_token` · **`password_hash`**(비공개 매칭 비밀번호, bcrypt, null = 없음) — 정책 0개(RPC 전용) |
| `match_applications` | 공개 매칭 **참가 신청**(0099). `(match_id, user_id)` — 행이 있으면 신청 중, 승인하면 `match_members`로 옮겨지고 거절·취소·확정·경기 시작이면 지워진다. SELECT = 본인 ∨ 그 매칭 호스트 |
| `match_members` | `(match_id, user_id, role host/player)`. **행이 있으면 참가 중** — 상태 컬럼 없음, 나가면 행 삭제 |
| `match_guests` | **명단의 비회원**(0108) — `match_id`(cascade)·`name`(1~20자, 매칭 안에서 유일 = 보드의 선수 키 `guest:<이름>`)·`ntrp`(필수)·`gender`·`hand`·`added_by`(null = 초대 링크로 스스로 등록). **정원에 포함**(`match_headcount` = 회원 + 비회원). SELECT = `can_see_match`, 쓰기는 RPC 전용. 게임의 비회원 선수(`game_players`)와 FK로 묶지 않는다 — 명단에서 빼도 게임은 남는다 |
| `games` | **게임 1건 = 1행 = 스코어 하나**(0105 — `sets`는 `[{t1,t2,t1Ad?,t2Ad?}]` **한 개까지**, `games_one_set_check`. Ad = 애드 코트에 선 사람의 slot). `match_id`(null = 매칭 없이 직접 기록)·`created_by`·종목·일시·표면·코트·메모·`duration_minutes`·`court_no`(직접 기록의 길이·코트 번호 — 매칭 게임은 매칭의 값)·`updated_by/at`·`locked_at`(매칭 밖 게임의 잠금)·`created_at`(기본 `clock_timestamp()`, 0106 — 한 번에 저장한 게임들의 순서). **`sets = []`은 매칭 게임만**(대진만 짠 「예정」 게임, 0098 — 직접 기록은 점수 필수). SELECT: 참가자 ∪ 볼 수 있는 매칭의 게임 |
| `game_players` | `(game_id, team 1/2, slot 1/2)` + `user_id`(null = 비회원)·`name`(스냅샷)·`hand`·`ntrp`(스냅샷)·`gender`(**비회원만**, 0107 — 회원은 프로필이 정본이라 null). 단식 2행/복식 4행 |
| `notifications` | 사건 기록. `match_id`(set null)·`game_id`(FK 없음)·`payload`(매칭 스냅샷 + actorName)·`dedupe_key`. 본인 행만 SELECT, 쓰기는 `send_notifications` 전용. 타입 13종 |
| `game_edits` | **수정 기록**(0105) — 스코어가 있던 게임의 스코어·선수 변경(`edit`)과 삭제(`delete`). `game_id`(FK 없음 — 지워진 뒤에도 남는다)·`match_id`(cascade)·`actor_id`·`before`/`after`(스코어 + 선수 스냅샷)·`member_ids`·묶음 찾기용 종목·일시·코트. SELECT = 본인이 `member_ids`에 있거나 그 매칭을 볼 수 있을 때, 쓰기는 RPC 안에서만(`log_game_edit`) |
| `rpc_rate_limits` | anon RPC 시도 제한 카운터(0093) |
| `courts` · `court_aliases` | **공식 코트**(0103, 관리자가 합쳐 만든 정식 명칭 1~40자) · 그 코트를 가리키는 **키 전부**(`key` = `court_key(alias)` PK — 공식 명칭 자신의 키도 한 줄이라 공식끼리 겹칠 수 없다). 정책 0개(읽기·쓰기 모두 RPC) |

**쓰기는 전부 RPC**(테이블에 쓰기 정책이 없다. 신규 RPC는 `revoke execute … from public, anon` + `set search_path = public`):
- 게임: **쓰는 문은 종류마다 하나** — 직접 기록 = **`record_game(…공통 정보, p_games)`**(0105 — `p_games` = `[{players, sets:[하나]}]` 1~12게임, 게임마다 한 줄·게임마다 대진이 다를 수 있다. **기록자가 뛴 게임이 하나 이상**이어야 한다 `not_game_party`), 매칭 게임 = **`save_match_games(match_id, upserts, deletes)`**(게임 보드 저장 — 바뀐 게임만(줄 하나 또는 전부) 한 트랜잭션, 반환 `{memberIds, rows:[{id, version}]}`(0100 — 보드가 저장한 줄의 기준만 바꿔 다른 줄의 입력을 지킨다), 행마다 `version`(=`coalesce(updated_at, created_at)`)이 다르면 `game_conflict`, 종목·일시·장소는 매칭 값, 회원 선수는 매칭 참가자여야 함, 알림은 저장 한 번에 하나 — 스코어가 새로 들어가면 `game_recorded`·스코어 수정/삭제만이면 `game_updated`·대진만 바뀌면 없음). 선수 검증·삽입은 내부 함수 `insert_game_players` 하나를 둘이 쓴다. 기존 게임을 고칠 때 **그 게임에 원래 있던 회원은 매칭을 떠났어도 그대로 둘 수 있다**(0112 — 새로 넣는 회원만 지금 참가자여야 한다). 회원은 userId만 받아 이름·손·NTRP를 DB가 채운다 · `update_game`(상세 수정 — 스코어(정확히 하나)·메모, 매칭 밖은 일시·길이·표면·코트·코트 번호도. 스코어가 바뀌면 수정 기록. 선수 배치는 매칭이면 보드에서, 직접 기록은 지우고 다시) · `delete_game` · `set_game_locked`(매칭 밖 게임, 작성자만). 수정·삭제 자격과 잠금 검사는 `lock_editable_game` 한 곳(참가 회원 ∨ 작성자 ∨ 매칭 호스트 ∨ **그 매칭의 참가자**, 잠겼으면 `game_locked`)
- 매칭: `create_match`(**`p_title` 필수**, 비공개면 `p_password` 필수, 초대한 회원은 **즉시 참가**) · `add_match_members`(**호스트만**) · `join_match(match_id?, token?, password?)` → `{status:'joined'|'wrong_password'}`(토큰 = 바로 참가, 비공개 + 비밀번호 = 맞으면 참가 — 틀려도 raise하지 않아 시도 횟수가 남고 10분 10회 넘으면 `rate_limited`, **공개 매칭은 `use_application`**, 모집 마감이면 `recruitment_closed`, **정원이 차면 `match_full`**(0104 — `apply_match`·승인도 같다. 판정은 내부 `match_is_full` = `match_headcount`(회원 + 명단의 비회원, 0108) ≥ 정원, 호스트의 직접 초대 `add_match_members`만 예외)) · `apply_match`·`cancel_application`(공개·시작 전·마감 아님) · `decide_application(match, user, approve)`(호스트) · `remove_match_member`(호스트, 게임은 남는다) · `set_match_password`(호스트, 비공개만) · `leave_match`(호스트 불가, 게임은 남는다) · `update_match`(호스트 — 제목·일시·장소·**비용·정원**(지금 인원(회원 + 비회원)보다 적으면 `capacity_below_members`)·공개 범위·메모·`p_password`(비공개 유지 시 선택), 게임이 있으면 종목 변경 `match_type_locked`, 공개→비공개면 대기 신청 정리, 매칭 게임의 일시·장소가 따라간다) · **`set_match_closed(match, closed)`**(호스트, 모집 마감/해제 — 마감하면 신청 삭제 + 신청자 알림) · `set_match_confirmed`(호스트, **스코어 있는 게임** 1개 이상 — 확정할 때 예정 게임·신청은 지운다) · `delete_match`(**스코어 있는 게임이 있으면 거절**, 예정 게임은 함께 지운다) · `get_match_invite_token`(**호스트만**)
- 명단의 비회원(0108): **`add_match_guest(match, name, ntrp, gender?, hand?)`**(**참가자 누구나** — 호스트가 아니면 모집 마감 `recruitment_closed`·정원 `match_full`, 같은 이름 `guest_name_taken`, 호스트에게 `match_joined` + `guestName`) · `remove_match_guest(guest_id)`(호스트 ∨ 넣은 사람(아직 참가자) — 아니면 `not_guest_owner`, 게임은 남는다). 검증·삽입은 내부 `insert_match_guest` 하나
- **초대 링크(anon 허용 — 열쇠는 32자 토큰)**(0108): **`get_invited_match(token, guest_id?)`**(`guest_id` = 등록한 기기의 쿠키 값 — 그 매칭의 비회원이면 `meKey`를 싣는다, 0109. 매칭 요약 + 명단(이름·성별·구분) + 대진·스코어 — **user id·사진·닉네임·NTRP는 싣지 않는다**(회원의 `key`는 매칭별 해시), 없는 토큰·**매칭 종료 7일 뒤**는 null) · **`join_match_as_guest(token, name, ntrp, gender?, hand?)`**(비로그인 방문자가 스스로 명단에 등록 — 확정·모집 마감·정원은 `join_match`의 토큰 경로와 같다, 한 매칭에 10분 10명 `rate_limited`, 호스트에게 알림 `viaLink`) · `leave_match_as_guest(token, guest_id)`(0109 — **스스로 등록한 비회원**의 본인 취소, 참가자가 넣은 비회원은 `not_guest_owner`, 호스트에게 `match_left` + `guestName`). anon에게 연 RPC는 가입·로그인과 이 셋뿐이다
- 코트명(0102): **`search_court_names(query, limit)`**(로그인 회원 — 매칭에 쓰인 코트명을 띄어쓰기 무시 키로 묶어 대표 철자·사용 수, 포함·줄임말 `%양%시%숲%`·초성 찾기) · 내부 `canonical_court_name`(같은 키면 가장 많이 쓴 철자 — `create_match`·`update_match`·`record_game`·`update_game`이 저장 전에 거친다, 매칭은 비면 `invalid_court`)
- 코트명 정리(0103, **관리자** — `is_admin()` 아니면 `not_admin`): `admin_court_overview()`(공식에 안 묶인 이름 + 공식 코트·별칭) · **`merge_court_names(official, names[])`**(공식 코트를 찾거나 만들고 이름들을 별칭으로, **매칭·경기의 코트명을 공식 명칭으로 바꾼다** — 다른 공식 코트의 이름이 섞이면 그 코트를 통째로 흡수) · `rename_court`(옛 이름은 별칭으로 남는다, 겹치면 `court_name_taken`) · `remove_court_alias`(앞으로의 맞춤만 멈춤). `canonical_court_name`은 **별칭 → 공식 명칭**을 먼저 보고, `search_court_names`는 `{name, uses, official, via}`로 공식 코트를 먼저(별칭으로도 걸리고 `via` = 걸린 별칭) 돌려준다
- 읽기: `get_user_games(user)`(본인은 언제나, 타인은 통계 비공개·탈퇴가 아니면 — 통계·전적의 재료, **예정 게임은 빼고**) · `get_member_rankings(kind, min_games, limit)`
- 알림: `send_notifications`(행위자·탈퇴자 제외 — 알림을 넣는 유일한 문) · `mark_notifications_read`
- 예약(pg_cron): `match_jobs` */30 → `run_match_jobs()` = 전날 20시 리마인드 + **경기 시작이 지난 매칭의 신청 삭제** + **종료 7일 뒤 자동 확정**(매칭 — 스코어 있는 게임이 있을 때만, 예정 게임은 지운다) + 경기일 +8일 **자동 잠금**(매칭 밖 게임) · `notification_cleanup`(읽은 지 30일)
- 가입·로그인(anon 허용, 시도 제한): `is_nickname_taken`·`is_email_taken`·`is_login_id_taken`·`resolve_login_email`·`find_login_id`

## 도메인 어휘
| 용어 | 규칙 |
|---|---|
| **게임** | **한 게임 = 스코어 하나 = 한 줄**(0105 — 6:4, 3:6으로 두 번 쳤으면 두 줄, 1승 1패). 통계도 게임 하나를 경기 하나로 센다. 코드의 `sets` 배열은 길이 0(예정)·1뿐이다 |
| **묶음** | 경기 결과에서 같은 자리의 게임을 모은 덩어리(`lib/games/list.ts` `sessionKey`) — 매칭 게임 = 같은 매칭, 직접 기록 = 같은 날짜·시각·코트(번호)·종목. 저장되는 개념이 아니라 읽을 때 만든다(같은 시각에 다시 기록하면 같은 묶음에 붙는다). 머리 줄의 일시는 「시작~종료」(직접 기록은 길이를 적었을 때) |
| **수정 기록** | 참가자 누구나 고치고 지울 수 있어 **누가·언제·무엇을** 바꿨는지 남긴다(`game_edits`) — 스코어가 있던 게임의 스코어·선수 변경과 삭제. 예정 대진을 고치거나 처음 스코어를 넣는 것은 「기록」이라 남지 않는다. 묶음 아래 아코디언(`GameHistory`, 문구는 `lib/games/history.ts`) |
| **대진표 / 예정 게임** | 매칭의 게임 보드에서 선수만 배치하고 스코어를 비운 게임 = 「예정」. 저장하면 참가자 모두가 같은 대진을 보고, 전적·통계·경기 결과에는 **스코어가 들어간 게임만** 들어간다. 참가자 누구나 대진·스코어를 고친다. **자동 대진표**(`lib/games/lineup.ts`, 옛 Week 40 알고리즘 이식) = 참가자 체크(+비회원 바로 추가) · 코트 1~4면 · 1인당 게임 수(권장 = 소요 시간 ÷ 30분) → 출전 편차 ≤1·파트너/상대 반복 회피·팀 NTRP 균형·혼복 1남1녀(선호)·같은 라운드 한 사람 한 코트·게임마다 회원 1명 이상, 같은 시드 = 같은 대진. 다시 만들면 **예정 게임만** 바뀐다 |
| **관점** | 게임은 절대 좌표(team/slot)로 **한 번만** 저장되고, "나·파트너·상대"는 읽을 때 만든다 — `lib/games/perspective.ts`의 `toPersonalMatch(game, viewerId)`가 통계가 읽는 `PersonalMatch` 모양으로 바꾼다. 기록 폼과 게임 보드는 절대 좌표(자리 = team/slot) 그대로 받는다(`lib/games/board.ts`) |
| **확정 / 잠금** | 기록은 저장 즉시 반영된다. 잠그는 손은 하나씩 — 매칭은 **호스트의 [최종 확정]**(`confirmed_at`), 매칭 밖 게임은 **기록한 사람의 [확정]**(`locked_at`). 잠기면 수정·삭제·게임 추가·참가가 막히고, 확정한 사람이 [확정 취소]로 푼다. 아무도 안 눌러도 7일 뒤 자동으로 잠긴다. 앱 술어 `canEditGame`·`canLockGame` ↔ DB `lock_editable_game`·`set_game_locked` |
| **매칭 상태** | 둘뿐: `진행 중` / `확정됨`(`lib/matches/when.ts`). 「신청 중」은 매칭 상태가 아니라 한 회원의 신청 여부다 |
| **모집 마감** | 호스트의 [모집 마감](0101, `closed_at`) — 대기 중 신청 자동 취소(알림 `match_declined` + `reason:'closed'`), 새 신청·비밀번호·초대 링크 입장 막음(호스트의 직접 초대는 된다), [마감 해제]로 다시 엶. 매칭 상태가 아니다. 화면에는 경기 시작·확정·**정원이 참**과 함께 「모집 마감」 한 말(`isRecruitmentClosed`) |
| **코트 비용 · 정원** | 0104(`lib/matches/fee.ts`). 비용 = 코트 **총액**(선택) — 화면이 정원으로 나눠 「1인당 약 N원」(100원 올림)을 보여 준다. 안내만 한다(정산·입금 확인 없음). 정원 = 호스트 포함 인원(**회원 + 명단의 비회원**, 0108) — 차면 새 신청·비밀번호·초대 링크·승인·참가자의 비회원 추가가 막히고(저장하는 상태가 아니라 그때그때 센다) 누가 나가거나 정원을 늘리면 다시 열린다. 호스트의 직접 초대와 호스트의 비회원 추가는 정원을 넘겨도 된다 |
| **코트명** | 함께 쌓는 코트 목록(0102) — 운영자가 코트를 등록하지 않는다. 칸의 후보 = 「최근 코트」(내 것) + 「함께 쓰는 코트」(매칭에 쓰인 이름, 매칭 수) + 「새 코트로 쓰기」, 찾기는 띄어쓰기 무시·줄임말(양시숲)·초성(ㅇㅈㅅㅁ)(`lib/matches/court.ts` ↔ DB). 새로 쓰는데 비슷한 이름이 있으면 칸 아래 「비슷한 코트가 있어요 [이걸로]」(막지 않음). 매칭은 필수, 직접 기록은 선택. 코트 번호는 매칭만(`formatCourt` — 숫자면 「3번 코트」). **공식 코트 · 별칭(0103)**: 이름이 갈리면(「올공·올림픽·올림픽공원」) 관리자가 `/admin/courts`에서 정식 명칭 하나로 합친다 — 지난 매칭·경기의 코트명까지 바뀌고, 합친 옛 이름은 별칭이 되어 그 이름으로 적어도 공식 명칭으로 저장된다. 칸의 후보 맨 위 묶음 「공식 코트」(별칭으로 걸리면 「다른 이름: 올공」) |
| **방 제목** | 목록·상세의 이름(`displayMatchTitle` — 없으면 「남복 매칭」). 알림의 매칭 한 줄은 그대로 일시·코트·종목(`matchTitle`) |
| **공개 / 비공개 · 초대** | **공개** = 목록에서 누구나 [참가 신청] → 호스트 [승인]/[거절](둘 다 알림), 신청자는 언제든 취소, 경기 시작이면 신청 마감. **비공개** = 목록에 자물쇠, **비밀번호**(4~20자, bcrypt — 호스트도 다시 볼 수 없고 바꾸기만)를 넣으면 바로 참가, 명단·게임은 참가 전 비공개. **초대**(호스트가 회원을 부르기·초대 링크) = 신청·비밀번호 없이 즉시 참가 — 그래서 초대는 호스트만. 호스트는 참가자를 **[내보내기]**(게임은 남고, 다시 신청·입장할 수 있다 — 차단 목록 없음). **초대 링크는 비로그인에게도 열린다**(0108) — 로그인하지 않은 사람은 `/invite/<token>`에서 매칭을 보고 [회원으로 참가](로그인·가입 후 자동 참가) 또는 [비회원으로 참가]를 고른다. 링크로 보이는 것은 참가자의 이름·성별·구분과 대진·스코어뿐이고 매칭 종료 7일 뒤 닫힌다(재발급은 없다) |
| **비회원** | 계정 없이 이름으로 적는 선수. **매칭에서는 명단에 등록한다**(0108, `match_guests` — 정원에 포함. 참가자 누구나 넣고 호스트·넣은 사람이 뺀다, 초대 링크로 본인이 직접 등록할 수도 있다. 넣는 곳은 명단 하나 — 참가자 표의 [+ 비회원 추가]와 보드의 [+ 비회원]이 같은 문), 직접 기록에서는 그 기록의 참가자로만 존재한다. 계정이 없어 스코어 입력·통계·레이팅이 없고, 나중에 가입해도 기록이 이어지지 않는다. 초대 화면은 **기기로 본인을 알아본다**(0109 — 등록한 기기 = 쿠키의 비회원 id → 강조 + 본인 취소 / 다른 기기 = 명단에서 이름 고르기 → 강조만. `lib/matches/invite.ts` `InviteMe`). 넣을 때 이름·NTRP·**성별**·주력손을 받는다(`GuestAddForm` 하나 — 참가자 표·자동 대진표·초대 화면·경기 기록 공용). 성별은 종목과 상관없이 받되 **남복 = 남 · 여복 = 여로 고정**(`fixedGuestGender` — 화면 규칙, 회원은 막지 않는다), 게임과 함께 저장된다(0107). 게임마다 회원이 한 명은 있어야 한다 |
| **NTRP 3종** | 자가선언 `users.ntrp`(가입 1회, 불변) / 레이팅 = 개인 경기로 오르내리는 값(통계·홈은 매번 계산, **`users.personal_ntrp`는 그 캐시**로 랭킹과 다음 게임의 스냅샷이 읽는다) / `game_players.ntrp` = 기록 시점 스냅샷(상대 강도 — **비회원 상대도 넣을 때 적은 NTRP로 레이팅에 반영된다**, 비회원 본인은 레이팅이 없다). **티어**(아이언~챌린저)는 레이팅을 0.5 폭으로 묶은 이름이라 NTRP와 같은 숫자다 — 참가자 표에서는 NTRP 칸에 붙이고, 개인 레이팅이 없거나 통계 비공개면 그리지 않는다 |
| **레이팅 캐시** | 게임을 기록·수정·삭제하면 액션이 **참가 회원 전원**의 캐시를 다시 계산한다(`lib/games/recompute.ts`). **`SUPABASE_SERVICE_ROLE_KEY`가 꼭 있어야 한다**(0103 — `personal_ntrp`는 회원 세션으로 쓸 수 없게 잠겼다. 키가 없으면 아무것도 갱신되지 않는다). 일괄 보정은 `npm run db:backfill-personal-ntrp` |
| **알림** | "일어난 일" 13종 — 매칭에 추가됨·참가·나감·확정·삭제·내일 매칭 / **참가 신청(호스트)·승인·거절·내보내짐** / 게임 기록·수정·삭제. 독촉 알림은 없다. 비회원이 명단에 오른 것도 「참가」다(`match_joined` + `payload.guestName` — 타입을 늘리지 않는다, 0108). 문구는 `labels.ts`가 type·스냅샷에서 만든다(금지어: 수락·강퇴 — 내보낼 때는 「내보내기」) |
| **아이디 / 이메일** | 로그인 식별자는 아이디(`login_id`), 이메일은 비밀번호 찾기 채널. 비밀번호 8자 + 영문 + 숫자 + 특수(`password-policy.ts`). 메일 재설정은 스위치 off(운영자 문의) |
| **탈퇴 회원** | `deleted_at` soft delete(익명화). 게임에는 스냅샷 이름 + `탈퇴` 배지(`DeletedBadge`), 랭킹 제외 |

## 코딩 규칙
- TypeScript strict, `any` 금지. named export만(Next 규약 파일 제외). 파일 kebab-case, 컴포넌트 PascalCase
- 컴포넌트 100줄 이내(길면 분리), shadcn/ui 우선
- **화면 규칙은 `docs/design-system.md` 하나**(색·크기·글자·버튼·칸·칩·팝업·피드백·목록). 요약:
  - **색은 역할 이름만** — hex는 `globals.css`의 L1 팔레트(`--palette-*`)에만, 컴포넌트는 L2 역할(`primary`·`spot-solid`·`self`·`selected`·`win`…)·L3 도메인(`match-*`·`surface-*`·`tier-*`)만 쓴다. Tailwind 팔레트·`bg-[#hex]`·`dark:` 분기·`cat-N` 금지(`colors.test.ts`). 「내 것」은 `self`, 「고른 것」은 `selected`/`selected-solid` — 지금 값이 `primary`·`spot`과 같아도 바꿔 쓰지 않는다
  - **글자색 두 단계** — 기본(`text-foreground`) = 값, 보조(`text-muted-foreground`) = 값이 아닌 것. 위계는 굵기로, 알파·`opacity`로 흐리지 않는다
  - **크기는 한 표**(`PRESS_HEIGHT`) — 버튼 xs 28 · sm 32(행·카드) · md 36(페이지 헤더) · lg 44(폼·팝업) · xl 56, 칸 lg 44 · md 36, 칩 micro 18 · chip 24 · sm 32(`chipClass`). 한 줄에 버튼 높이 하나
  - **글자는 자리가 단계를 정한다**(`TYPO`·`TYPO_SCALE`) — 페이지 h1 · 섹션 h3 · 카드·팝업 h4 · 표의 행 body2. 한 줄에 크기 하나
  - **팝업은 셋** — 확인 `ConfirmButton` · 짧은 입력 `AppDialog` · 메뉴. 버튼 줄은 주 행동 왼쪽 · 취소 오른쪽(`FormActions`와 같다). 네이티브 `confirm()` 금지
  - **피드백** — 화면이 그대로인 성공은 `notify.success`(토스트), 오류는 그 자리의 한 줄·`Notice`(토스트 금지), 페이지 이동이 따르면 알리지 않는다. 서버 액션은 `ActionResult`
- **회원을 넣는 두 모양**(`components/common/member-search`): **고르기**(체크 토글 + 고른 칩 — 초대처럼 보내기 전에 고르는 일, `MemberMultiPicker`) / **넣기**(줄 끝 [추가] → 「추가됨」, `MemberResultRow`의 `actionLabel` — 명단에 올리는 일, 경기 기록의 참가자). 넣은 사람은 **한 목록**에 같은 모양으로 보인다(넣는 방법이 여럿이어도 들어가는 곳은 하나)
- **성별 표시**: 이름 옆 '남'/'여' 글자 칩(`GenderChip` — micro 칩, 색 없음: 색에는 이미 종목·코트 자리의 뜻이 있다). 개인정보처리방침 2조가 다른 회원에게 보이는 항목으로 적는다. **포/백**: 보드의 복식 팀 칸은 첫 자리 = 포(듀스)·둘째 자리 = 백(애드), [⇄]로 바꾸고 저장하면 세트마다 `t1Ad = t2Ad = 2`
- **모바일 기준**: 입력 화면은 모달이 아니라 **전체 화면 페이지**로, 의미를 `title` 툴팁에 싣지 않는다. input은 16px(iOS 줌 방지). PC는 같은 화면을 넓게 — 본문은 `PageContainer`의 `max-w-7xl`(1280px)로 묶는다
- **목록은 `DataList` 안에 한 줄에 하나**(다단 카드 그리드 금지). 놓인 자리가 넓으면(컨테이너 896px 이상, `@4xl:` container query) **열 제목이 있는 표**, 좁으면 카드로 접힌다 — 화면 폭이 아니라 자리의 폭을 본다. **표의 밀도는 `data-list.tsx` 한 곳**(`ROW_BOX` 행 56px · `ROW_PAD` 좌우 20px · `ROW_GRID` 칸 사이 16px)에서 읽고 행마다 손으로 적지 않는다. 행(`MatchCard`·`GameRow`·`MatchMemberRow`·랭킹 행)은 행마다 독립 grid라 **열 폭은 전부 고정값 또는 fr**(`auto`를 쓰면 행마다 칸이 어긋난다)이고, 열 제목 줄과 같은 열 상수(`MATCH_COLS`·`GAME_COLS`…)를 읽는다. 좁은 표에서 숨는 열은 칸과 열 제목에 **같은 범위 변형**을 건다. 같은 값이 줄마다 반복되면 열이 아니라 **묶음 머리 줄**로 올린다(경기 결과 — 일시·경기장·종목·구분은 `GameSessionBlock`의 머리가 한 번만 말한다). 카드 전용 장식(테두리·행동 줄 위 구분선)은 **`@max-4xl:`로만** 건다("걸었다가 지우는" 쌍 금지). 표의 행은 한 줄(메모는 칸 안에서 말줄임), 행동 칸은 세 칸 grid(확정 │ 수정 │ 삭제)라 버튼 수가 달라도 세로로 맞는다. 긴 목록의 구분은 큰 제목이 아니라 `DataListDivider`(표 안의 얇은 줄 — 「지난 매칭」). **자식이 줄이 아니라 묶음이면 `DataList grouped`**(경기 결과·홈의 최근 경기) — 넓은 자리에서도 한 테두리로 붙이지 않고 묶음마다 카드로 띄우며, 열 제목 줄을 두지 않고(값이 스스로 뜻을 말한다), 묶음들을 가르는 이름표는 카드 밖의 `DataListGroupLabel`(월). 거르기는 주소가 상태인 **밑줄 탭 + 세그먼트 토글**(`LinkTabs`의 `trailing`에 `LinkSegments` — 화면을 가르는 한 축은 탭, 같은 목록을 거르는 축은 토글, 토글의 첫 칸이 축 이름 「종목 전체」)
- 순수 규칙은 `lib/`의 순수 함수 + vitest. 앱 술어는 DB RPC 가드의 거울
- ⚠ 한 이벤트에서 같은 state를 두 번 고칠 수 있는 자리는 **함수형 갱신**(`prev => …`)으로 — 선수 선택 직후 NTRP 채움이 회원 연결을 덮어 지운 버그가 있었다(`game-form-players.tsx`)
- ⚠ **서버 액션의 `redirect()`를 라우트 핸들러 주소로 보내지 않는다** — 클라이언트 내비게이션이라 핸들러의 307을 따라가 화면은 바뀌는데 주소창에는 핸들러 주소가 남는다(새로 그리면 핸들러가 다시 돈다). 로그인·가입 뒤의 초대 링크 착지는 액션이 직접 참가시키고 매칭 주소로 보낸다(`lib/matches/invite-landing.ts`)
- Supabase: 읽기는 Server Component, 쓰기는 Server Action → RPC. `service_role`은 `lib/supabase/admin.ts`로만, 방금 성공한 쓰기의 뒷정리에만. 정책식의 `auth.uid()`는 `(select auth.uid())`. pg_cron 잡은 `cron.unschedule` 선행. RLS/RPC 검증은 롤백 스모크(`set_config('request.jwt.claims', …)`)

## 자주 쓰는 커맨드
```bash
npm run dev · npm run build · npm run lint · npx tsc --noEmit · npx vitest run · npm run db:backfill-personal-ntrp
```

## 절대 하지 말 것
- `any`, default export, `console.log` 커밋, `components/ui/` 직접 수정, 환경변수 하드코딩, `NEXT_PUBLIC_`에 비밀값
- 테이블 직접 INSERT/UPDATE/DELETE(쓰기는 RPC), 게임을 쓰는 문을 늘리기(직접 = `record_game`, 매칭 = `save_match_games` — 선수 검증은 `insert_game_players` 하나), 한 줄에 스코어를 둘 이상 담기(한 게임 = 한 줄)
- **prod**에 `execute_sql`로 데이터 쓰기·E2E·시드. 히스토리 밖 DDL
- 확인·승인·수락처럼 **기다리게 하는 단계**를 더 늘리기(공개 매칭 참가 승인은 오너가 정한 예외), 매칭 상태를 셋 이상으로 늘리기 — 오너가 걷어낸 복잡도다(되살릴 근거가 생기면 먼저 묻는다)

## 작업 완료 후 체크리스트
- [ ] `npx tsc --noEmit` · `npm run lint` · `npm run build` · `npx vitest run`
- [ ] DB 변경 시 롤백 스모크 + `types/supabase.ts` 갱신 + `supabase/history` 갱신
- [ ] 흐름을 건드렸으면 `docs/e2e/rebuild-scenarios.md`의 해당 시나리오를 돌리고 `runs.md`에 한 줄
- [ ] git commit (conventional commits) — **`dev` 브랜치에서**

## 다음 할 일
`ROADMAP.md`가 정본이다(단계 P0~P8 · 오너 결정 · 후보). 지금 맨 앞:
1. **Week 72 릴리스 마무리** — 릴리스는 11-27 완료. 남은 것: 개인정보처리방침 개정 공지(시행 12-04, 문구는 오너 확인) · 빈 `club-logos` 버킷을 dev·prod 대시보드에서 삭제
2. **P4 공통 토대** — 차단·신고, 약관·방침 개정 + 재동의(약관 2·4·5조의 「상대가 확인해야 확정」도 이때), 대화 모델(매칭·1:1·클럽 한 벌)
3. **P5 매칭룸 대화**(대화 화면만 실시간) → P6 1:1 대화 → P7 커뮤니티 → P8 클럽(추후 오픈)
