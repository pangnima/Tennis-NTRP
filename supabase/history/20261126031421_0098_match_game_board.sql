-- 0098 매칭 게임 보드 — 매칭 안에서 대진표 + 스코어를 한 장에 입력한다.
--
-- ① 점수 없는 「예정」 게임: 매칭 게임만 sets = [] 허용(직접 기록은 여전히 점수 필수). 통계·랭킹은 세트 단위라 영향 없고,
--    한 회원의 게임 목록(get_user_games)에서는 뺀다. 확정할 때 예정 게임은 지운다.
-- ② 매칭 게임의 유일한 쓰기 문 save_match_games — 바뀐 게임만 한 트랜잭션에, 낙관적 동시성(version), 알림은 저장 한 번에 한 개.
-- ③ record_game은 직접 기록 전용. 선수 검증·삽입은 내부 함수 insert_game_players 하나를 둘이 공유한다.
-- ④ 매칭 게임은 그 매칭 참가자 누구나 고친다(lock_editable_game).

-- ─── 1. 점수 없는 게임 ─────────────────────────────────────────────────────
alter table public.games drop constraint games_sets_check;
alter table public.games add constraint games_sets_check
    check (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) between 0 and 5);
alter table public.games add constraint games_direct_needs_sets
    check (match_id is not null or jsonb_array_length(sets) > 0);

drop function public.normalize_game_sets(jsonb, boolean);
-- 세트 검증 + 정규화. 0~5개(빈 배열은 p_allow_empty일 때만), 0~99 정수, 0-0 금지. 애드 키는 복식만(값 1|2).
create function public.normalize_game_sets(p_sets jsonb, p_doubles boolean, p_allow_empty boolean default false)
returns jsonb
language plpgsql immutable
set search_path = public
as $$
declare
    e jsonb;
    v_out jsonb := '[]'::jsonb;
    v_t1 numeric;
    v_t2 numeric;
begin
    if p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) > 5
       or (jsonb_array_length(p_sets) = 0 and not p_allow_empty) then
        raise exception 'invalid_sets';
    end if;
    for e in select value from jsonb_array_elements(p_sets) loop
        if coalesce(jsonb_typeof(e->'t1'), '') <> 'number' or coalesce(jsonb_typeof(e->'t2'), '') <> 'number' then
            raise exception 'invalid_sets';
        end if;
        v_t1 := (e->>'t1')::numeric;
        v_t2 := (e->>'t2')::numeric;
        if v_t1 <> floor(v_t1) or v_t2 <> floor(v_t2) or v_t1 < 0 or v_t1 > 99 or v_t2 < 0 or v_t2 > 99
           or (v_t1 = 0 and v_t2 = 0) then
            raise exception 'invalid_sets';
        end if;
        if p_doubles and (
               (jsonb_typeof(e->'t1Ad') = 'number' and (e->>'t1Ad') not in ('1', '2'))
            or (jsonb_typeof(e->'t2Ad') = 'number' and (e->>'t2Ad') not in ('1', '2'))
            or coalesce(jsonb_typeof(e->'t1Ad'), 'null') not in ('number', 'null')
            or coalesce(jsonb_typeof(e->'t2Ad'), 'null') not in ('number', 'null')) then
            raise exception 'invalid_sets';
        end if;
        v_out := v_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
            't1', v_t1::int, 't2', v_t2::int,
            't1Ad', case when p_doubles and jsonb_typeof(e->'t1Ad') = 'number' then (e->>'t1Ad')::int end,
            't2Ad', case when p_doubles and jsonb_typeof(e->'t2Ad') = 'number' then (e->>'t2Ad')::int end)));
    end loop;
    return v_out;
end;
$$;
revoke all on function public.normalize_game_sets(jsonb, boolean, boolean) from public, anon, authenticated;

-- ─── 2. 선수 검증 + 삽입 — record_game과 save_match_games가 공유하는 하나 ──────
-- p_players = [{team, slot, userId?, name?, hand?, ntrp?}]. 회원은 userId만(이름·손·NTRP는 DB가 스냅샷).
-- 반환 = 회원 선수 id. 게임 행은 호출자가 먼저 만든다(같은 트랜잭션이라 실패하면 함께 되돌아간다).
create or replace function public.insert_game_players(p_game_id uuid, p_doubles boolean, p_players jsonb)
returns uuid[]
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_expected integer := case when p_doubles then 4 else 2 end;
    v_member_ids uuid[];
    p jsonb;
    v_user public.users;
    v_name text;
begin
    if p_players is null or jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) <> v_expected then
        raise exception 'invalid_players';
    end if;
    if (select count(distinct (e->>'team') || ':' || (e->>'slot')) from jsonb_array_elements(p_players) e
        where (e->>'team') in ('1', '2') and (e->>'slot') in ('1', '2') and (p_doubles or (e->>'slot') = '1')) <> v_expected then
        raise exception 'invalid_players';
    end if;
    if (select count(*) <> count(distinct e->>'userId') from jsonb_array_elements(p_players) e where e->>'userId' is not null) then
        raise exception 'duplicate_player';
    end if;
    v_member_ids := coalesce((select array_agg((e->>'userId')::uuid) from jsonb_array_elements(p_players) e where e->>'userId' is not null), '{}'::uuid[]);
    if cardinality(v_member_ids) = 0 then raise exception 'no_member_player'; end if;

    for p in select value from jsonb_array_elements(p_players) loop
        if p->>'userId' is not null then
            select * into v_user from public.users where id = (p->>'userId')::uuid;
            if not found or v_user.deleted_at is not null or v_user.is_guest then raise exception 'player_not_found'; end if;
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp)
            values (p_game_id, (p->>'team')::int, (p->>'slot')::int, v_user.id, v_user.name, v_user.dominant_hand,
                    coalesce(v_user.personal_ntrp, v_user.ntrp));
        else
            v_name := btrim(coalesce(p->>'name', ''));
            if char_length(v_name) not between 1 and 20 then raise exception 'invalid_player_name'; end if;
            if p->>'ntrp' is not null and (p->>'ntrp')::numeric not between 1 and 7 then raise exception 'invalid_player_ntrp'; end if;
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp)
            values (p_game_id, (p->>'team')::int, (p->>'slot')::int, null, v_name,
                    case when p->>'hand' in ('right', 'left') then p->>'hand' end, (p->>'ntrp')::numeric);
        end if;
    end loop;
    return v_member_ids;
end;
$$;
revoke all on function public.insert_game_players(uuid, boolean, jsonb) from public, anon, authenticated;

-- ─── 3. record_game — 직접 기록 전용 ──────────────────────────────────────────
-- 매칭 게임은 save_match_games 하나로만 쓴다(쓰는 문은 종류마다 하나). 시그니처는 그대로 두고 p_match_id는 거절한다.
create or replace function public.record_game(
    p_match_id uuid,
    p_match_type text,
    p_played_at date,
    p_played_time time,
    p_surface text,
    p_court_name text,
    p_notes text,
    p_players jsonb,
    p_sets jsonb
)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_doubles boolean;
    v_sets jsonb;
    v_game_id uuid;
    v_member_ids uuid[];
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    if p_match_id is not null then raise exception 'use_match_board'; end if;
    if p_match_type is null or p_match_type not in ('singles', 'men_doubles', 'women_doubles', 'mixed_doubles') then
        raise exception 'invalid_match_type';
    end if;
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    v_doubles := p_match_type <> 'singles';
    -- 기록한 사람이 선수여야 한다 — 남의 경기를 대신 적어 그 사람의 전적을 만들 수 없다
    if not exists (select 1 from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) e where e->>'userId' = v_uid::text) then
        raise exception 'not_game_party';
    end if;
    v_sets := public.normalize_game_sets(p_sets, v_doubles);

    insert into public.games (match_id, created_by, match_type, played_at, played_time, surface, court_name, notes, sets)
    values (null, v_uid, p_match_type, p_played_at, p_played_time, p_surface,
            nullif(btrim(p_court_name), ''), nullif(btrim(p_notes), ''), v_sets)
    returning id into v_game_id;
    v_member_ids := public.insert_game_players(v_game_id, v_doubles, p_players);

    perform public.send_notifications(v_member_ids, 'game_recorded', null, v_game_id, v_uid);
    return jsonb_build_object('gameId', v_game_id, 'memberIds', to_jsonb(v_member_ids));
end;
$$;

-- ─── 4. save_match_games — 매칭 게임 보드의 저장 ──────────────────────────────
-- p_upserts = [{id?, version?, players, sets}] — id가 없으면 새 게임, 있으면 version(읽었을 때의 coalesce(updated_at, created_at))이
-- 지금과 같을 때만 선수·세트를 바꾼다(다르면 game_conflict — 다른 참가자가 먼저 고쳤다). p_deletes = 지울 게임 id.
-- 종목·일시·장소는 매칭 값. 회원 선수는 매칭 참가자여야 한다. 알림은 한 번: 점수가 새로 들어간 게임이 있으면 game_recorded,
-- 없고 점수 수정·점수 있던 게임 삭제가 있으면 game_updated, 대진만 바뀌면 보내지 않는다.
-- 반환 {memberIds} = 영향받은 회원(전후 합집합) — 앱이 레이팅 캐시를 다시 계산한다.
create or replace function public.save_match_games(p_match_id uuid, p_upserts jsonb, p_deletes uuid[] default '{}')
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
    v_doubles boolean;
    v_game public.games;
    r jsonb;
    v_id uuid;
    v_sets jsonb;
    v_ids uuid[];
    v_all uuid[] := '{}'::uuid[];
    v_recorded boolean := false;
    v_updated boolean := false;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if not exists (select 1 from public.match_members where match_id = p_match_id and user_id = v_uid) then
        raise exception 'not_match_member';
    end if;
    if p_upserts is null or jsonb_typeof(p_upserts) <> 'array' then raise exception 'invalid_players'; end if;
    v_doubles := v_match.match_type <> 'singles';

    for v_id in select unnest(coalesce(p_deletes, '{}'::uuid[])) loop
        select * into v_game from public.games where id = v_id and match_id = p_match_id for update;
        if not found then raise exception 'game_not_found'; end if;
        v_all := v_all || public.game_member_ids(v_id);
        if jsonb_array_length(v_game.sets) > 0 then v_updated := true; end if;
        delete from public.games where id = v_id;
    end loop;

    for r in select value from jsonb_array_elements(p_upserts) loop
        v_sets := public.normalize_game_sets(coalesce(r->'sets', '[]'::jsonb), v_doubles, true);
        if r->>'id' is null then
            insert into public.games (match_id, created_by, match_type, played_at, played_time, surface, court_name, sets)
            values (p_match_id, v_uid, v_match.match_type, v_match.played_at, v_match.played_time, v_match.surface,
                    v_match.court_name, v_sets)
            returning id into v_id;
            if jsonb_array_length(v_sets) > 0 then v_recorded := true; end if;
        else
            select * into v_game from public.games where id = (r->>'id')::uuid and match_id = p_match_id for update;
            if not found then raise exception 'game_not_found'; end if;
            if r->>'version' is null or coalesce(v_game.updated_at, v_game.created_at) <> (r->>'version')::timestamptz then
                raise exception 'game_conflict';
            end if;
            v_all := v_all || public.game_member_ids(v_game.id);
            if jsonb_array_length(v_game.sets) = 0 and jsonb_array_length(v_sets) > 0 then v_recorded := true;
            elsif v_game.sets is distinct from v_sets then v_updated := true;
            end if;
            update public.games set sets = v_sets, updated_by = v_uid, updated_at = now() where id = v_game.id;
            delete from public.game_players where game_id = v_game.id;
            v_id := v_game.id;
        end if;
        v_ids := public.insert_game_players(v_id, v_doubles, r->'players');
        if exists (select 1 from unnest(v_ids) u
                   where not exists (select 1 from public.match_members mm where mm.match_id = p_match_id and mm.user_id = u)) then
            raise exception 'player_not_member';
        end if;
        v_all := v_all || v_ids;
    end loop;

    if v_recorded or v_updated then
        perform public.send_notifications(
            (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = p_match_id),
            case when v_recorded then 'game_recorded' else 'game_updated' end, p_match_id, null, v_uid);
    end if;
    return jsonb_build_object('memberIds', to_jsonb(array(select distinct unnest(v_all))));
end;
$$;
revoke execute on function public.save_match_games(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_match_games(uuid, jsonb, uuid[]) to authenticated;

-- ─── 5. 고칠 자격 — 매칭 게임은 그 매칭 참가자 누구나 ───────────────────────
create or replace function public.lock_editable_game(p_game_id uuid)
returns public.games
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_game public.games;
    v_match public.matches;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_game from public.games where id = p_game_id for update;
    if not found then raise exception 'game_not_found'; end if;
    if v_game.match_id is not null then
        select * into v_match from public.matches where id = v_game.match_id for update;
    end if;
    if not (v_game.created_by = v_uid
            or v_match.host_id is not distinct from v_uid
            or (v_game.match_id is not null and exists (select 1 from public.match_members where match_id = v_game.match_id and user_id = v_uid))
            or exists (select 1 from public.game_players where game_id = p_game_id and user_id = v_uid)) then
        raise exception 'not_game_party';
    end if;
    if v_game.locked_at is not null or v_match.confirmed_at is not null then raise exception 'game_locked'; end if;
    return v_game;
end;
$$;
revoke all on function public.lock_editable_game(uuid) from public, anon, authenticated;

-- 상세 수정 화면 — 매칭 게임은 점수를 비워 예정으로 되돌릴 수도 있다
create or replace function public.update_game(
    p_game_id uuid,
    p_sets jsonb,
    p_notes text,
    p_played_at date default null,
    p_played_time time default null,
    p_surface text default null,
    p_court_name text default null
)
returns uuid[]
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_game public.games;
    v_member_ids uuid[];
begin
    v_game := public.lock_editable_game(p_game_id);
    update public.games set
        sets = public.normalize_game_sets(p_sets, v_game.match_type <> 'singles', v_game.match_id is not null),
        notes = nullif(btrim(p_notes), ''),
        played_at = case when v_game.match_id is null then coalesce(p_played_at, played_at) else played_at end,
        played_time = case when v_game.match_id is null then p_played_time else played_time end,
        surface = case when v_game.match_id is null then p_surface else surface end,
        court_name = case when v_game.match_id is null then nullif(btrim(p_court_name), '') else court_name end,
        updated_by = v_uid,
        updated_at = now()
    where id = p_game_id;
    v_member_ids := public.game_member_ids(p_game_id);
    perform public.send_notifications(v_member_ids, 'game_updated', v_game.match_id, p_game_id, v_uid);
    return v_member_ids;
end;
$$;

-- ─── 6. 확정·삭제·자동 확정 — "게임 있음"은 점수 있는 게임으로 본다 ──────────
create or replace function public.set_match_confirmed(p_match_id uuid, p_confirmed boolean)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.host_id <> v_uid then raise exception 'not_host'; end if;
    if p_confirmed then
        if v_match.confirmed_at is not null then return; end if;
        if not exists (select 1 from public.games where match_id = p_match_id and jsonb_array_length(sets) > 0) then
            raise exception 'match_empty';
        end if;
        -- 치지 않은 예정 게임은 확정과 함께 사라진다(점수 없는 게임을 잠가 둘 이유가 없다)
        delete from public.games where match_id = p_match_id and jsonb_array_length(sets) = 0;
        update public.matches set confirmed_at = now() where id = p_match_id;
        perform public.send_notifications(
            (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = p_match_id),
            'match_confirmed', p_match_id, null, v_uid);
    else
        update public.matches set confirmed_at = null where id = p_match_id;
    end if;
end;
$$;

-- 점수 있는 게임이 있으면 못 지운다(참가자 전적이 사라진다). 예정 게임은 매칭과 함께 지운다.
create or replace function public.delete_match(p_match_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.host_id <> v_uid then raise exception 'not_host'; end if;
    if exists (select 1 from public.games where match_id = p_match_id and jsonb_array_length(sets) > 0) then
        raise exception 'match_has_games';
    end if;
    perform public.send_notifications(
        (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = p_match_id),
        'match_deleted', p_match_id, null, v_uid);
    delete from public.games where match_id = p_match_id;
    delete from public.matches where id = p_match_id;
end;
$$;

create or replace function public.run_match_jobs()
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    r record;
    v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
    -- 전날 20:00 KST 이후 — 내일 매칭 참가자 전원(멱등 키로 1회)
    if extract(hour from now() at time zone 'Asia/Seoul') >= 20 then
        for r in select m.id from public.matches m where m.played_at = v_today + 1 and m.confirmed_at is null loop
            perform public.send_notifications(
                (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = r.id),
                'match_tomorrow', r.id, null, null, '{}'::jsonb, format('match_tomorrow:%s', r.id));
        end loop;
    end if;

    -- 호스트가 확정을 잊은 매칭 — 종료 7일 뒤 자동 확정(점수 있는 게임이 있을 때만, 예정 게임은 지운다)
    for r in
        select m.id from public.matches m
        where m.confirmed_at is null and public.match_end_at(m) + interval '7 days' <= now()
          and exists (select 1 from public.games g where g.match_id = m.id and jsonb_array_length(g.sets) > 0)
    loop
        delete from public.games where match_id = r.id and jsonb_array_length(sets) = 0;
        update public.matches set confirmed_at = now() where id = r.id;
        perform public.send_notifications(
            (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = r.id),
            'match_confirmed', r.id, null, null, jsonb_build_object('auto', true));
    end loop;

    -- 매칭 밖 게임 — 경기일 다음 날부터 7일 뒤 자동 잠금
    update public.games set locked_at = now()
    where match_id is null and locked_at is null
      and ((played_at + 1)::timestamp at time zone 'Asia/Seoul') + interval '7 days' <= now();
end;
$$;
revoke all on function public.run_match_jobs() from public, anon, authenticated;

-- ─── 7. 한 회원의 게임 — 예정 게임은 뺀다(경기 결과·홈·통계의 재료) ──────────
create or replace function public.get_user_games(p_user_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if p_user_id <> v_uid and not exists (
        select 1 from public.users u where u.id = p_user_id and u.deleted_at is null and not u.is_guest and not u.stats_hidden
    ) then
        return '[]'::jsonb;
    end if;
    return coalesce((
        select jsonb_agg(jsonb_build_object(
            'id', g.id, 'matchId', g.match_id, 'createdBy', g.created_by, 'matchType', g.match_type,
            'playedAt', g.played_at, 'playedTime', to_char(g.played_time, 'HH24:MI'), 'surface', g.surface,
            'courtName', g.court_name, 'notes', g.notes, 'sets', g.sets,
            'updatedBy', g.updated_by, 'updatedByName', ub.name, 'updatedAt', g.updated_at,
            'locked', (g.locked_at is not null or m.confirmed_at is not null), 'createdAt', g.created_at,
            'players', (
                select jsonb_agg(jsonb_build_object(
                    'team', p.team, 'slot', p.slot, 'userId', p.user_id, 'name', p.name, 'hand', p.hand, 'ntrp', p.ntrp,
                    'deleted', (pu.deleted_at is not null)) order by p.team, p.slot)
                from public.game_players p left join public.users pu on pu.id = p.user_id
                where p.game_id = g.id)
        ) order by g.played_at desc, g.played_time desc nulls last, g.created_at desc)
        from public.games g
        left join public.matches m on m.id = g.match_id
        left join public.users ub on ub.id = g.updated_by
        where jsonb_array_length(g.sets) > 0
          and exists (select 1 from public.game_players me where me.game_id = g.id and me.user_id = p_user_id)
    ), '[]'::jsonb);
end;
$$;
