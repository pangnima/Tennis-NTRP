-- 0099 매칭 입장 — 비공개 = 비밀번호, 공개 = 참가 신청 → 호스트 승인, 호스트의 내보내기.
--
-- 오너 결정(11-26): 공개 매칭은 [참가]가 즉시 참가가 아니라 호스트가 승인한 사람만 명단에 남는다(무분별한 입장 방지).
-- 비공개 매칭은 목록에 자물쇠로 보이고 비밀번호를 아는 회원이 바로 들어온다. 초대 링크(토큰)와 호스트의 직접 초대는
-- 지금처럼 즉시 참가다 — 둘 다 호스트가 건네는 것이라 이미 호스트의 뜻이다(그래서 둘 다 호스트만 쓸 수 있게 좁힌다).
-- 「match_members 행이 있으면 참가 중」 원칙은 그대로 — 신청은 별도 테이블이고, 승인하면 멤버 행이 생긴다.

-- ─── 1. 비밀번호 · 신청 테이블 · 가시성 ──────────────────────────────────────
alter table public.match_secrets add column password_hash text;   -- bcrypt. null = 비밀번호 없음(공개 매칭 또는 링크 전용)

create table public.match_applications (
    match_id   uuid not null references public.matches(id) on delete cascade,
    user_id    uuid not null references public.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (match_id, user_id)
);
comment on table public.match_applications is '공개 매칭 참가 신청(0099). 행이 있으면 신청 중 — 승인하면 match_members로 옮겨지고, 거절·취소·경기 시작이면 지워진다.';
create index match_applications_user_idx on public.match_applications (user_id);
alter table public.match_applications enable row level security;
create policy match_applications_select on public.match_applications
    for select to authenticated using (
        user_id = (select auth.uid())
        or exists (select 1 from public.matches m where m.id = match_id and m.host_id = (select auth.uid())));
revoke all on public.match_applications from anon;
revoke insert, update, delete on public.match_applications from authenticated;
grant select on public.match_applications to authenticated;

-- 매칭 행은 로그인 회원 전원에게 — 비공개 매칭도 목록에 자물쇠로 보여야 비밀번호를 넣을 수 있다.
-- 명단·게임은 여전히 can_see_match(공개 ∨ 참가자) — 비공개 매칭의 안쪽은 참가 전에는 보이지 않는다.
drop policy matches_select on public.matches;
create policy matches_select on public.matches for select to authenticated using (true);

-- 신청이 닫히는 시각 — 경기 시작(시각을 모르면 그날 끝)
create or replace function public.match_start_at(m public.matches)
returns timestamptz language sql stable set search_path = public as $$
    select case
        when m.played_time is null then ((m.played_at + 1)::timestamp) at time zone 'Asia/Seoul'
        else (m.played_at + m.played_time) at time zone 'Asia/Seoul'
    end;
$$;
revoke all on function public.match_start_at(public.matches) from public, anon, authenticated;

-- 비밀번호 규칙 — 4~20자, 공백 금지. 해시를 돌려준다
create or replace function public.hash_match_password(p_password text)
returns text language plpgsql volatile set search_path = public, extensions as $$
begin
    if p_password is null or char_length(p_password) not between 4 and 20 or p_password ~ '\s' then
        raise exception 'invalid_password';
    end if;
    return crypt(p_password, gen_salt('bf'));
end;
$$;
revoke all on function public.hash_match_password(text) from public, anon, authenticated;

-- ─── 2. 알림 4종 추가 ────────────────────────────────────────────────────────
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'match_added', 'match_joined', 'match_left', 'match_confirmed', 'match_deleted', 'match_tomorrow',
    'match_applied', 'match_approved', 'match_declined', 'match_removed',
    'game_recorded', 'game_updated', 'game_deleted'));

-- ─── 3. 매칭 만들기 — 비공개면 비밀번호 필수 ──────────────────────────────────
drop function public.create_match(text, date, time, integer, text, text, text, boolean, uuid[]);
create function public.create_match(
    p_match_type text,
    p_played_at date,
    p_played_time time,
    p_duration_minutes integer,
    p_surface text,
    p_court_name text,
    p_notes text,
    p_listed boolean,
    p_invitee_ids uuid[] default '{}'::uuid[],
    p_password text default null
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
    v_hash text;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    if not v_listed then v_hash := public.hash_match_password(p_password); end if;

    insert into public.matches (host_id, match_type, played_at, played_time, duration_minutes, surface, court_name, notes, is_listed)
    values (v_uid, p_match_type, p_played_at, p_played_time, coalesce(p_duration_minutes, 120), p_surface,
            nullif(btrim(p_court_name), ''), nullif(btrim(p_notes), ''), v_listed)
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
revoke execute on function public.create_match(text, date, time, integer, text, text, text, boolean, uuid[], text) from public, anon;
grant execute on function public.create_match(text, date, time, integer, text, text, text, boolean, uuid[], text) to authenticated;

-- ─── 4. 입장 — 링크(토큰) 또는 비공개 매칭의 비밀번호. 공개 매칭은 신청으로만 ──────
-- 틀린 비밀번호는 raise 하지 않고 {status:'wrong_password'}로 돌려준다 — raise하면 같은 트랜잭션의 시도 횟수도
-- 되돌아가 제한이 걸리지 않는다. 10분에 10번을 넘기면 throttle_hit이 rate_limited로 막는다.
drop function public.join_match(uuid, text);
create function public.join_match(p_match_id uuid default null, p_token text default null, p_password text default null)
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

    if not v_ok then
        if v_match.is_listed then raise exception 'use_application'; end if;
        perform public.throttle_hit('join_password', 10, interval '10 minutes');
        select password_hash into v_hash from public.match_secrets where match_id = v_match.id;
        if v_hash is null or p_password is null or crypt(p_password, v_hash) <> v_hash then
            return jsonb_build_object('status', 'wrong_password', 'matchId', v_match.id);
        end if;
    end if;

    insert into public.match_members (match_id, user_id) values (v_match.id, v_uid) on conflict do nothing;
    delete from public.match_applications where match_id = v_match.id and user_id = v_uid;
    perform public.send_notifications(array[v_match.host_id], 'match_joined', v_match.id, null, v_uid);
    return jsonb_build_object('status', 'joined', 'matchId', v_match.id);
end;
$$;
revoke execute on function public.join_match(uuid, text, text) from public, anon;
grant execute on function public.join_match(uuid, text, text) to authenticated;

-- ─── 5. 참가 신청 · 취소 · 호스트의 결정 ─────────────────────────────────────
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
    if v_match.confirmed_at is not null or public.match_start_at(v_match) <= now() then raise exception 'application_closed'; end if;
    if exists (select 1 from public.match_members where match_id = p_match_id and user_id = v_uid) then return; end if;
    insert into public.match_applications (match_id, user_id) values (p_match_id, v_uid) on conflict do nothing;
    if found then
        perform public.send_notifications(array[v_match.host_id], 'match_applied', p_match_id, null, v_uid);
    end if;
end;
$$;

create or replace function public.cancel_application(p_match_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    delete from public.match_applications where match_id = p_match_id and user_id = auth.uid();
end;
$$;

-- 호스트의 [승인]/[거절]. 승인하면 참가자가 되고 신청은 지워진다. 이미 처리된 신청이면 application_not_found.
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

-- 호스트의 [내보내기]. 이미 기록된 게임은 남는다(그 사람의 전적이기도 하다). 다시 들어오려면 신청·비밀번호·링크.
create or replace function public.remove_match_member(p_match_id uuid, p_user_id uuid)
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
    if p_user_id = v_uid then raise exception 'host_cannot_leave'; end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    delete from public.match_members where match_id = p_match_id and user_id = p_user_id;
    if found then
        perform public.send_notifications(array[p_user_id], 'match_removed', p_match_id, null, v_uid);
    end if;
end;
$$;

-- 호스트가 비공개 매칭의 비밀번호를 바꾼다(해시라 다시 볼 수는 없다)
create or replace function public.set_match_password(p_match_id uuid, p_password text)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_match public.matches;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.host_id <> auth.uid() then raise exception 'not_host'; end if;
    if v_match.is_listed then raise exception 'match_public'; end if;
    update public.match_secrets set password_hash = public.hash_match_password(p_password) where match_id = p_match_id;
end;
$$;

revoke execute on function public.apply_match(uuid), public.cancel_application(uuid), public.decide_application(uuid, uuid, boolean),
    public.remove_match_member(uuid, uuid), public.set_match_password(uuid, text) from public, anon;
grant execute on function public.apply_match(uuid), public.cancel_application(uuid), public.decide_application(uuid, uuid, boolean),
    public.remove_match_member(uuid, uuid), public.set_match_password(uuid, text) to authenticated;

-- ─── 6. 사람을 부르는 길은 호스트만 — 참가자가 링크·초대로 승인을 우회하지 않게 ──────
create or replace function public.add_match_members(p_match_id uuid, p_user_ids uuid[])
returns integer
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
    v_added uuid[];
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if v_match.host_id <> v_uid then raise exception 'not_host'; end if;

    with ins as (
        insert into public.match_members (match_id, user_id)
        select distinct p_match_id, u from unnest(coalesce(p_user_ids, '{}'::uuid[])) u
        where public.is_active_member(u)
        on conflict do nothing
        returning user_id
    )
    select coalesce(array_agg(user_id), '{}'::uuid[]) into v_added from ins;
    delete from public.match_applications where match_id = p_match_id and user_id = any(v_added);
    perform public.send_notifications(v_added, 'match_added', p_match_id, null, v_uid);
    return cardinality(v_added);
end;
$$;

create or replace function public.get_match_invite_token(p_match_id uuid)
returns text
language plpgsql stable security definer
set search_path = public
as $$
begin
    if not exists (select 1 from public.matches where id = p_match_id and host_id = auth.uid()) then raise exception 'not_host'; end if;
    return (select invite_token from public.match_secrets where match_id = p_match_id);
end;
$$;

-- ─── 7. 신청이 닫히는 때 — 확정, 경기 시작 ─────────────────────────────────
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
        delete from public.games where match_id = p_match_id and jsonb_array_length(sets) = 0;
        delete from public.match_applications where match_id = p_match_id;
        update public.matches set confirmed_at = now() where id = p_match_id;
        perform public.send_notifications(
            (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = p_match_id),
            'match_confirmed', p_match_id, null, v_uid);
    else
        update public.matches set confirmed_at = null where id = p_match_id;
    end if;
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

    -- 경기가 시작된 매칭의 참가 신청은 사라진다(처리되지 않은 신청이 영영 남지 않게)
    delete from public.match_applications a using public.matches m
    where a.match_id = m.id and public.match_start_at(m) <= now();

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
