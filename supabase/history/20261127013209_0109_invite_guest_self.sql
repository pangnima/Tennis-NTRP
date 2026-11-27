-- 0109 초대 화면이 등록한 비회원을 알아본다 + 본인 취소.
--
-- 오너 피드백(11-27): 비회원으로 등록한 뒤 링크를 다시 열면 [비회원으로 참가]가 또 나온다(0108은 아무것도 기억하지 않았다).
--   · 등록한 브라우저는 httpOnly 쿠키에 비회원 id를 들고 있다 → get_invited_match(token, guest_id)가 그 매칭의 비회원이면 meKey를 싣는다
--   · leave_match_as_guest(token, guest_id) — **스스로 등록한 비회원**(added_by is null)이 참가를 취소한다. 열쇠는 토큰 + 비회원 id 둘 다
--   · 다른 기기에서 "명단에서 내 이름 고르기"는 화면만의 일이다(쿠키에 이름 — DB를 쓰지 않는다, 보는 것만 달라진다)

drop function public.get_invited_match(text);

create or replace function public.get_invited_match(p_token text, p_guest_id uuid default null)
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
    return jsonb_strip_nulls(jsonb_build_object(
        -- 등록한 기기가 들고 온 비회원 id가 이 매칭의 것이면 그 사람의 선수 키(빼졌거나 남의 값이면 없다)
        'meKey', (select 'guest:' || g.name from public.match_guests g where g.id = p_guest_id and g.match_id = v_match.id)))
    || jsonb_build_object(
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
revoke execute on function public.get_invited_match(text, uuid) from public;
grant execute on function public.get_invited_match(text, uuid) to anon, authenticated;

-- 초대 링크로 스스로 등록한 비회원의 참가 취소(anon). 참가자가 대신 넣은 비회원은 넣은 사람·호스트가 뺀다(remove_match_guest)
create or replace function public.leave_match_as_guest(p_token text, p_guest_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
    v_match public.matches;
    v_guest public.match_guests;
begin
    select m.* into v_match from public.match_secrets s join public.matches m on m.id = s.match_id where s.invite_token = p_token;
    if not found then raise exception 'invalid_invite_token'; end if;
    select * into v_guest from public.match_guests where id = p_guest_id and match_id = v_match.id;
    if not found then return; end if;   -- 이미 빠졌으면 조용히 통과
    if v_match.confirmed_at is not null then raise exception 'match_confirmed'; end if;
    if v_guest.added_by is not null then raise exception 'not_guest_owner'; end if;
    delete from public.match_guests where id = v_guest.id;
    perform public.send_notifications(array[v_match.host_id], 'match_left', v_match.id, null, null,
                                      jsonb_build_object('guestName', v_guest.name));
end;
$$;
revoke execute on function public.leave_match_as_guest(text, uuid) from public;
grant execute on function public.leave_match_as_guest(text, uuid) to anon, authenticated;
