-- 0104 매칭 — 코트 비용 · 인원(정원).
--
-- 오너 요청(11-26): 매칭을 만들 때 코트 비용(선택)과 인원(기본 단식 2 · 복식 4, 수정 가능)을 적는다.
--   · court_fee = 코트 **총액**(원). 화면이 총액 ÷ 정원으로 「1인당 약 N원」을 같이 보여 준다. null = 안 적음
--   · capacity = 정원(호스트 포함). 차면 새 신청·비밀번호 입장·초대 링크·승인을 막는다(`match_full`) — 화면 표시는 기존
--     「모집 마감」 그대로(새 상태 없음). 호스트의 직접 초대(add_match_members)는 재량이라 막지 않는다.
--     누가 나가거나 정원을 늘리면 자동으로 다시 열린다(저장하는 상태가 아니라 그때그때 센다).

-- ─── 1. 컬럼 ────────────────────────────────────────────────────────────────
alter table public.matches
    add column court_fee integer
        constraint matches_court_fee_check check (court_fee is null or court_fee between 0 and 10000000),
    add column capacity integer;

update public.matches m set capacity = greatest(
    case when m.match_type = 'singles' then 2 else 4 end,
    (select count(*) from public.match_members mm where mm.match_id = m.id)::integer);

alter table public.matches
    alter column capacity set not null,
    add constraint matches_capacity_check check (capacity between 2 and 50);
comment on column public.matches.court_fee is '코트 비용 총액(원, 0104) — 선택. 화면이 정원으로 나눠 1인당 금액을 보여 준다';
comment on column public.matches.capacity is '정원(0104, 호스트 포함 2~50) — 차면 신청·입장·승인을 막는다(match_full)';

-- 정원이 찼나 — 신청·입장·승인이 같은 술어를 쓴다(앱 `isMatchFull`의 거울)
create or replace function public.match_is_full(p_match_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select (select count(*) from public.match_members mm where mm.match_id = m.id) >= m.capacity
    from public.matches m where m.id = p_match_id;
$$;
revoke all on function public.match_is_full(uuid) from public, anon, authenticated;

-- ─── 2. 매칭 만들기 · 수정 ────────────────────────────────────────────────────
drop function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text, text);
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
    p_court_no text default null,
    p_court_fee integer default null,
    p_capacity integer default null
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
    v_capacity integer := coalesce(p_capacity, case when p_match_type = 'singles' then 2 else 4 end);
    v_hash text;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    v_title := public.normalize_match_title(p_title);
    v_court := public.canonical_court_name(p_court_name);
    if v_court is null or char_length(v_court) > 40 then raise exception 'invalid_court'; end if;
    if v_no is not null and char_length(v_no) > 10 then raise exception 'invalid_court_no'; end if;
    if p_court_fee is not null and (p_court_fee < 0 or p_court_fee > 10000000) then raise exception 'invalid_court_fee'; end if;
    if v_capacity < 2 or v_capacity > 50 then raise exception 'invalid_capacity'; end if;
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    if not v_listed then v_hash := public.hash_match_password(p_password); end if;

    insert into public.matches (host_id, title, match_type, played_at, played_time, duration_minutes, surface, court_name, court_no,
                                court_fee, capacity, notes, is_listed)
    values (v_uid, v_title, p_match_type, p_played_at, p_played_time, coalesce(p_duration_minutes, 120), p_surface,
            v_court, v_no, p_court_fee, v_capacity, nullif(btrim(p_notes), ''), v_listed)
    returning id into v_id;
    insert into public.match_secrets (match_id, password_hash) values (v_id, v_hash);
    insert into public.match_members (match_id, user_id, role) values (v_id, v_uid, 'host');

    -- 초대한 회원이 정원을 넘는 것은 막지 않는다(호스트 재량 — 직접 초대와 같은 규칙)
    select coalesce(array_agg(distinct u), '{}'::uuid[]) into v_invitees
    from unnest(coalesce(p_invitee_ids, '{}'::uuid[])) u
    where u <> v_uid and public.is_active_member(u);
    if cardinality(v_invitees) > 50 then raise exception 'too_many_invitees'; end if;
    insert into public.match_members (match_id, user_id) select v_id, u from unnest(v_invitees) u;
    perform public.send_notifications(v_invitees, 'match_added', v_id, null, v_uid);
    return v_id;
end;
$$;
revoke execute on function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text, text, integer, integer) from public, anon;
grant execute on function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text, text, integer, integer) to authenticated;

drop function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text, text);
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
    p_court_no text default null,
    p_court_fee integer default null,
    p_capacity integer default null
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
    v_capacity integer;
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
    if p_court_fee is not null and (p_court_fee < 0 or p_court_fee > 10000000) then raise exception 'invalid_court_fee'; end if;
    v_capacity := coalesce(p_capacity, v_match.capacity);
    if v_capacity < 2 or v_capacity > 50 then raise exception 'invalid_capacity'; end if;
    if v_capacity < (select count(*) from public.match_members where match_id = p_match_id) then
        raise exception 'capacity_below_members';
    end if;
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
        court_name = v_court, court_no = v_no, court_fee = p_court_fee, capacity = v_capacity,
        notes = nullif(btrim(p_notes), ''), is_listed = v_listed
    where id = p_match_id;
    update public.games set played_at = p_played_at, played_time = p_played_time, surface = p_surface, court_name = v_court
    where match_id = p_match_id;
end;
$$;
revoke execute on function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text, text, integer, integer) from public, anon;
grant execute on function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text, text, integer, integer) to authenticated;

-- ─── 3. 정원 검사 — 신청 · 입장 · 승인 ────────────────────────────────────────
create or replace function public.apply_match(p_match_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if not v_match.is_listed then raise exception 'match_private'; end if;
    if exists (select 1 from public.match_members where match_id = p_match_id and user_id = v_uid) then return; end if;
    if v_match.closed_at is not null then raise exception 'recruitment_closed'; end if;
    if v_match.confirmed_at is not null or public.match_start_at(v_match) <= now() then raise exception 'application_closed'; end if;
    if public.match_is_full(p_match_id) then raise exception 'match_full'; end if;
    insert into public.match_applications (match_id, user_id) values (p_match_id, v_uid) on conflict do nothing;
    if found then
        perform public.send_notifications(array[v_match.host_id], 'match_applied', p_match_id, null, v_uid);
    end if;
end;
$$;

-- 승인은 정원이 차면 거절(신청은 남는다 — 지우기 전에 본다). 거절은 언제나 된다
create or replace function public.decide_application(p_match_id uuid, p_user_id uuid, p_approve boolean)
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
    if p_approve and v_match.confirmed_at is null and public.match_is_full(p_match_id)
       and exists (select 1 from public.match_applications where match_id = p_match_id and user_id = p_user_id) then
        raise exception 'match_full';
    end if;
    delete from public.match_applications where match_id = p_match_id and user_id = p_user_id;
    if not found then raise exception 'application_not_found'; end if;
    if p_approve then
        if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
        if not public.is_active_member(p_user_id) then raise exception 'player_not_found'; end if;
        insert into public.match_members (match_id, user_id) values (p_match_id, p_user_id) on conflict do nothing;
        perform public.send_notifications(array[p_user_id], 'match_approved', p_match_id, null, v_uid);
    else
        perform public.send_notifications(array[p_user_id], 'match_declined', p_match_id, null, v_uid);
    end if;
end;
$$;

create or replace function public.join_match(p_match_id uuid default null, p_token text default null, p_password text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
    v_hash text;
    v_ok boolean := false;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    if p_token is not null then
        select m.* into v_match from public.match_secrets s join public.matches m on m.id = s.match_id
        where s.invite_token = p_token and (p_match_id is null or m.id = p_match_id);
        if not found then raise exception 'invalid_invite_token'; end if;
        v_ok := true;
    else
        select * into v_match from public.matches where id = p_match_id;
        if not found then raise exception 'match_not_found'; end if;
    end if;

    if exists (select 1 from public.match_members where match_id = v_match.id and user_id = v_uid) then
        return jsonb_build_object('status', 'joined', 'matchId', v_match.id);   -- 이미 참가 중이면 조용히 통과
    end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if v_match.closed_at is not null then raise exception 'recruitment_closed'; end if;

    if not v_ok then
        if v_match.is_listed then raise exception 'use_application'; end if;
        perform public.throttle_hit('join_password', 10, interval '10 minutes');
        select password_hash into v_hash from public.match_secrets where match_id = v_match.id;
        if v_hash is null or p_password is null or crypt(p_password, v_hash) <> v_hash then
            return jsonb_build_object('status', 'wrong_password', 'matchId', v_match.id);
        end if;
    end if;

    -- 비밀번호가 맞은 뒤에 본다 — 비밀번호를 모르는 사람에게 인원을 흘리지 않는다. 같은 자리를 둘이 잡지 않게 매칭을 잠근다
    perform 1 from public.matches where id = v_match.id for update;
    if public.match_is_full(v_match.id) then raise exception 'match_full'; end if;

    insert into public.match_members (match_id, user_id) values (v_match.id, v_uid) on conflict do nothing;
    delete from public.match_applications where match_id = v_match.id and user_id = v_uid;
    perform public.send_notifications(array[v_match.host_id], 'match_joined', v_match.id, null, v_uid);
    return jsonb_build_object('status', 'joined', 'matchId', v_match.id);
end;
$$;
