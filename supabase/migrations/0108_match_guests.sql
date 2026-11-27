-- 0108 매칭 명단의 비회원 + 초대 링크를 비회원에게 연다.
--
-- 오너 요청(11-27): 게임에는 비회원을 넣을 수 있는데 「참가자」에는 넣을 수 없다. 초대 링크도 회원이 아니면 반응이 없다.
--   · 지금까지 비회원은 게임(game_players)에만 있었다 — 명단·정원·1인당 비용에 잡히지 않았다
--   · match_guests = 매칭 명단의 비회원. **정원에 포함**된다(match_headcount = 회원 + 비회원)
--   · 넣는 문은 둘, 검증·삽입은 insert_match_guest 하나:
--       add_match_guest      — 참가자 누구나(정원이 차거나 모집 마감이면 호스트만)
--       join_match_as_guest  — 초대 링크의 토큰으로 **비로그인(anon)** 이 스스로 등록
--   · 빼는 것은 호스트와 넣은 사람(remove_match_guest). 이미 기록된 게임은 남는다(회원 내보내기와 같다)
--   · get_invited_match — 토큰으로 매칭 요약·명단(이름·성별·구분)·대진·스코어를 읽는다(anon). user id·사진·닉네임·NTRP는 싣지 않는다.
--     매칭 종료 7일 뒤에는 닫힌다(링크를 되돌릴 방법이 없어 무기한 보이지 않게)
--   · 게임 저장(save_match_games)은 그대로 — 비회원 선수는 지금처럼 이름 스냅샷으로 저장된다
--
-- anon에게 여는 RPC는 이 둘뿐이다(가입·로그인 RPC와 같은 예외). 열쇠는 32자 난수 토큰이고,
-- 쓰기는 정원 + 매칭별 시도 제한(10분 10회)으로 묶는다.

create table public.match_guests (
    id uuid primary key default gen_random_uuid(),
    match_id uuid not null references public.matches(id) on delete cascade,
    name text not null constraint match_guests_name_check check (char_length(name) between 1 and 20 and name = btrim(name)),
    ntrp numeric not null constraint match_guests_ntrp_check check (ntrp between 1 and 7),
    gender text constraint match_guests_gender_check check (gender is null or gender in ('male', 'female')),
    hand text constraint match_guests_hand_check check (hand is null or hand in ('right', 'left')),
    -- null = 초대 링크로 스스로 등록
    added_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default clock_timestamp(),
    -- 보드의 선수 키(guest:<이름>)와 같은 단위 — 한 매칭에 같은 이름의 비회원은 하나
    constraint match_guests_name_key unique (match_id, name)
);
comment on table public.match_guests is '매칭 명단의 비회원(0108) — 정원에 포함된다. 쓰기는 RPC 전용';
create index match_guests_added_by_idx on public.match_guests (added_by);

alter table public.match_guests enable row level security;
create policy match_guests_select on public.match_guests for select to authenticated using (public.can_see_match(match_id));
revoke all on public.match_guests from anon;

-- ── 정원 = 회원 + 비회원 ─────────────────────────────────────────────────────
create or replace function public.match_headcount(p_match_id uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
    select (select count(*) from public.match_members where match_id = p_match_id)::integer
         + (select count(*) from public.match_guests where match_id = p_match_id)::integer;
$$;
revoke all on function public.match_headcount(uuid) from public, anon, authenticated;

create or replace function public.match_is_full(p_match_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
    select public.match_headcount(m.id) >= m.capacity from public.matches m where m.id = p_match_id;
$$;

-- ── 비회원 검증·삽입 — 두 문이 같이 쓴다 ─────────────────────────────────────
create or replace function public.insert_match_guest(p_match_id uuid, p_name text, p_ntrp numeric, p_gender text, p_hand text, p_added_by uuid)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_name text := btrim(coalesce(p_name, ''));
    v_id uuid;
begin
    if char_length(v_name) not between 1 and 20 then raise exception 'invalid_player_name'; end if;
    if p_ntrp is null or p_ntrp not between 1 and 7 then raise exception 'invalid_player_ntrp'; end if;
    if exists (select 1 from public.match_guests where match_id = p_match_id and name = v_name) then
        raise exception 'guest_name_taken';
    end if;
    insert into public.match_guests (match_id, name, ntrp, gender, hand, added_by)
    values (p_match_id, v_name, p_ntrp,
            case when p_gender in ('male', 'female') then p_gender end,
            case when p_hand in ('right', 'left') then p_hand end, p_added_by)
    returning id into v_id;
    return v_id;
end;
$$;
revoke all on function public.insert_match_guest(uuid, text, numeric, text, text, uuid) from public, anon, authenticated;

-- 참가자가 비회원을 명단에 넣는다. 정원이 찼거나 모집 마감이면 호스트만(직접 초대와 같은 규칙)
create or replace function public.add_match_guest(p_match_id uuid, p_name text, p_ntrp numeric, p_gender text default null, p_hand text default null)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
    v_id uuid;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_match from public.matches where id = p_match_id for update;
    if not found then raise exception 'match_not_found'; end if;
    if not exists (select 1 from public.match_members where match_id = p_match_id and user_id = v_uid) then
        raise exception 'not_match_member';
    end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if v_match.host_id <> v_uid then
        if v_match.closed_at is not null then raise exception 'recruitment_closed'; end if;
        if public.match_is_full(p_match_id) then raise exception 'match_full'; end if;
    end if;
    v_id := public.insert_match_guest(p_match_id, p_name, p_ntrp, p_gender, p_hand, v_uid);
    perform public.send_notifications(array[v_match.host_id], 'match_joined', p_match_id, null, v_uid,
                                      jsonb_build_object('guestName', btrim(p_name)));
    return v_id;
end;
$$;
revoke execute on function public.add_match_guest(uuid, text, numeric, text, text) from public, anon;
grant execute on function public.add_match_guest(uuid, text, numeric, text, text) to authenticated;

-- 명단에서 비회원 빼기 — 호스트 또는 넣은 사람(아직 참가자일 때). 게임은 남는다
create or replace function public.remove_match_guest(p_guest_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_guest public.match_guests;
    v_match public.matches;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_guest from public.match_guests where id = p_guest_id;
    if not found then return; end if;   -- 이미 빠졌으면 조용히 통과
    select * into v_match from public.matches where id = v_guest.match_id for update;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if v_match.host_id <> v_uid and (v_guest.added_by is distinct from v_uid or not public.is_match_member(v_match.id)) then
        raise exception 'not_guest_owner';
    end if;
    delete from public.match_guests where id = p_guest_id;
end;
$$;
revoke execute on function public.remove_match_guest(uuid) from public, anon;
grant execute on function public.remove_match_guest(uuid) to authenticated;

-- 초대 링크로 비회원이 스스로 등록한다(anon). 확정·마감·정원은 회원의 링크 참가(join_match)와 같은 순서로 본다.
-- 시도 제한은 성공한 등록만 센다(실패는 함께 되돌아간다) — 한 매칭에 10분 10명
create or replace function public.join_match_as_guest(p_token text, p_name text, p_ntrp numeric, p_gender text default null, p_hand text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_match public.matches;
    v_id uuid;
begin
    select m.* into v_match from public.match_secrets s join public.matches m on m.id = s.match_id where s.invite_token = p_token;
    if not found then raise exception 'invalid_invite_token'; end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if v_match.closed_at is not null then raise exception 'recruitment_closed'; end if;
    perform public.throttle_hit('guest_join:' || v_match.id::text, 10, interval '10 minutes');
    perform 1 from public.matches where id = v_match.id for update;
    if public.match_is_full(v_match.id) then raise exception 'match_full'; end if;
    v_id := public.insert_match_guest(v_match.id, p_name, p_ntrp, p_gender, p_hand, auth.uid());
    perform public.send_notifications(array[v_match.host_id], 'match_joined', v_match.id, null, auth.uid(),
                                      jsonb_build_object('guestName', btrim(p_name), 'viaLink', true));
    return jsonb_build_object('matchId', v_match.id, 'guestId', v_id);
end;
$$;
revoke execute on function public.join_match_as_guest(text, text, numeric, text, text) from public;
grant execute on function public.join_match_as_guest(text, text, numeric, text, text) to anon, authenticated;

-- 초대 링크로 읽는 매칭 — 요약 + 명단(이름·성별·구분) + 대진·스코어. 회원의 key는 사람을 가르는 용도의 해시다(user id를 내보내지 않는다)
create or replace function public.get_invited_match(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
    v_match public.matches;
begin
    select m.* into v_match from public.match_secrets s join public.matches m on m.id = s.match_id where s.invite_token = p_token;
    if not found then return null; end if;
    if public.match_end_at(v_match) + interval '7 days' < now() then return null; end if;
    return jsonb_build_object(
        'match', to_jsonb(v_match) - 'host_id',
        'hostName', (select u.name from public.users u where u.id = v_match.host_id),
        'roster', coalesce((
            select jsonb_agg(r.j order by r.ord, r.at) from (
                select jsonb_build_object(
                           'key', substr(md5(v_match.id::text || mm.user_id::text), 1, 12), 'name', u.name, 'gender', u.gender,
                           'kind', case when mm.role = 'host' then 'host' else 'member' end, 'deleted', (u.deleted_at is not null)) as j,
                       case when mm.role = 'host' then 0 else 1 end as ord, mm.joined_at as at
                from public.match_members mm join public.users u on u.id = mm.user_id
                where mm.match_id = v_match.id
                union all
                select jsonb_build_object('key', 'guest:' || g.name, 'name', g.name, 'gender', g.gender, 'kind', 'guest', 'deleted', false),
                       2, g.created_at
                from public.match_guests g where g.match_id = v_match.id
            ) r), '[]'::jsonb),
        'games', coalesce((
            select jsonb_agg(jsonb_build_object(
                'sets', g.sets,
                'players', (
                    select jsonb_agg(jsonb_build_object(
                        'team', p.team, 'slot', p.slot, 'member', (p.user_id is not null),
                        'key', case when p.user_id is null then 'guest:' || p.name
                                    else substr(md5(v_match.id::text || p.user_id::text), 1, 12) end,
                        'name', p.name, 'gender', coalesce(p.gender, pu.gender)) order by p.team, p.slot)
                    from public.game_players p left join public.users pu on pu.id = p.user_id
                    where p.game_id = g.id)
            ) order by g.created_at)
            from public.games g where g.match_id = v_match.id), '[]'::jsonb)
    );
end;
$$;
revoke execute on function public.get_invited_match(text) from public;
grant execute on function public.get_invited_match(text) to anon, authenticated;

-- ── update_match — 정원을 지금 인원(회원 + 비회원) 아래로 줄일 수 없다 ────────
create or replace function public.update_match(
    p_match_id uuid, p_title text, p_match_type text, p_played_at date, p_played_time time without time zone,
    p_duration_minutes integer, p_surface text, p_court_name text, p_notes text, p_listed boolean,
    p_password text default null, p_court_no text default null, p_court_fee integer default null, p_capacity integer default null)
returns void
language plpgsql security definer
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
    if v_capacity < public.match_headcount(p_match_id) then
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

-- ── 백필 — 확정 전 매칭의 게임에만 있던 비회원을 명단에 올린다(보드와 명단이 어긋나지 않게) ──
insert into public.match_guests (match_id, name, ntrp, gender, hand, added_by)
select distinct on (g.match_id, btrim(p.name))
       g.match_id, btrim(p.name), least(greatest(coalesce(p.ntrp, 2.5), 1), 7), p.gender, p.hand, g.created_by
from public.game_players p
join public.games g on g.id = p.game_id
join public.matches m on m.id = g.match_id
where p.user_id is null and m.confirmed_at is null and char_length(btrim(p.name)) between 1 and 20
order by g.match_id, btrim(p.name), g.created_at desc
on conflict do nothing;
