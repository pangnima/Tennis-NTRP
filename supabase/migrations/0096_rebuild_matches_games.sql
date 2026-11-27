-- 0096_rebuild_matches_games.sql
-- Week 72 — 재구축 1/2: 새 최소 스키마(매칭·게임)를 **옛 테이블 옆에** 만든다. 옛 구조는 0097에서 철거한다.
--
-- 왜: "UI가 복잡하다"는 피드백의 뿌리가 모델이었다 — 게임 1건이 요청·협상·관점 행 복사로 최대 9행, 생성 경로 5개.
-- 새 모델은 **게임 1건 = games 1행 + game_players 2~4행**이고, 보는 사람의 관점(나/파트너/상대)은 앱의 순수 함수
-- `toPersonalMatch`(lib/games/perspective.ts)가 읽을 때 만든다. 확인·이의·수락 단계가 없다:
--   · 결과는 입력 즉시 반영, 참가 회원 누구나 수정(updated_by·updated_at + 알림)
--   · 잠금은 하나 — 매칭은 호스트의 `confirmed_at`, 매칭 밖 게임은 작성자의 `locked_at`. 종료 7일 뒤 자동 잠금
--   · 매칭은 공개(is_listed)/비공개 + 초대 링크(match_secrets.invite_token). 초대 = 즉시 참가
--
-- 쓰기는 전부 RPC(정책은 SELECT뿐). 세트 모양: [{t1, t2, t1Ad?, t2Ad?}] — t1Ad/t2Ad = 애드 코트에 선 사람의 slot(1|2), 복식만.

-- ─── 1. 테이블 ───────────────────────────────────────────────────────────────
create table public.matches (
    id               uuid primary key default gen_random_uuid(),
    host_id          uuid not null references public.users(id),
    match_type       text not null check (match_type in ('singles', 'men_doubles', 'women_doubles', 'mixed_doubles')),
    played_at        date not null,
    played_time      time,
    duration_minutes integer not null default 120 check (duration_minutes between 30 and 720),
    surface          text check (surface in ('hard', 'clay', 'grass', 'other')),
    court_name       text check (court_name is null or char_length(court_name) between 1 and 40),
    notes            text check (notes is null or char_length(notes) <= 500),
    is_listed        boolean not null default true,
    confirmed_at     timestamptz,                    -- 호스트의 최종 확정 = 잠금
    created_at       timestamptz not null default now()
);
comment on table public.matches is '매칭(0096). 공개면 목록에 뜨고 누구나 참가, 비공개면 멤버·초대 링크만. confirmed_at = 호스트 최종 확정(게임 잠금).';
create index matches_list_idx on public.matches (played_at desc, created_at desc) where is_listed;
create index matches_host_idx on public.matches (host_id);

create table public.match_secrets (
    match_id     uuid primary key references public.matches(id) on delete cascade,
    invite_token text not null unique default replace(gen_random_uuid()::text, '-', '')
);
comment on table public.match_secrets is '초대 링크 토큰(0096). 정책 0개 — matches는 공개 SELECT라 토큰을 거기 두면 샌다.';

create table public.match_members (
    match_id  uuid not null references public.matches(id) on delete cascade,
    user_id   uuid not null references public.users(id) on delete cascade,
    role      text not null default 'player' check (role in ('host', 'player')),
    joined_at timestamptz not null default now(),
    primary key (match_id, user_id)
);
comment on table public.match_members is '매칭 참가자(0096). 행이 있으면 참가 중 — 상태 컬럼 없음, 나가면 행 삭제.';
create index match_members_user_idx on public.match_members (user_id);

create table public.games (
    id          uuid primary key default gen_random_uuid(),
    match_id    uuid references public.matches(id),          -- null = 매칭 없이 직접 기록. 게임이 있는 매칭은 못 지운다
    created_by  uuid not null references public.users(id),
    match_type  text not null check (match_type in ('singles', 'men_doubles', 'women_doubles', 'mixed_doubles')),
    played_at   date not null,
    played_time time,
    surface     text check (surface in ('hard', 'clay', 'grass', 'other')),
    court_name  text check (court_name is null or char_length(court_name) between 1 and 40),
    notes       text check (notes is null or char_length(notes) <= 500),
    sets        jsonb not null check (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) between 1 and 5),
    updated_by  uuid references public.users(id),            -- 마지막으로 고친 사람(생성만 했으면 null)
    updated_at  timestamptz,
    locked_at   timestamptz,                                 -- 매칭 밖 게임의 잠금(매칭 게임은 matches.confirmed_at)
    created_at  timestamptz not null default clock_timestamp()
);
comment on table public.games is '게임(0096) — 1건 = 1행. sets = [{t1,t2,t1Ad?,t2Ad?}], 세트 하나가 통계의 게임 하나. 관점은 읽을 때 앱이 만든다.';
create index games_match_idx on public.games (match_id) where match_id is not null;
create index games_created_by_idx on public.games (created_by);
create index games_updated_by_idx on public.games (updated_by) where updated_by is not null;

create table public.game_players (
    game_id uuid not null references public.games(id) on delete cascade,
    team    smallint not null check (team in (1, 2)),
    slot    smallint not null check (slot in (1, 2)),
    user_id uuid references public.users(id),                -- null = 비회원
    name    text not null check (char_length(name) between 1 and 20),   -- 회원이면 기록 시점 이름 스냅샷
    hand    text check (hand in ('right', 'left')),
    ntrp    numeric(4, 3) check (ntrp is null or ntrp between 1 and 7), -- 기록 시점 스냅샷(레이팅 계산의 상대 강도)
    primary key (game_id, team, slot)
);
comment on table public.game_players is '게임 참가자(0096). 단식 2행(slot 1) / 복식 4행. user_id null이면 비회원(이름이 정체성).';
create unique index game_players_user_uidx on public.game_players (game_id, user_id) where user_id is not null;
create index game_players_user_idx on public.game_players (user_id) where user_id is not null;

-- ─── 2. 가시성 헬퍼(SECURITY DEFINER — 정책식 상호 재귀 우회) ────────────────
create or replace function public.is_match_member(p_match_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.match_members where match_id = p_match_id and user_id = (select auth.uid()));
$$;

create or replace function public.can_see_match(p_match_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.matches m where m.id = p_match_id and (m.is_listed or public.is_match_member(m.id)));
$$;

create or replace function public.can_see_game(p_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.games g
        where g.id = p_game_id
          and (exists (select 1 from public.game_players p where p.game_id = g.id and p.user_id = (select auth.uid()))
               or (g.match_id is not null and public.can_see_match(g.match_id))));
$$;

alter table public.matches       enable row level security;
alter table public.match_secrets enable row level security;
alter table public.match_members enable row level security;
alter table public.games         enable row level security;
alter table public.game_players  enable row level security;

create policy matches_select on public.matches
    for select to authenticated using (is_listed or public.is_match_member(id));
create policy match_members_select on public.match_members
    for select to authenticated using (public.can_see_match(match_id));
create policy games_select on public.games
    for select to authenticated using (public.can_see_game(id));
create policy game_players_select on public.game_players
    for select to authenticated using (public.can_see_game(game_id));
-- match_secrets: 정책 0개. 쓰기 정책은 어디에도 없다 = RPC 전용.

revoke all on public.matches, public.match_secrets, public.match_members, public.games, public.game_players from anon;
revoke insert, update, delete on public.matches, public.match_members, public.games, public.game_players from authenticated;
revoke all on public.match_secrets from authenticated;

revoke all on function public.is_match_member(uuid) from public, anon;
revoke all on function public.can_see_match(uuid) from public, anon;
revoke all on function public.can_see_game(uuid) from public, anon;
grant execute on function public.is_match_member(uuid), public.can_see_match(uuid), public.can_see_game(uuid) to authenticated;

-- ─── 3. 알림 — 새 대상 컬럼·새 타입·새 문 ─────────────────────────────────────
alter table public.notifications
    add column match_id uuid references public.matches(id) on delete set null,
    add column game_id uuid;       -- FK 없음: 게임은 지워져도 알림은 남고, 링크는 match_id 또는 내 경기 목록으로 간다
create index notifications_match_idx on public.notifications (match_id) where match_id is not null;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    -- 0094(옛 구조 — 0097에서 행과 함께 걷어낸다)
    'room_invited', 'invite_accepted', 'invite_declined', 'room_entered', 'member_removed', 'member_left',
    'result_proposed', 'result_confirmed', 'result_auto_confirmed', 'result_disputed', 'result_reopen_requested',
    'room_closed', 'lineup_saved', 'lineup_changed', 'room_deleted', 'invite_expired',
    'invite_reminder', 'room_tomorrow', 'result_missing', 'auto_confirm_reminder', 'reentry_reminder',
    -- 0096
    'match_added', 'match_joined', 'match_left', 'match_confirmed', 'match_deleted', 'match_tomorrow',
    'game_recorded', 'game_updated', 'game_deleted'
));

create or replace function public.match_end_at(m public.matches)
returns timestamptz language sql stable set search_path = public as $$
    select case
        when m.played_time is null then ((m.played_at + 1)::timestamp) at time zone 'Asia/Seoul'
        else ((m.played_at + m.played_time) at time zone 'Asia/Seoul') + make_interval(mins => m.duration_minutes)
    end;
$$;
revoke all on function public.match_end_at(public.matches) from public, anon, authenticated;

-- 알림을 넣는 유일한 문(새 구조). 행위자·탈퇴자 제외, dedupe 충돌은 조용히 건너뛴다.
-- payload = 매칭 스냅샷(있으면) + actorName + 타입별 키 — 매칭·사람이 지워져도 문구가 선다(0094와 같은 원칙).
create or replace function public.send_notifications(
    p_user_ids uuid[],
    p_type text,
    p_match_id uuid,
    p_game_id uuid,
    p_actor uuid,
    p_payload jsonb default '{}'::jsonb,
    p_dedupe_key text default null
)
returns integer
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_payload jsonb := '{}'::jsonb;
    v_count integer;
begin
    if p_user_ids is null or cardinality(p_user_ids) = 0 then return 0; end if;

    if p_match_id is not null then
        select jsonb_strip_nulls(jsonb_build_object(
            'playedAt', m.played_at, 'playedTime', to_char(m.played_time, 'HH24:MI'),
            'durationMinutes', m.duration_minutes, 'matchType', m.match_type,
            'courtName', m.court_name, 'hostName', h.name))
        into v_payload
        from public.matches m left join public.users h on h.id = m.host_id
        where m.id = p_match_id;
        v_payload := coalesce(v_payload, '{}'::jsonb);
    end if;
    if p_actor is not null then
        v_payload := v_payload || jsonb_strip_nulls(jsonb_build_object(
            'actorName', (select u.name from public.users u where u.id = p_actor)));
    end if;
    v_payload := v_payload || coalesce(p_payload, '{}'::jsonb);

    insert into public.notifications (user_id, type, match_id, game_id, actor_user_id, payload, dedupe_key)
    select distinct u, p_type, p_match_id, p_game_id, p_actor, v_payload, p_dedupe_key
    from unnest(p_user_ids) as t(u)
    where public.is_active_member(u) and (p_actor is null or u <> p_actor)
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
    get diagnostics v_count = row_count;
    return v_count;
end;
$$;
revoke all on function public.send_notifications(uuid[], text, uuid, uuid, uuid, jsonb, text) from public, anon, authenticated;

-- ─── 4. 게임 내부 헬퍼 ───────────────────────────────────────────────────────
-- 세트 검증 + 정규화. 1~5개, 0~99 정수, 0-0 금지. 애드 키는 복식만(값 1|2), 단식이면 버린다. 틀리면 invalid_sets.
create or replace function public.normalize_game_sets(p_sets jsonb, p_doubles boolean)
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
    if p_sets is null or jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) not between 1 and 5 then
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
revoke all on function public.normalize_game_sets(jsonb, boolean) from public, anon, authenticated;

create or replace function public.game_member_ids(p_game_id uuid)
returns uuid[] language sql stable security definer set search_path = public as $$
    select coalesce(array_agg(user_id), '{}'::uuid[]) from public.game_players where game_id = p_game_id and user_id is not null;
$$;
revoke all on function public.game_member_ids(uuid) from public, anon, authenticated;

-- 고칠 자격 + 잠금 검사를 한 곳에서. 자격 = 그 게임의 회원 참가자 ∨ 작성자 ∨ 매칭 호스트. 행을 잠그고 돌려준다.
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
            or exists (select 1 from public.game_players where game_id = p_game_id and user_id = v_uid)) then
        raise exception 'not_game_party';
    end if;
    if v_game.locked_at is not null or v_match.confirmed_at is not null then raise exception 'game_locked'; end if;
    return v_game;
end;
$$;
revoke all on function public.lock_editable_game(uuid) from public, anon, authenticated;

-- ─── 5. 게임 RPC ─────────────────────────────────────────────────────────────
-- p_players = [{team, slot, userId?, name?, hand?, ntrp?}] — 단식 2명(slot 1), 복식 4명. 회원은 userId만(이름·손·NTRP는 DB가 채운다).
-- 매칭 게임이면 일시·표면·코트는 매칭 값을 복사하고(위조 방지), 매칭에 없던 회원 참가자는 그 자리에서 참가자가 된다.
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
    v_match public.matches;
    v_doubles boolean;
    v_expected integer;
    v_sets jsonb;
    v_game_id uuid;
    v_member_ids uuid[];
    p jsonb;
    v_user public.users;
    v_team integer;
    v_slot integer;
    v_name text;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    if p_match_type is null or p_match_type not in ('singles', 'men_doubles', 'women_doubles', 'mixed_doubles') then
        raise exception 'invalid_match_type';
    end if;
    v_doubles := p_match_type <> 'singles';
    v_expected := case when v_doubles then 4 else 2 end;

    if p_players is null or jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) <> v_expected then
        raise exception 'invalid_players';
    end if;
    -- 자리(team, slot)는 정확히 한 번씩, 단식은 slot 1만
    if (select count(distinct (e->>'team') || ':' || (e->>'slot')) from jsonb_array_elements(p_players) e
        where (e->>'team') in ('1', '2') and (e->>'slot') in ('1', '2') and (v_doubles or (e->>'slot') = '1')) <> v_expected then
        raise exception 'invalid_players';
    end if;
    -- 같은 회원이 두 자리에 설 수 없다
    if (select count(*) <> count(distinct e->>'userId') from jsonb_array_elements(p_players) e where e->>'userId' is not null) then
        raise exception 'duplicate_player';
    end if;
    v_member_ids := coalesce((select array_agg((e->>'userId')::uuid) from jsonb_array_elements(p_players) e where e->>'userId' is not null), '{}'::uuid[]);
    if cardinality(v_member_ids) = 0 then raise exception 'no_member_player'; end if;

    v_sets := public.normalize_game_sets(p_sets, v_doubles);

    if p_match_id is not null then
        select * into v_match from public.matches where id = p_match_id for update;
        if not found then raise exception 'match_not_found'; end if;
        if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
        if not exists (select 1 from public.match_members where match_id = p_match_id and user_id = v_uid) then
            raise exception 'not_match_member';
        end if;
        p_played_at := v_match.played_at;
        p_played_time := v_match.played_time;
        p_surface := v_match.surface;
        p_court_name := v_match.court_name;
    else
        if not (v_uid = any(v_member_ids)) then raise exception 'not_game_party'; end if;
        if p_played_at is null then raise exception 'invalid_played_at'; end if;
    end if;

    insert into public.games (match_id, created_by, match_type, played_at, played_time, surface, court_name, notes, sets)
    values (p_match_id, v_uid, p_match_type, p_played_at, p_played_time, p_surface,
            nullif(btrim(p_court_name), ''), nullif(btrim(p_notes), ''), v_sets)
    returning id into v_game_id;

    for p in select value from jsonb_array_elements(p_players) loop
        v_team := (p->>'team')::int;
        v_slot := (p->>'slot')::int;
        if p->>'userId' is not null then
            select * into v_user from public.users where id = (p->>'userId')::uuid;
            if not found or v_user.deleted_at is not null or v_user.is_guest then raise exception 'player_not_found'; end if;
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp)
            values (v_game_id, v_team, v_slot, v_user.id, v_user.name, v_user.dominant_hand,
                    coalesce(v_user.personal_ntrp, v_user.ntrp));
        else
            v_name := btrim(coalesce(p->>'name', ''));
            if char_length(v_name) not between 1 and 20 then raise exception 'invalid_player_name'; end if;
            if p->>'ntrp' is not null and (p->>'ntrp')::numeric not between 1 and 7 then raise exception 'invalid_player_ntrp'; end if;
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp)
            values (v_game_id, v_team, v_slot, null, v_name,
                    case when p->>'hand' in ('right', 'left') then p->>'hand' end,
                    (p->>'ntrp')::numeric);
        end if;
    end loop;

    if p_match_id is not null then
        insert into public.match_members (match_id, user_id, role)
        select p_match_id, u, 'player' from unnest(v_member_ids) u
        on conflict do nothing;
    end if;

    perform public.send_notifications(v_member_ids, 'game_recorded', p_match_id, v_game_id, v_uid);
    return jsonb_build_object('gameId', v_game_id, 'memberIds', to_jsonb(v_member_ids));
end;
$$;

-- 스코어·메모 수정(매칭 밖 게임은 일시·표면·코트도). 선수 변경은 없다 — 지우고 다시 기록한다.
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
        sets = public.normalize_game_sets(p_sets, v_game.match_type <> 'singles'),
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
    perform public.send_notifications(v_member_ids, 'game_deleted', v_game.match_id, p_game_id, v_uid,
        jsonb_build_object('playedAt', v_game.played_at, 'matchType', v_game.match_type));
    delete from public.games where id = p_game_id;
    return v_member_ids;
end;
$$;

-- 매칭 밖 게임의 잠금 — 작성자만. 매칭 게임은 confirm_match가 맡는다.
create or replace function public.set_game_locked(p_game_id uuid, p_locked boolean)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_game public.games;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select * into v_game from public.games where id = p_game_id for update;
    if not found then raise exception 'game_not_found'; end if;
    if v_game.match_id is not null then raise exception 'game_in_match'; end if;
    if v_game.created_by <> v_uid then raise exception 'not_game_owner'; end if;
    update public.games set locked_at = case when p_locked then coalesce(locked_at, now()) end where id = p_game_id;
end;
$$;

-- ─── 6. 매칭 RPC ─────────────────────────────────────────────────────────────
create or replace function public.create_match(
    p_match_type text,
    p_played_at date,
    p_played_time time,
    p_duration_minutes integer,
    p_surface text,
    p_court_name text,
    p_notes text,
    p_listed boolean,
    p_invitee_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_id uuid;
    v_invitees uuid[];
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    if p_played_at is null then raise exception 'invalid_played_at'; end if;

    insert into public.matches (host_id, match_type, played_at, played_time, duration_minutes, surface, court_name, notes, is_listed)
    values (v_uid, p_match_type, p_played_at, p_played_time, coalesce(p_duration_minutes, 120), p_surface,
            nullif(btrim(p_court_name), ''), nullif(btrim(p_notes), ''), coalesce(p_listed, true))
    returning id into v_id;
    insert into public.match_secrets (match_id) values (v_id);
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

-- 참가자가 회원을 부른다 — 초대 = 즉시 참가(수락 단계 없음, 싫으면 나간다). 반환 = 새로 들어온 수.
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
    if not exists (select 1 from public.match_members where match_id = p_match_id and user_id = v_uid) then
        raise exception 'not_match_member';
    end if;

    with ins as (
        insert into public.match_members (match_id, user_id)
        select distinct p_match_id, u from unnest(coalesce(p_user_ids, '{}'::uuid[])) u
        where public.is_active_member(u)
        on conflict do nothing
        returning user_id
    )
    select coalesce(array_agg(user_id), '{}'::uuid[]) into v_added from ins;
    perform public.send_notifications(v_added, 'match_added', p_match_id, null, v_uid);
    return cardinality(v_added);
end;
$$;

-- 내가 들어간다. 공개 매칭은 id만으로, 비공개는 초대 링크의 토큰으로(토큰만 줘도 매칭을 찾는다). 반환 = 매칭 id.
create or replace function public.join_match(p_match_id uuid default null, p_token text default null)
returns uuid
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_match public.matches;
    v_token_ok boolean := false;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_active_member(v_uid) then raise exception 'not_active_member'; end if;
    if p_token is not null then
        select m.* into v_match from public.match_secrets s join public.matches m on m.id = s.match_id
        where s.invite_token = p_token and (p_match_id is null or m.id = p_match_id);
        if not found then raise exception 'invalid_invite_token'; end if;
        v_token_ok := true;
    else
        select * into v_match from public.matches where id = p_match_id;
        if not found then raise exception 'match_not_found'; end if;
    end if;

    if exists (select 1 from public.match_members where match_id = v_match.id and user_id = v_uid) then
        return v_match.id;       -- 이미 참가 중이면 조용히 통과(링크를 두 번 눌러도 된다)
    end if;
    if not (v_match.is_listed or v_token_ok) then raise exception 'match_private'; end if;
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;

    insert into public.match_members (match_id, user_id) values (v_match.id, v_uid) on conflict do nothing;
    perform public.send_notifications(array[v_match.host_id], 'match_joined', v_match.id, null, v_uid);
    return v_match.id;
end;
$$;

-- 나간다(호스트는 못 나간다). 이미 기록된 게임은 그대로 남고, 내 게임은 계속 내 기록이다.
create or replace function public.leave_match(p_match_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_host uuid;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select host_id into v_host from public.matches where id = p_match_id;
    if not found then raise exception 'match_not_found'; end if;
    if v_host = v_uid then raise exception 'host_cannot_leave'; end if;
    delete from public.match_members where match_id = p_match_id and user_id = v_uid;
    if found then
        perform public.send_notifications(array[v_host], 'match_left', p_match_id, null, v_uid);
    end if;
end;
$$;

-- 호스트가 매칭 정보를 고친다. 매칭 게임의 일시·표면·코트는 매칭을 따라간다(record_game이 복사한 값).
create or replace function public.update_match(
    p_match_id uuid,
    p_match_type text,
    p_played_at date,
    p_played_time time,
    p_duration_minutes integer,
    p_surface text,
    p_court_name text,
    p_notes text,
    p_listed boolean
)
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
    if p_played_at is null then raise exception 'invalid_played_at'; end if;

    update public.matches set
        match_type = p_match_type, played_at = p_played_at, played_time = p_played_time,
        duration_minutes = coalesce(p_duration_minutes, duration_minutes), surface = p_surface,
        court_name = nullif(btrim(p_court_name), ''), notes = nullif(btrim(p_notes), ''),
        is_listed = coalesce(p_listed, is_listed)
    where id = p_match_id;
    update public.games set played_at = p_played_at, played_time = p_played_time, surface = p_surface,
        court_name = nullif(btrim(p_court_name), '')
    where match_id = p_match_id;
end;
$$;

-- 호스트의 최종 확정 = 잠금 / 확정 취소. 확정하면 게임 기록·수정·삭제·참가가 전부 막힌다.
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
        if not exists (select 1 from public.games where match_id = p_match_id) then raise exception 'match_empty'; end if;
        update public.matches set confirmed_at = now() where id = p_match_id;
        perform public.send_notifications(
            (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = p_match_id),
            'match_confirmed', p_match_id, null, v_uid);
    else
        update public.matches set confirmed_at = null where id = p_match_id;
    end if;
end;
$$;

-- 게임이 하나라도 있으면 못 지운다 — 지우면 참가자들의 전적이 함께 사라진다(게임을 먼저 지우게 한다).
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
    if exists (select 1 from public.games where match_id = p_match_id) then raise exception 'match_has_games'; end if;
    perform public.send_notifications(
        (select coalesce(array_agg(user_id), '{}'::uuid[]) from public.match_members where match_id = p_match_id),
        'match_deleted', p_match_id, null, v_uid);
    delete from public.matches where id = p_match_id;
end;
$$;

-- 초대 링크 토큰 — 참가자에게만
create or replace function public.get_match_invite_token(p_match_id uuid)
returns text
language plpgsql stable security definer
set search_path = public
as $$
begin
    if not public.is_match_member(p_match_id) then raise exception 'not_match_member'; end if;
    return (select invite_token from public.match_secrets where match_id = p_match_id);
end;
$$;

-- ─── 7. 읽기 RPC — 통계 재료·랭킹 ────────────────────────────────────────────
-- 한 회원이 뛴 게임 전부(참가자 포함). 본인은 언제나, 타인은 통계 비공개·탈퇴가 아니면. 앱의 toPersonalMatch가 관점으로 바꾼다.
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
        where exists (select 1 from public.game_players me where me.game_id = g.id and me.user_id = p_user_id)
    ), '[]'::jsonb);
end;
$$;

-- 개인 랭킹 — 레이팅(users.personal_ntrp, 없으면 자가선언 ntrp) 순. p_kind로 단식/복식 경기 수·승수를 따로 센다(세트 = 게임 1개).
create or replace function public.get_member_rankings(p_kind text default 'all', p_min_games integer default 5, p_limit integer default 100)
returns table (user_id uuid, name text, nickname text, profile_image text, rating numeric, games integer, wins integer)
language sql stable security definer
set search_path = public
as $$
    with tally as (
        select p.user_id,
               count(*)::int as games,
               count(*) filter (where (p.team = 1 and (s->>'t1')::int > (s->>'t2')::int)
                                   or (p.team = 2 and (s->>'t2')::int > (s->>'t1')::int))::int as wins
        from public.game_players p
        join public.games g on g.id = p.game_id
        cross join lateral jsonb_array_elements(g.sets) s
        where p.user_id is not null
          and (p_kind = 'all' or (p_kind = 'singles' and g.match_type = 'singles') or (p_kind = 'doubles' and g.match_type <> 'singles'))
        group by p.user_id
    )
    select u.id, u.name, u.nickname, u.profile_image, coalesce(u.personal_ntrp, u.ntrp) as rating, t.games, t.wins
    from tally t join public.users u on u.id = t.user_id
    where (select auth.uid()) is not null
      and u.deleted_at is null and not u.is_guest and not u.stats_hidden
      and t.games >= greatest(coalesce(p_min_games, 0), 0)
    order by coalesce(u.personal_ntrp, u.ntrp) desc nulls last, t.wins desc, t.games desc, u.created_at
    limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

-- ─── 8. 예약 — 전날 리마인드 + 종료 7일 자동 잠금 ─────────────────────────────
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

    -- 호스트가 확정을 잊은 매칭 — 종료 7일 뒤 자동 확정(게임이 있을 때만)
    for r in
        select m.id from public.matches m
        where m.confirmed_at is null and public.match_end_at(m) + interval '7 days' <= now()
          and exists (select 1 from public.games g where g.match_id = m.id)
    loop
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

select cron.unschedule(jobid) from cron.job where jobname = 'match_jobs';
select cron.schedule('match_jobs', '*/30 * * * *', $$select public.run_match_jobs()$$);

-- ─── 9. 권한 — anon 회수(Supabase 기본 권한이 자동 부여한다) ──────────────────
revoke execute on function public.record_game(uuid, text, date, time, text, text, text, jsonb, jsonb) from public, anon;
revoke execute on function public.update_game(uuid, jsonb, text, date, time, text, text) from public, anon;
revoke execute on function public.delete_game(uuid) from public, anon;
revoke execute on function public.set_game_locked(uuid, boolean) from public, anon;
revoke execute on function public.create_match(text, date, time, integer, text, text, text, boolean, uuid[]) from public, anon;
revoke execute on function public.add_match_members(uuid, uuid[]) from public, anon;
revoke execute on function public.join_match(uuid, text) from public, anon;
revoke execute on function public.leave_match(uuid) from public, anon;
revoke execute on function public.update_match(uuid, text, date, time, integer, text, text, text, boolean) from public, anon;
revoke execute on function public.set_match_confirmed(uuid, boolean) from public, anon;
revoke execute on function public.delete_match(uuid) from public, anon;
revoke execute on function public.get_match_invite_token(uuid) from public, anon;
revoke execute on function public.get_user_games(uuid) from public, anon;
revoke execute on function public.get_member_rankings(text, integer, integer) from public, anon;

grant execute on function
    public.record_game(uuid, text, date, time, text, text, text, jsonb, jsonb),
    public.update_game(uuid, jsonb, text, date, time, text, text),
    public.delete_game(uuid),
    public.set_game_locked(uuid, boolean),
    public.create_match(text, date, time, integer, text, text, text, boolean, uuid[]),
    public.add_match_members(uuid, uuid[]),
    public.join_match(uuid, text),
    public.leave_match(uuid),
    public.update_match(uuid, text, date, time, integer, text, text, text, boolean),
    public.set_match_confirmed(uuid, boolean),
    public.delete_match(uuid),
    public.get_match_invite_token(uuid),
    public.get_user_games(uuid),
    public.get_member_rankings(text, integer, integer)
to authenticated;
