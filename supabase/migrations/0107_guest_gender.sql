-- 0107 비회원 성별 — 게임과 함께 저장한다.
--
-- 오너 요청(11-27): 비회원 추가 줄에 성별을 고르는 곳이 없다 — 토글은 혼복일 때만 보였고, 그 값도 화면에서 대진을 짜는 동안만
-- 쓰이고 저장되지 않았다(game_players에 칸이 없어 다시 열면 사라진다).
--   · game_players.gender — **비회원 행만 쓴다**. 회원의 성별은 프로필(users.gender)이 정본이라 스냅샷하지 않는다(null)
--   · 값은 선택이다(male/female이 아니면 null) — 예전 클라이언트와 이미 저장된 비회원이 그대로 통과한다
--   · 남복 = 남 · 여복 = 여 고정은 화면 규칙이다. DB는 종목과 성별을 맞춰 보지 않는다(회원도 막지 않으므로)

alter table public.game_players
    add column gender text constraint game_players_gender_check check (gender is null or gender in ('male', 'female'));
comment on column public.game_players.gender is '비회원의 성별(0107) — 회원 행은 null(프로필이 정본)';

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
            insert into public.game_players (game_id, team, slot, user_id, name, hand, ntrp, gender)
            values (p_game_id, (p->>'team')::int, (p->>'slot')::int, null, v_name,
                    case when p->>'hand' in ('right', 'left') then p->>'hand' end, (p->>'ntrp')::numeric,
                    case when p->>'gender' in ('male', 'female') then p->>'gender' end);
        end if;
    end loop;
    return v_member_ids;
end;
$$;

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
