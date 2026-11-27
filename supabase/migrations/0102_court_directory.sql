-- 0102 코트명 — 함께 쌓는 코트 목록 · 코트명 필수 · 코트 번호.
--
-- 오너 요청(11-26): 신청하는 사람이 어디서 치는지 정확히 알아야 하므로 매칭의 코트명은 필수. 운영자가 모든 코트를
-- 알 수 없어 사람들이 쓴 이름이 곧 목록이 되고, 같은 코트가 「양재 시민의숲」·「양시숲」처럼 갈리지 않게
--   · 찾기(search_court_names)가 기존 이름을 먼저 보여 준다 — 띄어쓰기 무시 · 줄임말(%양%시%숲%) · 초성(ㅇㅈㅅㅁ), 많이 쓴 순
--   · 저장할 때 띄어쓰기·대소문자만 다른 이름은 가장 많이 쓰인 철자로 맞춘다(canonical_court_name)
-- 공용 후보는 목록에 공개된 매칭의 코트명만(직접 기록의 코트명은 본인 화면의 「최근 코트」에만). 코트 번호는 선택(10자).
-- 직접 기록의 코트명은 선택 그대로, 있으면 같은 규칙으로 맞춘다.

-- ─── 1. 컬럼 · 이름 규칙 ─────────────────────────────────────────────────────
alter table public.matches add column court_no text
    constraint matches_court_no_check check (court_no is null or char_length(court_no) between 1 and 10);
comment on column public.matches.court_no is '코트 번호(0102, 선택) — 「3」「3, 4」「A」. 화면이 숫자면 「3번 코트」로 붙인다';

-- 같은 코트 판정 키 — 소문자 + 공백 제거
create or replace function public.court_key(p text)
returns text language sql immutable set search_path = public as $$
    select lower(regexp_replace(coalesce(p, ''), '\s+', '', 'g'));
$$;

-- 한글 음절 → 초성(가 = U+AC00, 588자마다 초성 하나). 나머지는 그대로
create or replace function public.hangul_choseong(p text)
returns text language plpgsql immutable set search_path = public as $$
declare
    v_out text := '';
    ch text;
    c integer;
begin
    foreach ch in array regexp_split_to_array(coalesce(p, ''), '') loop
        c := ascii(ch) - 44032;
        if c between 0 and 11171 then
            v_out := v_out || substr('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', c / 588 + 1, 1);
        else
            v_out := v_out || ch;
        end if;
    end loop;
    return v_out;
end;
$$;

-- 저장할 코트명 — trim, 비면 null. 같은 키의 코트명이 매칭에 있으면 가장 많이 쓰인(같으면 최근) 철자
create or replace function public.canonical_court_name(p_name text)
returns text language sql stable set search_path = public as $$
    select coalesce(
        (select m.court_name from public.matches m
         where m.court_name is not null and public.court_key(m.court_name) = public.court_key(p_name)
         group by m.court_name order by count(*) desc, max(m.created_at) desc limit 1),
        nullif(btrim(p_name), ''))
    where nullif(btrim(p_name), '') is not null;
$$;
revoke all on function public.court_key(text), public.hangul_choseong(text), public.canonical_court_name(text) from public, anon, authenticated;

-- ─── 2. 공용 찾기 ───────────────────────────────────────────────────────────
-- 매칭의 코트명을 키로 묶어(대표 철자 = 가장 많이 쓴 것, uses = 합계) 거른다. 순서 = 앞부분 → 포함 → 줄임말·초성, 그다음 uses.
create or replace function public.search_court_names(p_query text default '', p_limit integer default 8)
returns table (name text, uses bigint)
language plpgsql stable security definer
set search_path = public
as $$
declare
    q text := public.court_key(regexp_replace(coalesce(p_query, ''), '[%_\\]', '', 'g'));
    v_sub text;
    v_jamo boolean;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    v_sub := '%' || array_to_string(regexp_split_to_array(q, ''), '%') || '%';
    v_jamo := q ~ '^[ㄱ-ㅎ]+$';
    return query
    with spell as (
        select m.court_name as n, public.court_key(m.court_name) as k, count(*) as c, max(m.created_at) as last
        from public.matches m
        where m.court_name is not null
        group by m.court_name
    ), grp as (
        select distinct on (s.k) s.k, s.n, sum(s.c) over (partition by s.k) as total
        from spell s
        order by s.k, s.c desc, s.last desc
    )
    select g.n, g.total::bigint
    from grp g
    where q = ''
       or g.k like '%' || q || '%'
       or (not v_jamo and g.k like v_sub)
       or (v_jamo and public.hangul_choseong(g.k) like '%' || q || '%')
    order by case when q = '' or g.k like q || '%' then 0 when g.k like '%' || q || '%' then 1 else 2 end, g.total desc, g.n
    limit greatest(1, least(coalesce(p_limit, 8), 20));
end;
$$;
revoke execute on function public.search_court_names(text, integer) from public, anon;
grant execute on function public.search_court_names(text, integer) to authenticated;

-- ─── 3. 매칭 만들기 · 수정 — 코트명 필수, 코트 번호 ────────────────────────────
drop function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text);
create function public.create_match(
    p_title text,
    p_match_type text,
    p_played_at date,
    p_played_time time,
    p_duration_minutes integer,
    p_surface text,
    p_court_name text,
    p_notes text,
    p_listed boolean,
    p_invitee_ids uuid[] default '{}'::uuid[],
    p_password text default null,
    p_court_no text default null
)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_id uuid;
    v_invitees uuid[];
    v_listed boolean := coalesce(p_listed, true);
    v_title text;
    v_court text;
    v_no text := nullif(btrim(p_court_no), '');
    v_hash text;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    v_title := public.normalize_match_title(p_title);
    v_court := public.canonical_court_name(p_court_name);
    if v_court is null or char_length(v_court) > 40 then raise exception 'invalid_court'; end if;
    if v_no is not null and char_length(v_no) > 10 then raise exception 'invalid_court_no'; end if;
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    if not v_listed then v_hash := public.hash_match_password(p_password); end if;

    insert into public.matches (host_id, title, match_type, played_at, played_time, duration_minutes, surface, court_name, court_no, notes, is_listed)
    values (v_uid, v_title, p_match_type, p_played_at, p_played_time, coalesce(p_duration_minutes, 120), p_surface,
            v_court, v_no, nullif(btrim(p_notes), ''), v_listed)
    returning id into v_id;
    insert into public.match_secrets (match_id, password_hash) values (v_id, v_hash);
    insert into public.match_members (match_id, user_id, role) values (v_id, v_uid, 'host');

    select coalesce(array_agg(distinct u), '{}'::uuid[]) into v_invitees
    from unnest(coalesce(p_invitee_ids, '{}'::uuid[])) u
    where u <> v_uid and public.is_active_member(u);
    if cardinality(v_invitees) > 50 then raise exception 'too_many_invitees'; end if;
    insert into public.match_members (match_id, user_id) select v_id, u from unnest(v_invitees) u;
    perform public.send_notifications(v_invitees, 'match_added', v_id, null, v_uid);
    return v_id;
end;
$$;
revoke execute on function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text, text) from public, anon;
grant execute on function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text, text) to authenticated;

drop function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text);
create function public.update_match(
    p_match_id uuid,
    p_title text,
    p_match_type text,
    p_played_at date,
    p_played_time time,
    p_duration_minutes integer,
    p_surface text,
    p_court_name text,
    p_notes text,
    p_listed boolean,
    p_password text default null,
    p_court_no text default null
)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
    v_title text;
    v_court text;
    v_no text := nullif(btrim(p_court_no), '');
    v_listed boolean;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.host_id <> v_uid then raise exception 'not_host'; end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    v_title := public.normalize_match_title(p_title);
    v_court := public.canonical_court_name(p_court_name);
    if v_court is null or char_length(v_court) > 40 then raise exception 'invalid_court'; end if;
    if v_no is not null and char_length(v_no) > 10 then raise exception 'invalid_court_no'; end if;
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    if p_match_type is distinct from v_match.match_type and exists (select 1 from public.games where match_id = p_match_id) then
        raise exception 'match_type_locked';
    end if;
    v_listed := coalesce(p_listed, v_match.is_listed);

    if not v_listed then
        if v_match.is_listed then
            update public.match_secrets set password_hash = public.hash_match_password(p_password) where match_id = p_match_id;
            perform public.clear_match_applications(p_match_id, v_uid, 'private');
        elsif nullif(p_password, '') is not null then
            update public.match_secrets set password_hash = public.hash_match_password(p_password) where match_id = p_match_id;
        end if;
    elsif not v_match.is_listed then
        update public.match_secrets set password_hash = null where match_id = p_match_id;
    end if;

    update public.matches set
        title = v_title, match_type = p_match_type, played_at = p_played_at, played_time = p_played_time,
        duration_minutes = coalesce(p_duration_minutes, duration_minutes), surface = p_surface,
        court_name = v_court, court_no = v_no, notes = nullif(btrim(p_notes), ''), is_listed = v_listed
    where id = p_match_id;
    update public.games set played_at = p_played_at, played_time = p_played_time, surface = p_surface, court_name = v_court
    where match_id = p_match_id;
end;
$$;
revoke execute on function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text, text) from public, anon;
grant execute on function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text, text) to authenticated;

-- ─── 4. 직접 기록 — 코트명은 선택 그대로, 있으면 같은 철자로 맞춘다 ─────────────
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
    if not exists (select 1 from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) e where e->>'userId' = v_uid::text) then
        raise exception 'not_game_party';
    end if;
    v_sets := public.normalize_game_sets(p_sets, v_doubles);

    insert into public.games (match_id, created_by, match_type, played_at, played_time, surface, court_name, notes, sets)
    values (null, v_uid, p_match_type, p_played_at, p_played_time, p_surface,
            public.canonical_court_name(p_court_name), nullif(btrim(p_notes), ''), v_sets)
    returning id into v_game_id;
    v_member_ids := public.insert_game_players(v_game_id, v_doubles, p_players);

    perform public.send_notifications(v_member_ids, 'game_recorded', null, v_game_id, v_uid);
    return jsonb_build_object('gameId', v_game_id, 'memberIds', to_jsonb(v_member_ids));
end;
$$;

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
        court_name = case when v_game.match_id is null then public.canonical_court_name(p_court_name) else court_name end,
        updated_by = v_uid,
        updated_at = now()
    where id = p_game_id;
    v_member_ids := public.game_member_ids(p_game_id);
    perform public.send_notifications(v_member_ids, 'game_updated', v_game.match_id, p_game_id, v_uid);
    return v_member_ids;
end;
$$;
