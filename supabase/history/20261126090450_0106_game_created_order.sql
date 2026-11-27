-- 0106 게임의 기록 순서 — created_at을 **실제 시각**으로.
--
-- 한 게임 = 한 줄(0105)이 되면서 「1게임, 2게임 …」의 순서가 created_at에 달렸다. 그런데 기본값 now()는 **트랜잭션 시작 시각**이라
-- 한 번에 저장한 게임들(게임 보드의 [모두 저장], 직접 기록의 여러 줄)이 같은 시각을 갖고 순서가 흔들린다.
--   · games.created_at의 기본값을 clock_timestamp()로 — 같은 트랜잭션 안에서도 넣은 순서대로 증가한다
--   · record_game이 손으로 밀던 시각(now() + n ms)을 걷어 내고 기본값에 맡긴다(같은 자리에 여러 번 기록해도 겹치지 않는다)

alter table public.games alter column created_at set default clock_timestamp();

create or replace function public.record_game(
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
                                  notes, sets)
        values (null, v_uid, p_match_type, p_played_at, p_played_time, p_duration_minutes, p_surface, v_court, v_no,
                nullif(btrim(p_notes), ''), public.normalize_game_sets(r->'sets', v_doubles))
        returning id into v_game_id;
        v_ids := public.insert_game_players(v_game_id, v_doubles, r->'players');
        if v_uid = any (v_ids) then v_played := true; end if;
        v_game_ids := v_game_ids || v_game_id;
        v_all := v_all || v_ids;
    end loop;
    if not v_played then raise exception 'not_game_party'; end if;

    v_all := array(select distinct unnest(v_all));
    perform public.send_notifications(v_all, 'game_recorded', null, v_game_ids[1], v_uid,
        jsonb_build_object('playedAt', p_played_at, 'matchType', p_match_type, 'count', cardinality(v_game_ids)));
    return jsonb_build_object('gameIds', to_jsonb(v_game_ids), 'memberIds', to_jsonb(v_all));
end;
$$;
