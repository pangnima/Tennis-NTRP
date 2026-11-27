-- 0110 회원의 연락처·아이디를 본인만 읽게 한다
--
-- 왜: `users_select`는 로그인 회원 전원에게 열려 있고(이름·닉네임·NTRP를 서로 봐야 한다) 컬럼 권한은
-- 테이블 통째였다. 그래서 로그인한 회원이면 API로 남의 email·phone·login_id까지 읽을 수 있었다.
-- 화면은 이 셋을 본인 것만 쓰는데(내 정보·프로필 완성), 막는 장치가 없었다.
--
-- 결정:
--   1. 행 정책은 그대로 두고 **컬럼 권한**으로 가른다 — 테이블 SELECT를 걷고 공개 컬럼만 다시 준다.
--      ⚠ 앞으로 users에 컬럼을 더하면 공개 컬럼일 때 여기처럼 `grant select (…)`를 따로 줘야 읽힌다.
--   2. 본인 것은 RPC `get_my_account()` 하나로 읽는다(email·phone·login_id).
--   3. anon은 users를 직접 읽을 일이 없다(가입·로그인·초대 링크는 모두 security definer RPC) — 통째로 걷는다.
--   4. 보호 칸 트리거(0103)에 email·deleted_at·is_guest를 더한다 — 0103이 남겨 둔 것.
--      email은 탈퇴 익명화 때만, deleted_at은 한 번 찍히면 되돌릴 수 없고, is_guest는 바꿀 수 없다.

-- ─── 1. 컬럼 권한 ────────────────────────────────────────────────────────────
revoke select on public.users from anon, authenticated;

grant select (
    id, name, nickname, role, profile_image, gender, dominant_hand,
    ntrp, personal_ntrp, tennis_start_date, racket_brand, racket_model,
    stats_hidden, is_guest, deleted_at, created_at
) on public.users to authenticated;

comment on table public.users is
    '회원. email·phone·login_id는 컬럼 권한으로 가려져 있다(0110) — 본인 것은 get_my_account()로 읽는다';

-- ─── 2. 본인 계정 정보 ───────────────────────────────────────────────────────
create or replace function public.get_my_account()
returns table (email text, phone text, login_id text)
language sql stable security definer set search_path = public as $$
    select u.email, u.phone, u.login_id
    from public.users u
    where u.id = (select auth.uid());
$$;
revoke execute on function public.get_my_account() from public, anon;
grant execute on function public.get_my_account() to authenticated;

-- ─── 3. 보호 칸 ──────────────────────────────────────────────────────────────
create or replace function public.guard_user_protected_columns()
returns trigger language plpgsql set search_path = public as $$
begin
    if current_user not in ('authenticated', 'anon') then return new; end if;
    if new.role is distinct from old.role then raise exception 'protected_column'; end if;
    if new.is_guest is distinct from old.is_guest then raise exception 'protected_column'; end if;
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
