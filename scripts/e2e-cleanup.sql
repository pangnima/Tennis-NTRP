-- E2E 정리 SQL — 테스트 서버(dev, xiwwbgltkbvxdzxxxoba)에서만 돌린다. prod에서는 절대 실행하지 않는다.
-- 실행: Supabase MCP `execute_sql`에 이 파일 전체를 그대로 보낸다(한 트랜잭션). 마지막 SELECT가 전부 0이어야 한다.
--
-- 태그 규약(docs/e2e/README.md): E2E가 만드는 매칭은 코트명 'E2E-%', 매칭 없는 게임은 메모 'E2E-%' 또는 코트명 'E2E-%',
-- 신규 계정은 이메일 '%@e2e.test'. 게임이 있는 매칭은 delete_match RPC가 막으므로(전적 보호) 여기서 SQL로 지운다.

begin;

create temp table e2e_matches on commit drop as
  select id from public.matches where court_name like 'E2E-%';

-- 수정 기록(game_edits)은 game_id에 FK가 없어 게임을 지워도 남는다 — 게임보다 먼저, 그리고 코트명 태그로도 지운다.
-- 그래서 매칭 없는 직접 기록도 **코트명**에 `E2E-…` 태그를 단다(메모만 달면 지워진 게임의 기록은 못 찾는다)
delete from public.game_edits
 where game_id in (select id from public.games where match_id in (select id from e2e_matches) or notes like 'E2E-%' or court_name like 'E2E-%')
    or court_name like 'E2E-%';

-- 매칭 없는 게임의 알림(기록·수정)은 match_id가 없어 아래 매칭 기준 삭제에 안 걸린다 — game_id로 먼저
delete from public.notifications
 where game_id in (select id from public.games where notes like 'E2E-%' or court_name like 'E2E-%');

-- 게임 먼저(games.match_id FK가 매칭 삭제를 막는다). game_players는 cascade
delete from public.games
 where match_id in (select id from e2e_matches) or notes like 'E2E-%' or court_name like 'E2E-%';
delete from public.notifications where match_id in (select id from e2e_matches);
delete from public.matches where id in (select id from e2e_matches);   -- match_members·match_secrets cascade

-- 관리자 코트명 정리(M1j)가 만든 공식 코트 — 별칭은 cascade
delete from public.courts where name like 'E2E-%';

-- 신규 가입 계정(탈퇴 시나리오용) — public.users와 auth.users 둘 다.
-- id는 auth.users의 이메일로 잡는다 — 탈퇴하면 public.users.email이 deleted+<uid>@deleted.local로 바뀌어 거기서는 못 찾는다
create temp table e2e_users on commit drop as
  select id from auth.users where email like '%@e2e.test';
delete from public.notifications where user_id in (select id from e2e_users);
delete from public.users where id in (select id from e2e_users);
delete from auth.users where id in (select id from e2e_users);

commit;

select
  (select count(*) from public.matches where court_name like 'E2E-%') as matches,
  (select count(*) from public.games where notes like 'E2E-%' or court_name like 'E2E-%') as games,
  (select count(*) from public.courts where name like 'E2E-%') as courts,
  (select count(*) from auth.users where email like '%@e2e.test') as users;
