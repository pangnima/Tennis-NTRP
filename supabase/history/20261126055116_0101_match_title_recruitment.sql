-- 0101 매칭 리스트 고도화 — 방 제목 · 모집 마감 · 매칭 정보 수정.
--
-- 오너 요청(11-26):
--   ① 방 제목(「남복하실 남자 2명 모집중」) — 목록에서 모집 내용이 보이게. 새 매칭은 필수(1~40자), 기존 행은 null.
--   ② 모집 마감 — 신청을 승인한 뒤 남은 신청을 한 번에 정리한다. 마감하면 대기 중 신청은 지워지고 신청자에게 알림,
--      새 신청·비밀번호 입장·초대 링크 입장을 막는다(호스트의 직접 초대는 된다). 호스트가 언제든 해제한다.
--      **매칭 상태(진행 중/확정됨)는 둘 그대로** — closed_at은 「모집 여부」라는 별도 표시다(「신청 중」처럼).
--   ③ 매칭 정보 수정 화면 — update_match가 제목·비밀번호를 받고, 게임이 있으면 종목을 바꾸지 못한다(보드는 매칭 종목으로
--      자리 수를 정한다). 공개→비공개로 바꾸면 대기 중 신청은 지워진다(비공개는 신청을 받지 않는다).
-- 알림 타입은 늘리지 않는다 — 신청이 취소된 이유는 match_declined의 payload.reason('closed' | 'private')에 싣는다.

-- ─── 1. 컬럼 ─────────────────────────────────────────────────────────────────
alter table public.matches add column title text
    constraint matches_title_check check (title is null or char_length(title) between 1 and 40);
alter table public.matches add column closed_at timestamptz;
comment on column public.matches.title is '방 제목(0101) — 목록·상세의 이름. 새 매칭은 필수, 0101 이전 행은 null(화면이 종목으로 대신 부른다)';
comment on column public.matches.closed_at is '모집 마감 시각(0101). null = 모집 중. 매칭 상태가 아니라 모집 여부다';

-- 방 제목 규칙 — 앞뒤 공백을 빼고 1~40자
create or replace function public.normalize_match_title(p_title text)
returns text language plpgsql immutable set search_path = public as $$
declare
    v text := btrim(coalesce(p_title, ''));
begin
    if char_length(v) not between 1 and 40 then raise exception 'invalid_title'; end if;
    return v;
end;
$$;
revoke all on function public.normalize_match_title(text) from public, anon, authenticated;

-- 신청을 지우고 신청자에게 알린다(모집 마감·비공개 전환이 같이 쓴다)
create or replace function public.clear_match_applications(p_match_id uuid, p_actor uuid, p_reason text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
    v_ids uuid[];
begin
    with del as (delete from public.match_applications where match_id = p_match_id returning user_id)
    select coalesce(array_agg(user_id), '{}'::uuid[]) into v_ids from del;
    perform public.send_notifications(v_ids, 'match_declined', p_match_id, null, p_actor, jsonb_build_object('reason', p_reason));
end;
$$;
revoke all on function public.clear_match_applications(uuid, uuid, text) from public, anon, authenticated;

-- ─── 2. 매칭 만들기 — 방 제목 필수 ───────────────────────────────────────────
drop function public.create_match(text, date, time, integer, text, text, text, boolean, uuid[], text);
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
    v_title text;
    v_hash text;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    v_title := public.normalize_match_title(p_title);
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    if not v_listed then v_hash := public.hash_match_password(p_password); end if;

    insert into public.matches (host_id, title, match_type, played_at, played_time, duration_minutes, surface, court_name, notes, is_listed)
    values (v_uid, v_title, p_match_type, p_played_at, p_played_time, coalesce(p_duration_minutes, 120), p_surface,
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
revoke execute on function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text) from public, anon;
grant execute on function public.create_match(text, text, date, time, integer, text, text, text, boolean, uuid[], text) to authenticated;

-- ─── 3. 매칭 정보 수정 ───────────────────────────────────────────────────────
-- p_password: 비공개로 바꿀 때는 필수, 비공개를 유지할 때는 있으면 바꾸고 없으면 그대로. 공개로 바꾸면 비밀번호를 지운다.
drop function public.update_match(uuid, text, date, time, integer, text, text, text, boolean);
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
    p_password text default null
)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
    v_title text;
    v_listed boolean;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if v_match.host_id <> v_uid then raise exception 'not_host'; end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    v_title := public.normalize_match_title(p_title);
    if p_played_at is null then raise exception 'invalid_played_at'; end if;
    if p_match_type is distinct from v_match.match_type and exists (select 1 from public.games where match_id = p_match_id) then
        raise exception 'match_type_locked';
    end if;
    v_listed := coalesce(p_listed, v_match.is_listed);

    if not v_listed then
        if v_match.is_listed then
            -- 공개 → 비공개: 비밀번호를 정하고, 비공개는 신청을 받지 않으므로 대기 중 신청을 정리한다
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
        court_name = nullif(btrim(p_court_name), ''), notes = nullif(btrim(p_notes), ''), is_listed = v_listed
    where id = p_match_id;
    update public.games set played_at = p_played_at, played_time = p_played_time, surface = p_surface,
        court_name = nullif(btrim(p_court_name), '')
    where match_id = p_match_id;
end;
$$;
revoke execute on function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text) from public, anon;
grant execute on function public.update_match(uuid, text, text, date, time, integer, text, text, text, boolean, text) to authenticated;

-- ─── 4. 모집 마감 / 마감 해제 ────────────────────────────────────────────────
create or replace function public.set_match_closed(p_match_id uuid, p_closed boolean)
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
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if p_closed then
        if v_match.closed_at is not null then return; end if;
        perform public.clear_match_applications(p_match_id, v_uid, 'closed');
        update public.matches set closed_at = now() where id = p_match_id;
    else
        update public.matches set closed_at = null where id = p_match_id;
    end if;
end;
$$;
revoke execute on function public.set_match_closed(uuid, boolean) from public, anon;
grant execute on function public.set_match_closed(uuid, boolean) to authenticated;

-- ─── 5. 마감된 매칭은 신청·입장을 받지 않는다(호스트의 직접 초대만) ───────────
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
    insert into public.match_applications (match_id, user_id) values (p_match_id, v_uid) on conflict do nothing;
    if found then
        perform public.send_notifications(array[v_match.host_id], 'match_applied', p_match_id, null, v_uid);
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

    insert into public.match_members (match_id, user_id) values (v_match.id, v_uid) on conflict do nothing;
    delete from public.match_applications where match_id = v_match.id and user_id = v_uid;
    perform public.send_notifications(array[v_match.host_id], 'match_joined', v_match.id, null, v_uid);
    return jsonb_build_object('status', 'joined', 'matchId', v_match.id);
end;
$$;
