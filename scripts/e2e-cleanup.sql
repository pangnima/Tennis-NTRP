-- E2E 정리 SQL — 테스트 서버(dev, xiwwbgltkbvxdzxxxoba)에서만 돌린다. prod에서는 절대 실행하지 않는다.
-- 실행: Supabase MCP `execute_sql`에 이 파일 전체를 그대로 보낸다(한 트랜잭션). 마지막 SELECT가 전부 0이어야 한다.
--
-- 태그 규약(docs/e2e/README.md): E2E가 만드는 매칭은 코트명 'E2E-%', 매칭 없는 게임은 메모 'E2E-%' 또는 코트명 'E2E-%',
-- 신규 계정은 이메일 '%@e2e.test'. 게임이 있는 매칭은 delete_match RPC가 막으므로(전적 보호) 여기서 SQL로 지운다.

begin;

create temp table e2e_matches on commit drop as
  select id from public.matches where court_name like 'E2E-%';

-- 게임 먼저(games.match_id FK가 매칭 삭제를 막는다). game_players는 cascade
delete from public.games
 where match_id in (select id from e2e_matches) or notes like 'E2E-%' or court_name like 'E2E-%';
delete from public.notifications where match_id in (select id from e2e_matches);
delete from public.matches where id in (select id from e2e_matches);   -- match_members·match_secrets cascade

-- 신규 가입 계정(탈퇴 시나리오용) — public.users와 auth.users 둘 다
delete from public.notifications where user_id in (select id from public.users where email like '%@e2e.test');
delete from public.users where email like '%@e2e.test';
delete from auth.users where email like '%@e2e.test';

commit;

select
  (select count(*) from public.matches where court_name like 'E2E-%') as matches,
  (select count(*) from public.games where notes like 'E2E-%' or court_name like 'E2E-%') as games,
  (select count(*) from public.users where email like '%@e2e.test') as users;
