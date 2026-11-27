-- 0103 코트명 정리(공식 명칭 · 별칭) + 회원 보호 칸 잠금.
--
-- 오너 요청(11-26): 코트명이 쌓이면 「양시숲·양재시민·양재시숲」「올림픽·올공·올림픽공원」처럼 갈린다. 많이 쓰이는 이름이
-- 보이면 관리자가 **정식 명칭(공식 코트)** 하나로 합치고, 그 뒤에도 「양재」·「양시숲」만 쳐도 공식 명칭이 추천돼야 한다.
--   · courts = 공식 코트, court_aliases = 그 코트를 가리키는 키 전부(공식 명칭 자신의 키 + 합친 옛 이름)
--   · 합치는 순간 매칭·경기의 코트명도 공식 명칭으로 바뀐다(알림 문구는 보낸 그대로)
--   · 저장할 때(canonical_court_name) 별칭으로 적어도 공식 명칭이 된다. 찾기는 공식 코트를 이름과 별칭 전부로 찾는다
--
-- 관리자 RPC의 전제 = `users.role`을 본인이 바꿀 수 없어야 한다. 지금까지는 UPDATE 권한이 전 칸이고 정책은 "본인 행"뿐이라
-- 로그인 회원이 PostgREST로 자기 role·personal_ntrp·ntrp·login_id를 고칠 수 있었다 → 트리거로 잠근다(1번).

-- ─── 1. 회원 보호 칸 ─────────────────────────────────────────────────────────
-- 화면(PostgREST)에서 직접 온 UPDATE만 본다 — SECURITY DEFINER RPC·service_role·마이그레이션은 current_user가 다르다.
--   · role: 바꿀 수 없다
--   · personal_ntrp(레이팅 캐시): 서버의 service_role만 쓴다. 탈퇴 익명화로 비우는 것만 허용
--   · ntrp · login_id: 비어 있을 때 1회(온보딩·내 정보의 화면 규칙을 DB가 지킨다). 탈퇴 때 login_id를 비우는 것은 허용
create or replace function public.guard_user_protected_columns()
returns trigger language plpgsql set search_path = public as $$
begin
    if current_user not in ('authenticated', 'anon') then return new; end if;
    if new.role is distinct from old.role then raise exception 'protected_column'; end if;
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

drop trigger if exists users_guard_protected_columns on public.users;
create trigger users_guard_protected_columns
    before update on public.users
    for each row execute function public.guard_user_protected_columns();

-- 관리자 판정 — 관리자 RPC 안에서만 부른다
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.users u
        where u.id = (select auth.uid()) and u.role = 'admin' and u.deleted_at is null);
$$;
revoke all on function public.is_admin() from public, anon, authenticated;

-- ─── 2. 공식 코트 · 별칭 ─────────────────────────────────────────────────────
create table public.courts (
    id uuid primary key default gen_random_uuid(),
    name text not null constraint courts_name_check check (char_length(btrim(name)) between 1 and 40),
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now()
);
comment on table public.courts is '공식 코트(0103) — 관리자가 합쳐 만든 정식 명칭. 읽기·쓰기 모두 RPC(정책 0개)';

-- 그 코트를 가리키는 키 전부. **공식 명칭 자신의 키도 한 줄**이라 「키 → 코트」가 조회 하나로 끝나고, 공식끼리 키가 겹칠 수 없다
create table public.court_aliases (
    key text primary key constraint court_aliases_key_check check (key <> ''),
    alias text not null,
    court_id uuid not null references public.courts(id) on delete cascade,
    created_at timestamptz not null default now()
);
create index court_aliases_court_id_idx on public.court_aliases (court_id);
comment on table public.court_aliases is '코트 별칭(0103) — key = court_key(alias). 공식 명칭 자신의 키도 들어 있다';

alter table public.courts enable row level security;
alter table public.court_aliases enable row level security;
revoke all on public.courts, public.court_aliases from anon, authenticated;

-- 저장할 코트명 — 별칭이면 공식 명칭 → (기존) 매칭에서 가장 많이 쓴 철자 → 적은 그대로
create or replace function public.canonical_court_name(p_name text)
returns text language sql stable set search_path = public as $$
    select coalesce(
        (select c.name from public.court_aliases a join public.courts c on c.id = a.court_id
         where a.key = public.court_key(p_name)),
        (select m.court_name from public.matches m
         where m.court_name is not null and public.court_key(m.court_name) = public.court_key(p_name)
         group by m.court_name order by count(*) desc, max(m.created_at) desc limit 1),
        nullif(btrim(p_name), ''))
    where nullif(btrim(p_name), '') is not null;
$$;

-- ─── 3. 찾기 — 공식 코트 먼저, 별칭으로도 걸린다 ───────────────────────────────
-- via = 공식 명칭보다 별칭이 더 잘 걸렸을 때 그 별칭(화면이 「‘양시숲’으로도 찾아요」로 이유를 보여 준다)
drop function public.search_court_names(text, integer);
create function public.search_court_names(p_query text default '', p_limit integer default 8)
returns table (name text, uses bigint, official boolean, via text)
language plpgsql stable security definer
set search_path = public
as $$
declare
    q text := public.court_key(regexp_replace(coalesce(p_query, ''), '[%_\\]', '', 'g'));
    v_sub text;
    v_jamo boolean;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    v_sub := '%' || array_to_string(regexp_split_to_array(q, ''), '%') || '%';
    v_jamo := q ~ '^[ㄱ-ㅎ]+$';
    return query
    with spell as (
        select m.court_name as n, public.court_key(m.court_name) as k, count(*) as c, max(m.created_at) as last
        from public.matches m
        where m.court_name is not null
        group by m.court_name
    ), grp as (
        select distinct on (s.k) s.k, s.n, sum(s.c) over (partition by s.k) as total
        from spell s
        order by s.k, s.c desc, s.last desc
    ), keys as (
        select c.id, c.name as n, a.alias as al, a.key = public.court_key(c.name) as self,
               case when q = '' or a.key like q || '%' then 0
                    when a.key like '%' || q || '%' then 1
                    when not v_jamo and a.key like v_sub then 2
                    when v_jamo and public.hangul_choseong(a.key) like '%' || q || '%' then 2
               end as r
        from public.courts c join public.court_aliases a on a.court_id = c.id
    ), off as (
        select k.id, k.n, min(k.r) as r,
               (array_agg(case when k.self then null else k.al end order by k.r, k.self desc, char_length(k.al)))[1] as best
        from keys k
        where k.r is not null
        group by k.id, k.n
    ), tot as (
        select a.court_id, sum(g.total) as total
        from public.court_aliases a join grp g on g.k = a.key
        group by a.court_id
    )
    select x.n, x.total, x.is_off, x.best
    from (
        select o.n, coalesce(t.total, 0)::bigint as total, true as is_off, o.best, o.r
        from off o left join tot t on t.court_id = o.id
        union all
        select g.n, g.total::bigint, false, null::text,
               case when q = '' or g.k like q || '%' then 0 when g.k like '%' || q || '%' then 1 else 2 end
        from grp g
        where not exists (select 1 from public.court_aliases a where a.key = g.k)
          and (q = ''
               or g.k like '%' || q || '%'
               or (not v_jamo and g.k like v_sub)
               or (v_jamo and public.hangul_choseong(g.k) like '%' || q || '%'))
    ) x
    order by x.is_off desc, x.r, x.total desc, x.n
    limit greatest(1, least(coalesce(p_limit, 8), 20));
end;
$$;
revoke execute on function public.search_court_names(text, integer) from public, anon;
grant execute on function public.search_court_names(text, integer) to authenticated;

-- ─── 4. 관리자 — 정리 ────────────────────────────────────────────────────────
-- 그 코트의 키로 적힌 매칭·경기의 코트명을 공식 명칭으로. updated_at은 건드리지 않는다(게임 보드의 충돌 기준이라)
create or replace function public.rewrite_court_records(p_court_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
    v_name text;
    v_matches integer;
    v_games integer;
begin
    select c.name into v_name from public.courts c where c.id = p_court_id;
    update public.matches m set court_name = v_name
    where m.court_name is not null and m.court_name <> v_name
      and public.court_key(m.court_name) in (select a.key from public.court_aliases a where a.court_id = p_court_id);
    get diagnostics v_matches = row_count;
    update public.games g set court_name = v_name
    where g.court_name is not null and g.court_name <> v_name
      and public.court_key(g.court_name) in (select a.key from public.court_aliases a where a.court_id = p_court_id);
    get diagnostics v_games = row_count;
    return jsonb_build_object('courtId', p_court_id, 'matches', v_matches, 'games', v_games);
end;
$$;
revoke all on function public.rewrite_court_records(uuid) from public, anon, authenticated;

-- 화면의 재료 — names = 공식에 안 묶인 이름(매칭 + 직접 기록, 키로 묶어 대표 철자·사용 수), courts = 공식 코트와 별칭
create or replace function public.admin_court_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
    v_out jsonb;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    if not public.is_admin() then raise exception 'not_admin'; end if;
    with used as (
        select m.court_name as n, m.created_at as at from public.matches m where m.court_name is not null
        union all
        select g.court_name, g.created_at from public.games g where g.court_name is not null and g.match_id is null
    ), spell as (
        select u.n, public.court_key(u.n) as k, count(*) as c, max(u.at) as last from used u group by u.n
    ), grp as (
        select distinct on (s.k) s.k, s.n, sum(s.c) over (partition by s.k) as total
        from spell s
        order by s.k, s.c desc, s.last desc
    )
    select jsonb_build_object(
        'names', coalesce((
            select jsonb_agg(jsonb_build_object('name', g.n, 'uses', g.total) order by g.total desc, g.n)
            from grp g
            where g.k <> '' and not exists (select 1 from public.court_aliases a where a.key = g.k)), '[]'::jsonb),
        'courts', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'uses', coalesce((select sum(g.total) from grp g join public.court_aliases a on a.key = g.k where a.court_id = c.id), 0),
                'aliases', coalesce((
                    select jsonb_agg(jsonb_build_object('key', a.key, 'alias', a.alias) order by a.alias)
                    from public.court_aliases a
                    where a.court_id = c.id and a.key <> public.court_key(c.name)), '[]'::jsonb)
            ) order by c.name)
            from public.courts c), '[]'::jsonb)
    ) into v_out;
    return v_out;
end;
$$;

-- 합치기 — 공식 명칭의 키가 이미 어느 공식 코트를 가리키면 그 코트를 쓰고(철자는 새 입력으로), 아니면 새 공식 코트.
-- 이름마다: 처음 보는 키 = 별칭으로 추가 · 다른 공식 코트의 **이름**이면 그 코트를 통째로 흡수 · 다른 코트의 별칭이면 그 줄만 옮긴다.
create or replace function public.merge_court_names(p_official text, p_names text[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
    v_uid uuid := auth.uid();
    v_name text := nullif(btrim(regexp_replace(coalesce(p_official, ''), '\s+', ' ', 'g')), '');
    v_key text;
    v_court uuid;
    v_other uuid;
    r record;
begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    if not public.is_admin() then raise exception 'not_admin'; end if;
    if v_name is null or char_length(v_name) > 40 then raise exception 'invalid_court'; end if;
    if cardinality(coalesce(p_names, '{}'::text[])) > 50 then raise exception 'too_many_names'; end if;
    v_key := public.court_key(v_name);

    select a.court_id into v_court from public.court_aliases a where a.key = v_key;
    if v_court is null then
        insert into public.courts (name, created_by) values (v_name, v_uid) returning id into v_court;
        insert into public.court_aliases (key, alias, court_id) values (v_key, v_name, v_court);
    else
        update public.courts set name = v_name where id = v_court;
        update public.court_aliases set alias = v_name where key = v_key;
    end if;

    for r in
        select distinct on (s.k) s.k, s.n
        from (
            select public.court_key(t.x) as k, btrim(t.x) as n, t.ord
            from unnest(coalesce(p_names, '{}'::text[])) with ordinality as t(x, ord)
        ) s
        where s.k <> '' and s.k <> v_key
        order by s.k, s.ord
    loop
        select a.court_id into v_other from public.court_aliases a where a.key = r.k;
        if v_other is null then
            insert into public.court_aliases (key, alias, court_id) values (r.k, r.n, v_court);
        elsif v_other <> v_court then
            if exists (select 1 from public.courts c where c.id = v_other and public.court_key(c.name) = r.k) then
                update public.court_aliases set court_id = v_court where court_id = v_other;
                delete from public.courts where id = v_other;
            else
                update public.court_aliases set court_id = v_court where key = r.k;
            end if;
        end if;
    end loop;
    return public.rewrite_court_records(v_court);
end;
$$;

-- 공식 명칭 바꾸기 — 옛 이름은 별칭으로 남고(그 이름으로 찾아도 걸린다) 기록의 코트명도 새 이름으로
create or replace function public.rename_court(p_court_id uuid, p_name text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
    v_name text := nullif(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
    v_key text;
    v_other uuid;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    if not public.is_admin() then raise exception 'not_admin'; end if;
    if v_name is null or char_length(v_name) > 40 then raise exception 'invalid_court'; end if;
    if not exists (select 1 from public.courts c where c.id = p_court_id) then raise exception 'court_not_found'; end if;
    v_key := public.court_key(v_name);
    select a.court_id into v_other from public.court_aliases a where a.key = v_key;
    if v_other is not null and v_other <> p_court_id then raise exception 'court_name_taken'; end if;
    insert into public.court_aliases (key, alias, court_id) values (v_key, v_name, p_court_id)
    on conflict (key) do update set alias = excluded.alias;
    update public.courts set name = v_name where id = p_court_id;
    return public.rewrite_court_records(p_court_id);
end;
$$;

-- 별칭 빼기 — 앞으로 그 이름을 공식 명칭으로 맞추지 않는다(이미 바뀐 기록은 그대로). 공식 명칭 자신의 키는 뺄 수 없다
create or replace function public.remove_court_alias(p_key text)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
    v_court uuid;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    if not public.is_admin() then raise exception 'not_admin'; end if;
    select a.court_id into v_court from public.court_aliases a where a.key = p_key;
    if v_court is null then raise exception 'alias_not_found'; end if;
    if exists (select 1 from public.courts c where c.id = v_court and public.court_key(c.name) = p_key) then
        raise exception 'alias_is_official';
    end if;
    delete from public.court_aliases where key = p_key;
end;
$$;

revoke execute on function public.admin_court_overview(), public.merge_court_names(text, text[]),
    public.rename_court(uuid, text), public.remove_court_alias(text) from public, anon;
grant execute on function public.admin_court_overview(), public.merge_court_names(text, text[]),
    public.rename_court(uuid, text), public.remove_court_alias(text) to authenticated;
