-- 0100 게임 보드의 게임별 저장 — save_match_games가 저장한 게임의 {id, version}을 돌려준다.
--
-- 보드는 줄 하나만 저장해도 다른 줄의 미저장 입력을 지켜야 한다. 저장한 줄의 새 id(새 게임)·version(낙관적 동시성 값)을
-- 응답으로 받아 그 줄의 기준만 바꾼다. 반환 = {memberIds, rows: [{id, version}]}(rows는 p_upserts 순서).
-- 시그니처·검증·알림·권한은 0098과 같다.

create or replace function public.save_match_games(p_match_id uuid, p_upserts jsonb, p_deletes uuid[] default '{}')
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
        if jsonb_array_length(v_game.sets) > 0 then v_updated := true; end if;
        delete from public.games where id = v_id;
    end loop;

    for r in select value from jsonb_array_elements(p_upserts) loop
        v_sets := public.normalize_game_sets(coalesce(r->'sets', '[]'::jsonb), v_doubles, true);
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
revoke execute on function public.save_match_games(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_match_games(uuid, jsonb, uuid[]) to authenticated;
