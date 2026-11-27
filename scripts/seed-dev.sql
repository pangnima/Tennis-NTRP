-- dev 시드 — 매칭 12개 · 직접 기록 38게임 · 수정 기록 몇 줄. **dev(테스트) DB 전용**이다(prod에 돌리지 않는다).
--
-- 쓰는 법: 먼저 비운다 →
--   delete from public.notifications; delete from public.game_edits; delete from public.games; delete from public.matches;
--   update public.users set personal_ntrp = null;
-- 그다음 이 파일을 통째로 실행하고(Supabase SQL Editor 또는 MCP execute_sql), `npm run db:backfill-personal-ntrp`로 레이팅 캐시를 채운다.
--
-- 테이블에 직접 넣지 않고 **RPC를 회원 권한으로 부른다**(request.jwt.claims) — 화면과 같은 검증을 통과한 데이터만 들어간다.
-- 남자01(aaa@aaa.com) · 여자01(aaaa@aaaa.com) · 관리자 · 실명 계정은 어떤 매칭·게임에도 넣지 않는다(빈 상태 유지).
-- 날짜는 실행한 날 기준(current_date ± n)이라 언제 돌려도 「지난 매칭 / 다가오는 매칭」이 섞여 나온다.
-- 지난 지 7일 넘은 매칭·8일 넘은 직접 기록은 30분 안에 예약 작업(match_jobs)이 확정·잠금한다 — 그것도 견본이다.

create or replace function pg_temp.uid(p_name text) returns uuid language sql stable as $$
    select id from public.users where name = p_name and deleted_at is null and role = 'member' and name ~ '^(남자|여자)[0-9]{2}$' limit 1;
$$;

-- 그 회원으로 행동한다
create or replace function pg_temp.act(p_name text) returns void language plpgsql as $$
begin
    perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.uid(p_name), 'role', 'authenticated')::text, true);
end;
$$;

-- 자리 하나 — 회원 이름이면 회원, 아니면 비회원(NTRP 3.0 · 오른손)
create or replace function pg_temp.pl(p_team integer, p_slot integer, p_who text) returns jsonb language sql stable as $$
    select case when pg_temp.uid(p_who) is not null
        then jsonb_build_object('team', p_team, 'slot', p_slot, 'userId', pg_temp.uid(p_who))
        else jsonb_build_object('team', p_team, 'slot', p_slot, 'name', p_who, 'ntrp', 3.0, 'hand', 'right') end;
$$;

-- 단식 한 게임 / 복식 한 게임(둘째 자리 = 백) / 예정 게임(스코어 없음)
create or replace function pg_temp.s(a text, b text, t1 integer, t2 integer) returns jsonb language sql stable as $$
    select jsonb_build_object('players', jsonb_build_array(pg_temp.pl(1, 1, a), pg_temp.pl(2, 1, b)),
                              'sets', jsonb_build_array(jsonb_build_object('t1', t1, 't2', t2)));
$$;
create or replace function pg_temp.d(a1 text, a2 text, b1 text, b2 text, t1 integer, t2 integer) returns jsonb language sql stable as $$
    select jsonb_build_object(
        'players', jsonb_build_array(pg_temp.pl(1, 1, a1), pg_temp.pl(1, 2, a2), pg_temp.pl(2, 1, b1), pg_temp.pl(2, 2, b2)),
        'sets', case when t1 is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('t1', t1, 't2', t2, 't1Ad', 2, 't2Ad', 2)) end);
$$;

-- 매칭 만들기 — 호스트로 만들고 members를 초대(즉시 참가)한다
create or replace function pg_temp.mk(
    p_host text, p_title text, p_type text, p_day integer, p_time time, p_minutes integer, p_surface text, p_court text, p_no text,
    p_fee integer, p_capacity integer, p_listed boolean, p_members text[], p_notes text default null
) returns uuid language plpgsql as $$
begin
    perform pg_temp.act(p_host);
    return public.create_match(p_title, p_type, current_date + p_day, p_time, p_minutes, p_surface, p_court, p_notes, p_listed,
        array(select pg_temp.uid(n) from unnest(p_members) n), case when p_listed then null else '1234' end, p_no, p_fee, p_capacity);
end;
$$;

-- 직접 기록 — 기록자로 게임 여러 줄을 한 번에
create or replace function pg_temp.rec(
    p_by text, p_type text, p_day integer, p_time time, p_minutes integer, p_surface text, p_court text, p_no text, p_games jsonb, p_notes text default null
) returns jsonb language plpgsql as $$
begin
    perform pg_temp.act(p_by);
    return public.record_game(p_type, current_date + p_day, p_time, p_minutes, p_surface, p_court, p_no, p_notes, p_games);
end;
$$;

do $seed$
declare
    m uuid;
    v jsonb;
    g jsonb;
begin
    if pg_temp.uid('남자10') is null then raise exception 'seed: 테스트 계정이 없다 — dev DB가 아니다'; end if;
    if exists (select 1 from public.games) or exists (select 1 from public.matches) then
        raise exception 'seed: 먼저 비운다(파일 머리의 delete 문)';
    end if;

    -- ═══ 지난 매칭 — 게임이 있다 ═══════════════════════════════════════════════
    -- M1 그저께 남복 4명 · 4게임(파트너를 바꿔 가며) + 수정 기록(스코어 수정 1 · 삭제 1)
    m := pg_temp.mk('남자10', '목요 저녁 남복 — 게임 돌려 가며 쳐요', 'men_doubles', -2, '20:00', 120, 'hard', '양재 시민의숲', '3', 40000, 4, true,
                    array['남자02', '남자03', '남자04'], '주차 가능 · 공은 호스트가 가져갑니다');
    v := public.save_match_games(m, jsonb_build_array(
        pg_temp.d('남자10', '남자02', '남자03', '남자04', 6, 4), pg_temp.d('남자10', '남자03', '남자02', '남자04', 6, 3),
        pg_temp.d('남자10', '남자04', '남자02', '남자03', 4, 6), pg_temp.d('남자10', '남자02', '남자03', '남자04', 7, 5),
        pg_temp.d('남자02', '남자03', '남자04', '남자10', 6, 1)));
    perform pg_temp.act('남자02');   -- 2게임 스코어를 고친다(6:3 → 6:2)
    perform public.save_match_games(m, jsonb_build_array(
        pg_temp.d('남자10', '남자03', '남자02', '남자04', 6, 2) || jsonb_build_object('id', v->'rows'->1->>'id', 'version', v->'rows'->1->>'version')));
    perform pg_temp.act('남자03');   -- 잘못 들어간 5번째 게임을 지운다
    perform public.save_match_games(m, '[]'::jsonb, array[(v->'rows'->4->>'id')::uuid]);

    -- M2 닷새 전 혼복 6명 · 5게임
    m := pg_temp.mk('여자05', '주말 혼복 로테이션 (NTRP 3.0 이상)', 'mixed_doubles', -5, '10:00', 180, 'hard', '올림픽공원', '1', 60000, 6, true,
                    array['남자10', '남자06', '여자07', '남자09', '여자09']);
    perform public.save_match_games(m, jsonb_build_array(
        pg_temp.d('남자10', '여자05', '남자06', '여자07', 6, 2), pg_temp.d('남자09', '여자09', '남자10', '여자07', 5, 7),
        pg_temp.d('남자06', '여자05', '남자09', '여자09', 6, 4), pg_temp.d('남자10', '여자09', '남자06', '여자05', 3, 6),
        pg_temp.d('남자09', '여자07', '남자10', '여자05', 4, 6)));

    -- M3 아흐레 전 단식 3명(비공개) · 3게임 — 곧 자동 확정된다
    m := pg_temp.mk('남자13', '평일 저녁 단식 돌리기', 'singles', -9, '19:00', 120, 'hard', '목동 실내코트', null, null, 3, false, array['남자10', '남자12']);
    perform public.save_match_games(m, jsonb_build_array(
        pg_temp.s('남자13', '남자10', 6, 3), pg_temp.s('남자10', '남자12', 6, 4), pg_temp.s('남자13', '남자12', 7, 6)));

    -- M4 어제 여복 4명(무료 코트) · 3게임
    m := pg_temp.mk('여자04', '여복 가볍게 3게임', 'women_doubles', -1, '09:00', 90, 'clay', '장충 테니스장', '2', 0, 4, true, array['여자06', '여자10', '여자11']);
    perform public.save_match_games(m, jsonb_build_array(
        pg_temp.d('여자04', '여자06', '여자10', '여자11', 6, 2), pg_temp.d('여자04', '여자10', '여자06', '여자11', 3, 6),
        pg_temp.d('여자04', '여자11', '여자06', '여자10', 6, 5)));

    -- M5 12일 전 남복 6명(비회원 포함) · 6게임 → 호스트가 최종 확정
    m := pg_temp.mk('남자02', '남복 6명 풀리그', 'men_doubles', -12, '14:00', 180, 'grass', '반포 종합운동장', '2', 30000, 8, true,
                    array['남자10', '남자03', '남자05', '남자08', '남자11']);
    perform public.save_match_games(m, jsonb_build_array(
        pg_temp.d('남자02', '남자10', '남자03', '남자05', 6, 3), pg_temp.d('남자08', '남자11', '남자02', '남자03', 2, 6),
        pg_temp.d('남자10', '남자05', '남자08', '남자11', 6, 4), pg_temp.d('남자02', '김민수', '남자10', '남자08', 5, 7),
        pg_temp.d('남자03', '남자11', '남자05', '김민수', 6, 1), pg_temp.d('남자10', '남자03', '남자02', '남자11', 4, 6)));
    -- 게임에 나온 비회원은 명단에도 선다(0108 — 정원에 포함, 7/8명)
    perform public.add_match_guest(m, '김민수', 3.0, 'male', 'right');
    perform public.set_match_confirmed(m, true);

    -- ═══ 다가오는 매칭 ═══════════════════════════════════════════════════════
    -- M6 내일 아침 남복 — 2/4명, 신청 대기 2명
    m := pg_temp.mk('남자10', '내일 아침 남복 2명 구합니다', 'men_doubles', 1, '07:00', 120, 'hard', '올공', null, 20000, 4, true, array['남자05']);
    perform pg_temp.act('남자07'); perform public.apply_match(m);
    perform pg_temp.act('남자08'); perform public.apply_match(m);

    -- M7 모레 혼복(비공개, 정원 4 꽉 참, 비용 미정, 긴 제목) + 예정 대진 2게임
    m := pg_temp.mk('남자10', '토요일 오후 혼복 — 초보 환영, 끝나고 같이 식사해요 (비공개 모임)', 'mixed_doubles', 2, '14:00', 120, 'clay', '양시숲', null, null, 4, false,
                    array['여자05', '남자04', '여자07'], '비밀번호는 단톡방에 있습니다');
    perform public.save_match_games(m, jsonb_build_array(
        pg_temp.d('남자10', '여자05', '남자04', '여자07', null, null), pg_temp.d('남자10', '여자07', '남자04', '여자05', null, null)));

    -- M8 사흘 뒤 단식(정원 2 꽉 참 — 남자10 참가 중)
    perform pg_temp.mk('남자19', '단식 한 판 하실 분', 'singles', 3, '07:00', 60, 'hard', '서남물재생센터', '5', 15000, 2, true, array['남자10']);

    -- M9 나흘 뒤 여복 — 호스트가 모집 마감
    m := pg_temp.mk('여자09', '여복 정기 모임', 'women_doubles', 4, '19:00', 120, 'hard', '목동', '4', 40000, 4, true, array['여자12']);
    perform public.set_match_closed(m, true);

    -- M10 닷새 뒤 남복 — 남자10이 신청 중
    m := pg_temp.mk('남자06', '남복 8명 2코트', 'men_doubles', 5, '18:00', 180, 'hard', '올림픽', '3, 4', 50000, 8, true, array['남자07', '남자08']);
    perform pg_temp.act('남자10'); perform public.apply_match(m);

    -- M11 일주일 뒤 혼복(무료) — 누구나 신청할 수 있다. 명단에 비회원 둘(0108): 참가자가 넣은 사람 + 초대 링크로 스스로 등록한 사람 → 5/6명
    m := pg_temp.mk('여자15', '일요일 아침 혼복', 'mixed_doubles', 7, '08:00', 120, 'grass', '서남물', null, 0, 6, true, array['남자14', '여자16']);
    perform pg_temp.act('여자16'); perform public.add_match_guest(m, '박서연', 2.5, 'female', 'right');
    perform set_config('request.jwt.claims', '', true);   -- 비로그인(초대 링크)
    perform public.join_match_as_guest((select invite_token from public.match_secrets where match_id = m), '정하늘', 3.0, 'male', 'left');

    -- M12 내일 남복(비공개) — 남자10은 참가하지 않았다(자물쇠 · 「-/4명」)
    perform pg_temp.mk('남자02', '회사 동호회 연습', 'men_doubles', 1, '20:00', 120, 'grass', '반포 종합운동장', '1', 30000, 4, false, array['남자03']);

    -- ═══ 직접 기록(매칭 없이) ═════════════════════════════════════════════════
    -- R1 어제 단식 — 셋이 번갈아(비회원 포함). 남자10이 뛰지 않은 게임도 함께 적는다 + 스코어 수정 기록
    v := pg_temp.rec('남자10', 'singles', -1, '16:00', 120, 'hard', '목동 실내코트', '2', jsonb_build_array(
        pg_temp.s('남자10', '남자12', 6, 3), pg_temp.s('남자12', '최유진', 4, 6), pg_temp.s('남자10', '최유진', 6, 4)));
    perform pg_temp.act('남자12');
    perform public.update_game((v->'gameIds'->>0)::uuid, '[{"t1": 6, "t2": 4}]'::jsonb, null, current_date - 1, '16:00', 'hard', '목동 실내코트', 120, '2');

    -- R2 사흘 전 남복 — 파트너를 바꿔 가며 4게임
    perform pg_temp.rec('남자10', 'men_doubles', -3, '20:00', 120, 'hard', '양재 시민의숲', '1', jsonb_build_array(
        pg_temp.d('남자10', '남자02', '남자03', '남자04', 6, 2), pg_temp.d('남자10', '남자03', '남자02', '남자04', 5, 7),
        pg_temp.d('남자10', '남자04', '남자02', '남자03', 6, 4), pg_temp.d('남자10', '이준호', '남자02', '남자03', 3, 6)), '서브가 잘 들어간 날');
    -- R3 엿새 전 단식 2게임
    perform pg_temp.rec('남자10', 'singles', -6, '09:00', 90, 'grass', '반포 종합운동장', null, jsonb_build_array(
        pg_temp.s('남자10', '남자18', 6, 4), pg_temp.s('남자10', '남자18', 3, 6)));
    -- R4 보름 전 혼복 2게임 → 기록한 사람이 확정
    v := pg_temp.rec('남자10', 'mixed_doubles', -15, '11:00', 120, 'hard', '올림픽공원', '3', jsonb_build_array(
        pg_temp.d('남자10', '여자17', '남자03', '여자03', 7, 5), pg_temp.d('남자10', '여자03', '남자03', '여자17', 6, 0)));
    perform public.set_game_locked((v->'gameIds'->>0)::uuid, true);
    perform public.set_game_locked((v->'gameIds'->>1)::uuid, true);
    -- R5 20일 전 단식 — 코트명·종료 시각 없이
    perform pg_temp.rec('남자10', 'singles', -20, '21:00', null, 'other', null, null, jsonb_build_array(pg_temp.s('남자10', '여자12', 4, 6)));
    -- R6·R7 지난달
    perform pg_temp.rec('남자10', 'singles', -33, '15:00', 120, 'clay', '장충 테니스장', null, jsonb_build_array(
        pg_temp.s('남자10', '남자17', 6, 2), pg_temp.s('남자10', '남자17', 4, 6), pg_temp.s('남자10', '남자17', 7, 6)));
    perform pg_temp.rec('남자10', 'men_doubles', -40, '20:00', 120, 'clay', '양재 시민의숲', null, jsonb_build_array(
        pg_temp.d('남자08', '남자10', '남자17', '관리인 아저씨', 0, 6), pg_temp.d('남자08', '남자10', '남자17', '관리인 아저씨', 3, 6)));

    -- 다른 계정들
    perform pg_temp.rec('남자02', 'singles', -2, '07:00', 60, 'hard', '양재 시민의숲', '2', jsonb_build_array(
        pg_temp.s('남자02', '남자03', 6, 4), pg_temp.s('남자02', '남자03', 2, 6)));
    perform pg_temp.rec('여자05', 'women_doubles', -4, '19:00', 120, 'hard', '올림픽공원', '2', jsonb_build_array(
        pg_temp.d('여자05', '여자07', '여자09', '여자11', 6, 3), pg_temp.d('여자05', '여자09', '여자07', '여자11', 6, 4),
        pg_temp.d('여자05', '여자11', '여자07', '여자09', 5, 7)));
    perform pg_temp.rec('남자06', 'singles', -8, '18:00', 120, 'hard', '목동 실내코트', '1', jsonb_build_array(
        pg_temp.s('남자06', '남자07', 6, 1), pg_temp.s('남자07', '남자08', 6, 4), pg_temp.s('남자06', '남자08', 7, 5)));
    perform pg_temp.rec('여자04', 'mixed_doubles', -10, '10:00', 120, 'clay', '장충 테니스장', '1', jsonb_build_array(
        pg_temp.d('남자14', '여자04', '남자16', '여자16', 6, 4), pg_temp.d('남자16', '여자04', '남자14', '여자16', 4, 6)));
    perform pg_temp.rec('남자19', 'singles', -18, '08:00', 60, 'hard', '서남물재생센터', null, jsonb_build_array(
        pg_temp.s('남자19', '박코치', 2, 6), pg_temp.s('남자19', '박코치', 4, 6)));
    perform pg_temp.rec('남자13', 'men_doubles', -25, '20:00', 120, 'grass', '반포 종합운동장', '3', jsonb_build_array(
        pg_temp.d('남자13', '남자14', '남자15', '남자16', 6, 2), pg_temp.d('남자13', '남자15', '남자14', '남자16', 6, 4),
        pg_temp.d('남자13', '남자16', '남자14', '남자15', 3, 6), pg_temp.d('남자13', '남자14', '남자15', '남자16', 6, 5)));
    perform pg_temp.rec('여자09', 'singles', -30, '17:00', 90, 'hard', '목동 실내코트', null, jsonb_build_array(
        pg_temp.s('여자09', '여자10', 6, 0), pg_temp.s('여자09', '여자10', 6, 3)));
    perform pg_temp.rec('남자24', 'singles', -7, '13:00', 120, 'hard', '올림픽공원', '4', jsonb_build_array(
        pg_temp.s('남자24', '남자25', 6, 2), pg_temp.s('남자25', '남자26', 6, 7), pg_temp.s('남자24', '남자26', 6, 3)));

    -- 시드가 만든 알림은 지운다(테스트 계정의 종이 가득 차지 않게)
    delete from public.notifications;
end;
$seed$;

select (select count(*) from public.matches) as matches,
       (select count(*) from public.games where match_id is not null) as match_games,
       (select count(*) from public.games where match_id is null) as direct_games,
       (select count(*) from public.game_edits) as edits,
       (select count(*) from public.match_applications) as applications,
       (select count(*) from public.game_players gp join public.users u on u.id = gp.user_id where u.email in ('aaa@aaa.com', 'aaaa@aaaa.com')) as empty_account_games;
