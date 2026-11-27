-- 0105 한 게임 = 한 줄 · 직접 기록의 대진 · 수정 기록.
--
-- 오너 결정(11-26): 경기 결과에 스코어가 2~3개 붙은 줄이 섞여 보였다 — 직접 기록 폼이 한 기록에 스코어를 여러 개 담았기 때문.
--   · **게임은 무조건 1게임(스코어 하나) = 한 줄.** 기존 행은 나누고(prod 대비), DB가 한 줄에 스코어 하나만 받는다
--   · 직접 기록도 매칭룸처럼 **게임마다 대진**을 받는다(참가자 여러 명이 번갈아 친 기록) — record_game이 게임 배열을 받는다.
--     기록자가 뛴 게임이 하나 이상이면 같은 참가자끼리의 게임도 함께 적을 수 있다(3명이 번갈아 단식)
--   · 직접 기록에도 길이(종료 시각)와 코트 번호 — 경기 결과의 묶음 머리가 「20:00~22:00 · 3번 코트」를 쓴다
--   · **수정 기록(game_edits)** — 스코어가 있던 게임의 스코어·선수 변경과 삭제를 남긴다(참가자 누구나 고칠 수 있는 구조의 근거)

-- ─── 1. 한 게임 = 한 줄 ─────────────────────────────────────────────────────
-- 스코어가 여러 개인 행을 나눈다: 첫 스코어는 원래 행에, 나머지는 같은 선수·일시의 새 행(created_at을 1ms씩 밀어 순서 유지)
do $$
declare
    g public.games;
    i integer;
    v_new uuid;
begin
    for g in select * from public.games where jsonb_array_length(sets) > 1 order by created_at loop
        for i in 1 .. jsonb_array_length(g.sets) - 1 loop
            insert into public.games (match_id, created_by, match_type, played_at, played_time, surface, court_name, notes, sets,
                                      updated_by, updated_at, locked_at, created_at)
            values (g.match_id, g.created_by, g.match_type, g.played_at, g.played_time, g.surface, g.court_name, g.notes,
                    jsonb_build_array(g.sets->i), g.updated_by, g.updated_at, g.locked_at, g.created_at + (i * interval '1 millisecond'))
            returning id into v_new;
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp)
            select v_new, p.team, p.slot, p.user_id, p.name, p.hand, p.ntrp from public.game_players p where p.game_id = g.id;
        end loop;
        update public.games set sets = jsonb_build_array(g.sets->0) where id = g.id;
    end loop;
end;
$$;

alter table public.games
    add constraint games_one_set_check check (jsonb_array_length(sets) <= 1),
    add column duration_minutes integer
        constraint games_duration_check check (duration_minutes is null or duration_minutes between 30 and 720),
    add column court_no text
        constraint games_court_no_check check (court_no is null or char_length(court_no) between 1 and 10);
comment on column public.games.sets is '스코어 — 한 줄에 하나(0105). [] = 매칭의 예정 게임';
comment on column public.games.duration_minutes is '직접 기록의 길이(분, 0105) — 매칭 게임은 매칭의 값을 읽는다';
comment on column public.games.court_no is '직접 기록의 코트 번호(0105) — 매칭 게임은 매칭의 값을 읽는다';

-- 스코어 검증 — 하나까지만(예정 게임은 0개)
create or replace function public.normalize_game_sets(p_sets jsonb, p_doubles boolean, p_allow_empty boolean default false)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
    e jsonb;
    v_out jsonb := '[]'::jsonb;
    v_t1 numeric;
    v_t2 numeric;
begin
    if p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) > 1
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

-- ─── 2. 수정 기록 ────────────────────────────────────────────────────────────
create table public.game_edits (
    id uuid primary key default gen_random_uuid(),
    game_id uuid not null,                                            -- FK 없음 — 게임이 지워진 뒤에도 남는다
    match_id uuid references public.matches(id) on delete cascade,
    actor_id uuid references public.users(id) on delete set null,
    action text not null constraint game_edits_action_check check (action in ('edit', 'delete')),
    before jsonb not null,                                            -- {sets, players:[{team, slot, userId, name}]}
    after jsonb,                                                      -- 삭제면 null
    member_ids uuid[] not null default '{}'::uuid[],                  -- 고치기 전·후의 참가 회원(조회 권한)
    match_type text not null,
    played_at date not null,
    played_time time,
    court_name text,
    court_no text,
    created_at timestamptz not null default now()
);
create index game_edits_match_id_idx on public.game_edits (match_id);
create index game_edits_member_ids_idx on public.game_edits using gin (member_ids);
comment on table public.game_edits is '게임 수정 기록(0105) — 스코어가 있던 게임의 스코어·선수 변경과 삭제. 쓰기는 RPC 안에서만';

alter table public.game_edits enable row level security;
revoke all on public.game_edits from anon, authenticated;
grant select on public.game_edits to authenticated;
create policy game_edits_select on public.game_edits for select to authenticated
    using ((select auth.uid()) = any (member_ids) or (match_id is not null and public.can_see_match(match_id)));

-- 게임의 지금 모양 — 수정 기록의 before/after
create or replace function public.game_snapshot(p_game_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
    select jsonb_build_object(
        'sets', g.sets,
        'players', coalesce((
            select jsonb_agg(jsonb_build_object('team', p.team, 'slot', p.slot, 'userId', p.user_id, 'name', p.name) order by p.team, p.slot)
            from public.game_players p where p.game_id = g.id), '[]'::jsonb))
    from public.games g where g.id = p_game_id;
$$;

-- 기록 한 줄. 매칭 게임의 코트 번호는 매칭의 값을 쓴다
create or replace function public.log_game_edit(p_game public.games, p_action text, p_before jsonb, p_after jsonb, p_actor uuid)
returns void language sql volatile security definer set search_path = public as $$
    insert into public.game_edits (game_id, match_id, actor_id, action, before, after, member_ids, match_type, played_at, played_time, court_name, court_no)
    select p_game.id, p_game.match_id, p_actor, p_action, p_before, p_after,
           coalesce((select array_agg(distinct (e->>'userId')::uuid)
                     from jsonb_array_elements(coalesce(p_before->'players', '[]'::jsonb) || coalesce(p_after->'players', '[]'::jsonb)) e
                     where e->>'userId' is not null), '{}'::uuid[]),
           p_game.match_type, p_game.played_at, p_game.played_time, p_game.court_name,
           coalesce(p_game.court_no, (select m.court_no from public.matches m where m.id = p_game.match_id));
$$;
revoke all on function public.game_snapshot(uuid), public.log_game_edit(public.games, text, jsonb, jsonb, uuid) from public, anon, authenticated;

-- ─── 3. 직접 기록 — 게임 배열 ─────────────────────────────────────────────────
-- p_games = [{players:[{team, slot, userId | name·hand·ntrp}], sets:[{t1, t2, t1Ad?, t2Ad?}]}] — 게임마다 대진이 다를 수 있다.
-- 기록자가 뛴 게임이 하나 이상이어야 하고(남의 전적을 아무나 만들지 못하게), 게임마다 회원이 한 명은 있어야 한다(insert_game_players).
drop function public.record_game(uuid, text, date, time, text, text, text, jsonb, jsonb);
create function public.record_game(
    p_match_type text,
    p_played_at date,
    p_played_time time,
    p_duration_minutes integer,
    p_surface text,
    p_court_name text,
    p_court_no text,
    p_notes text,
    p_games jsonb
)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_doubles boolean;
    v_court text;
    v_no text := nullif(btrim(p_court_no), '');
    r jsonb;
    v_ord integer := 0;
    v_game_id uuid;
    v_ids uuid[];
    v_game_ids uuid[] := '{}'::uuid[];
    v_all uuid[] := '{}'::uuid[];
    v_played boolean := false;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    if p_match_type is null or p_match_type not in ('singles', 'men_doubles', 'women_doubles', 'mixed_doubles') then
        raise exception 'invalid_match_type';
    end if;
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    if p_duration_minutes is not null and p_duration_minutes not between 30 and 720 then raise exception 'invalid_duration'; end if;
    if v_no is not null and char_length(v_no) > 10 then raise exception 'invalid_court_no'; end if;
    if p_games is null or jsonb_typeof(p_games) <> 'array' or jsonb_array_length(p_games) not between 1 and 12 then
        raise exception 'invalid_games';
    end if;
    v_doubles := p_match_type <> 'singles';
    v_court := public.canonical_court_name(p_court_name);

    for r in select value from jsonb_array_elements(p_games) loop
        insert into public.games (match_id, created_by, match_type, played_at, played_time, duration_minutes, surface, court_name, court_no,
                                  notes, sets, created_at)
        values (null, v_uid, p_match_type, p_played_at, p_played_time, p_duration_minutes, p_surface, v_court, v_no,
                nullif(btrim(p_notes), ''), public.normalize_game_sets(r->'sets', v_doubles), now() + (v_ord * interval '1 millisecond'))
        returning id into v_game_id;
        v_ids := public.insert_game_players(v_game_id, v_doubles, r->'players');
        if v_uid = any (v_ids) then v_played := true; end if;
        v_game_ids := v_game_ids || v_game_id;
        v_all := v_all || v_ids;
        v_ord := v_ord + 1;
    end loop;
    if not v_played then raise exception 'not_game_party'; end if;

    v_all := array(select distinct unnest(v_all));
    perform public.send_notifications(v_all, 'game_recorded', null, v_game_ids[1], v_uid,
        jsonb_build_object('playedAt', p_played_at, 'matchType', p_match_type, 'count', v_ord));
    return jsonb_build_object('gameIds', to_jsonb(v_game_ids), 'memberIds', to_jsonb(v_all));
end;
$$;
revoke execute on function public.record_game(text, date, time, integer, text, text, text, text, jsonb) from public, anon;
grant execute on function public.record_game(text, date, time, integer, text, text, text, text, jsonb) to authenticated;

-- 스코어 수정(게임 하나) — 직접 기록은 일시·장소·길이·코트 번호도. 스코어가 바뀌면 수정 기록을 남긴다
drop function public.update_game(uuid, jsonb, text, date, time, text, text);
create function public.update_game(
    p_game_id uuid,
    p_sets jsonb,
    p_notes text,
    p_played_at date default null,
    p_played_time time default null,
    p_surface text default null,
    p_court_name text default null,
    p_duration_minutes integer default null,
    p_court_no text default null
)
returns uuid[]
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_game public.games;
    v_direct boolean;
    v_sets jsonb;
    v_no text := nullif(btrim(p_court_no), '');
    v_before jsonb;
    v_member_ids uuid[];
begin
    v_game := public.lock_editable_game(p_game_id);
    v_direct := v_game.match_id is null;
    v_sets := public.normalize_game_sets(p_sets, v_game.match_type <> 'singles', not v_direct);
    if v_direct and p_duration_minutes is not null and p_duration_minutes not between 30 and 720 then raise exception 'invalid_duration'; end if;
    if v_direct and v_no is not null and char_length(v_no) > 10 then raise exception 'invalid_court_no'; end if;
    v_before := public.game_snapshot(p_game_id);
    update public.games set
        sets = v_sets,
        notes = nullif(btrim(p_notes), ''),
        played_at = case when v_direct then coalesce(p_played_at, played_at) else played_at end,
        played_time = case when v_direct then p_played_time else played_time end,
        surface = case when v_direct then p_surface else surface end,
        court_name = case when v_direct then public.canonical_court_name(p_court_name) else court_name end,
        duration_minutes = case when v_direct then p_duration_minutes else duration_minutes end,
        court_no = case when v_direct then v_no else court_no end,
        updated_by = v_uid,
        updated_at = now()
    where id = p_game_id;
    if jsonb_array_length(v_game.sets) > 0 and v_game.sets is distinct from v_sets then
        perform public.log_game_edit(v_game, 'edit', v_before, public.game_snapshot(p_game_id), v_uid);
    end if;
    v_member_ids := public.game_member_ids(p_game_id);
    perform public.send_notifications(v_member_ids, 'game_updated', v_game.match_id, p_game_id, v_uid);
    return v_member_ids;
end;
$$;
revoke execute on function public.update_game(uuid, jsonb, text, date, time, text, text, integer, text) from public, anon;
grant execute on function public.update_game(uuid, jsonb, text, date, time, text, text, integer, text) to authenticated;

create or replace function public.delete_game(p_game_id uuid)
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
    v_member_ids := public.game_member_ids(p_game_id);
    if jsonb_array_length(v_game.sets) > 0 then
        perform public.log_game_edit(v_game, 'delete', public.game_snapshot(p_game_id), null, v_uid);
    end if;
    perform public.send_notifications(v_member_ids, 'game_deleted', v_game.match_id, p_game_id, v_uid,
        jsonb_build_object('playedAt', v_game.played_at, 'matchType', v_game.match_type));
    delete from public.games where id = p_game_id;
    return v_member_ids;
end;
$$;

-- ─── 4. 매칭 게임 보드 — 수정 기록 ────────────────────────────────────────────
-- 스코어가 **있던** 게임의 스코어·선수 변경과 삭제만 남긴다(예정 대진을 고치거나 처음 스코어를 넣는 것은 「기록」이다)
create or replace function public.save_match_games(p_match_id uuid, p_upserts jsonb, p_deletes uuid[] default '{}'::uuid[])
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
    v_version timestamptz;
    v_sets jsonb;
    v_ids uuid[];
    v_all uuid[] := '{}'::uuid[];
    v_rows jsonb := '[]'::jsonb;
    v_recorded boolean := false;
    v_updated boolean := false;
    v_before jsonb;
    v_after jsonb;
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
        if jsonb_array_length(v_game.sets) > 0 then
            v_updated := true;
            perform public.log_game_edit(v_game, 'delete', public.game_snapshot(v_id), null, v_uid);
        end if;
        delete from public.games where id = v_id;
    end loop;

    for r in select value from jsonb_array_elements(p_upserts) loop
        v_sets := public.normalize_game_sets(coalesce(r->'sets', '[]'::jsonb), v_doubles, true);
        v_before := null;
        if r->>'id' is null then
            insert into public.games (match_id, created_by, match_type, played_at, played_time, surface, court_name, sets)
            values (p_match_id, v_uid, v_match.match_type, v_match.played_at, v_match.played_time, v_match.surface,
                    v_match.court_name, v_sets)
            returning id, created_at into v_id, v_version;
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
            if jsonb_array_length(v_game.sets) > 0 then v_before := public.game_snapshot(v_game.id); end if;
            update public.games set sets = v_sets, updated_by = v_uid, updated_at = now() where id = v_game.id
            returning updated_at into v_version;
            delete from public.game_players where game_id = v_game.id;
            v_id := v_game.id;
        end if;
        v_ids := public.insert_game_players(v_id, v_doubles, r->'players');
        if exists (select 1 from unnest(v_ids) u
                   where not exists (select 1 from public.match_members mm where mm.match_id = p_match_id and mm.user_id = u)) then
            raise exception 'player_not_member';
        end if;
        if v_before is not null then
            v_after := public.game_snapshot(v_id);
            if v_before is distinct from v_after then
                perform public.log_game_edit(v_game, 'edit', v_before, v_after, v_uid);
            end if;
        end if;
        v_all := v_all || v_ids;
        v_rows := v_rows || jsonb_build_array(jsonb_build_object('id', v_id, 'version', v_version));
    end loop;

    if v_recorded or v_updated then
        perform public.send_notifications(
            (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = p_match_id),
            case when v_recorded then 'game_recorded' else 'game_updated' end, p_match_id, null, v_uid);
    end if;
    return jsonb_build_object('memberIds', to_jsonb(array(select distinct unnest(v_all))), 'rows', v_rows);
end;
$$;

-- ─── 5. 읽기 — 길이·코트 번호 ─────────────────────────────────────────────────
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
            'playedAt', g.played_at, 'playedTime', to_char(g.played_time, 'HH24:MI'), 'durationMinutes', g.duration_minutes,
            'surface', g.surface, 'courtName', g.court_name, 'courtNo', g.court_no, 'notes', g.notes, 'sets', g.sets,
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
