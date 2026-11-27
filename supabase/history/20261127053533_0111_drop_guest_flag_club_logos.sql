-- 0111 옛 잔재 두 가지를 걷는다 — users.is_guest 칸, storage club-logos 버킷의 정책
--
-- 왜:
--   - `users.is_guest`는 옛 구조에서 「계정 없는 선수」를 users 행으로 만들던 표시다. 0096부터 비회원은
--     게임의 선수 행(`game_players.user_id is null`)과 명단(`match_guests`)으로만 존재하고, dev·prod 모두
--     is_guest = true인 행이 0건이다. 그런데 함수 다섯이 아직 `not is_guest`를 검사하고 앱이 칸을 읽었다.
--   - `club-logos` 버킷은 클럽이 사라진 뒤에도 남았고, 정책이 **로그인한 누구나 아무 객체를 올리고·바꾸고·지울 수 있게**
--     열려 있었다(객체 0건). 버킷 자체는 SQL로 지울 수 없어(storage가 막는다) 정책을 걷어 쓸 수 없게 만든다 —
--     빈 버킷은 대시보드에서 지운다.
--
-- 함수 본문은 is_guest 조건만 뺐고 나머지는 원격의 현재 정의와 같다.

-- ─── 1. is_guest를 읽던 함수 ────────────────────────────────────────────────
create or replace function public.is_active_member(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user_id is not null and exists (
    select 1 from users u where u.id = p_user_id and u.deleted_at is null
  );
$$;

create or replace function public.get_member_rankings(p_kind text default 'all', p_min_games integer default 5, p_limit integer default 100)
returns table(user_id uuid, name text, nickname text, profile_image text, rating numeric, games integer, wins integer)
language sql stable security definer set search_path = public as $$
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
      and u.deleted_at is null and not u.stats_hidden
      and t.games >= greatest(coalesce(p_min_games, 0), 0)
    order by coalesce(u.personal_ntrp, u.ntrp) desc nulls last, t.wins desc, t.games desc, u.created_at
    limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

create or replace function public.get_user_games(p_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if p_user_id <> v_uid and not exists (
        select 1 from public.users u where u.id = p_user_id and u.deleted_at is null and not u.stats_hidden
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
                    'gender', p.gender, 'deleted', (pu.deleted_at is not null)) order by p.team, p.slot)
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

create or replace function public.insert_game_players(p_game_id uuid, p_doubles boolean, p_players jsonb)
returns uuid[] language plpgsql security definer set search_path = public as $$
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
            if not found or v_user.deleted_at is not null then raise exception 'player_not_found'; end if;
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp)
            values (p_game_id, (p->>'team')::int, (p->>'slot')::int, v_user.id, v_user.name, v_user.dominant_hand,
                    coalesce(v_user.personal_ntrp, v_user.ntrp));
        else
            v_name := btrim(coalesce(p->>'name', ''));
            if char_length(v_name) not between 1 and 20 then raise exception 'invalid_player_name'; end if;
            if p->>'ntrp' is not null and (p->>'ntrp')::numeric not between 1 and 7 then raise exception 'invalid_player_ntrp'; end if;
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp, gender)
            values (p_game_id, (p->>'team')::int, (p->>'slot')::int, null, v_name,
                    case when p->>'hand' in ('right', 'left') then p->>'hand' end, (p->>'ntrp')::numeric,
                    case when p->>'gender' in ('male', 'female') then p->>'gender' end);
        end if;
    end loop;
    return v_member_ids;
end;
$$;

-- 보호 칸 트리거(0110)에서 is_guest 검사만 뺀다
create or replace function public.guard_user_protected_columns()
returns trigger language plpgsql set search_path = public as $$
begin
    if current_user not in ('authenticated', 'anon') then return new; end if;
    if new.role is distinct from old.role then raise exception 'protected_column'; end if;
    -- 탈퇴는 한 방향이다 — 찍힌 시각을 지우거나 바꿀 수 없다
    if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
        raise exception 'protected_column';
    end if;
    -- 이메일은 로그인 계정(auth)의 거울이다 — 탈퇴 익명화로 바꾸는 것만 허용
    if new.email is distinct from old.email and new.deleted_at is null then
        raise exception 'protected_column';
    end if;
    if new.personal_ntrp is distinct from old.personal_ntrp
       and not (new.personal_ntrp is null and new.deleted_at is not null) then
        raise exception 'protected_column';
    end if;
    if new.ntrp is distinct from old.ntrp
       and (old.ntrp is not null or new.ntrp is null or new.ntrp < 1.0 or new.ntrp > 7.0) then
        raise exception 'protected_column';
    end if;
    if new.login_id is distinct from old.login_id and old.login_id is not null
       and not (new.login_id is null and new.deleted_at is not null) then
        raise exception 'protected_column';
    end if;
    return new;
end;
$$;
revoke all on function public.guard_user_protected_columns() from public, anon, authenticated;

-- ─── 2. 칸 삭제 ──────────────────────────────────────────────────────────────
alter table public.users drop column is_guest;

-- ─── 3. club-logos 버킷 정책 ─────────────────────────────────────────────────
drop policy if exists "club-logos authenticated delete" on storage.objects;
drop policy if exists "club-logos authenticated insert" on storage.objects;
drop policy if exists "club-logos authenticated update" on storage.objects;
drop policy if exists "club-logos public read" on storage.objects;
