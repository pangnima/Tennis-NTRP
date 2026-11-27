-- 20261125235654 0097_drop_legacy_schema
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-11-26
-- 0097_drop_legacy_schema.sql
-- Week 72 — 재구축 2/2: 옛 구조 철거. 0096의 매칭·게임 모델로 앱이 전부 옮겨 간 뒤에 적용한다(앱 배포 → 이 마이그레이션).
--
-- 지우는 것: 개인 경기·요청·협상·로테이션·매칭 룸(12테이블), 클럽·대진표·클럽 레이팅·AI 코칭 캐시(13테이블 + 뷰 1),
--           그 위의 함수 99개·트리거·정책, 예약 잡 `notification_jobs`(독촉·자동 확정 — 기다리는 단계가 사라졌다).
-- 남기는 것: users(+handle_new_user), 가입·로그인 RPC와 시도 제한, notifications(행은 새 타입만), 0096 전부.
--
-- ⚠ 데이터가 사라진다 — 오너 결정(2026-11-25): 회원 계정·프로필만 유지하고 매칭·경기 기록·알림은 초기화한다.
--   되돌릴 수단은 적용 전 덤프와 git 태그 `pre-rebuild-2026-11`(스키마 정의)뿐이다.

-- ─── 1. 예약 잡 ──────────────────────────────────────────────────────────────
select cron.unschedule(jobid) from cron.job where jobname = 'notification_jobs';

-- ─── 2. 테이블 행 타입을 인자로 받는 함수 — 테이블보다 먼저 ───────────────────
drop function if exists public.room_start_at(public.match_rooms);
drop function if exists public.room_end_at(public.match_rooms);
drop function if exists public.derive_public_ntrp(public.users);

-- ─── 3. 테이블·뷰(cascade가 트리거·정책·FK를 함께 걷는다) ─────────────────────
drop view if exists public.user_match_participations;

drop table if exists
    public.match_result_negotiations,
    public.match_request_participants,
    public.personal_match_participants,
    public.rotation_session_participants,
    public.match_room_guests,
    public.match_room_members,
    public.match_room_secrets,
    public.personal_matches,
    public.match_requests,
    public.rotation_sessions,
    public.match_rooms,
    public.ai_coaching_cache,
    public.club_rating_history,
    public.club_player_ratings,
    public.match_game_participants,
    public.match_game_matches,
    public.match_game_time_slots,
    public.match_game_rounds,
    public.match_game_courts,
    public.match_games,
    public.club_invites,
    public.club_members,
    public.clubs
    cascade;

-- ─── 4. 알림 — 옛 타입의 행·컬럼을 걷고 CHECK를 새 아홉 가지로 ─────────────────
delete from public.notifications
where type not in ('match_added', 'match_joined', 'match_left', 'match_confirmed', 'match_deleted', 'match_tomorrow',
                   'game_recorded', 'game_updated', 'game_deleted');
drop index if exists public.notifications_room_idx;
drop index if exists public.notifications_request_idx;
alter table public.notifications drop column if exists room_id, drop column if exists request_id;
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
    'match_added', 'match_joined', 'match_left', 'match_confirmed', 'match_deleted', 'match_tomorrow',
    'game_recorded', 'game_updated', 'game_deleted'
));

-- ─── 5. 함수 — 옛 구조의 RPC·헬퍼·트리거 함수 전부 ────────────────────────────
drop function if exists
    public.accept_match_request(uuid),
    public.add_guest_player(uuid, text, text),
    public.add_guest_player(uuid, text),
    public.add_room_guest(uuid, text, text, numeric, text),
    public.add_rotation_session_player(uuid, uuid),
    public.apply_club_rating_snapshot(uuid, jsonb),
    public.backfill_rotation_perspectives(uuid, uuid),
    public.cleanup_match_room_on_personal_match_delete(),
    public.cleanup_match_room_on_request_close(),
    public.close_match_room(uuid),
    public.close_rotation_room(uuid),
    public.confirm_match_result(uuid),
    public.copy_personal_match_perspective(uuid, uuid, jsonb, jsonb, jsonb, jsonb),
    public.create_match_game(uuid, text, date, jsonb, jsonb, jsonb),
    public.create_match_request(uuid, date, time without time zone, text, text, text, jsonb, jsonb, jsonb, text),
    public.create_match_room(text, uuid, text, integer, integer, boolean),
    public.create_room_game(uuid, uuid, jsonb, jsonb, uuid),
    public.create_room_lineup(uuid, jsonb, integer),
    public.default_participation_status(),
    public.default_request_opponent_response(),
    public.dispute_match_result(uuid, text),
    public.drop_empty_rotation_sessions_on_room_delete(),
    public.enter_match_room(uuid, text),
    public.finalize_rotation_session(uuid, jsonb, integer),
    public.get_club_activity_ranking(uuid, timestamp with time zone),
    public.get_club_member_counts(uuid[]),
    public.get_club_win_rate_ranking(uuid, integer),
    public.get_invite_preview(uuid),
    public.get_match_room_detail(uuid),
    public.get_public_personal_matches(uuid),
    public.get_room_lineup_requests(uuid),
    public.get_rotation_session_games(uuid),
    public.get_user_doubles_court_stats(uuid, uuid),
    public.get_user_head_to_head(uuid, uuid),
    public.get_user_match_stats_v2(uuid, uuid),
    public.get_user_partner_stats(uuid, uuid),
    public.handle_new_club(),
    public.insert_room_lineup_games(uuid, jsonb),
    public.invert_set_scores(jsonb),
    public.invite_room_member_from_participant(),
    public.invite_room_members(uuid, uuid[]),
    public.is_club_approved_member(uuid, uuid),
    public.is_club_owner(uuid, uuid),
    public.is_club_owner_or_officer(uuid, uuid),
    public.is_request_party(uuid),
    public.is_room_participant(uuid),
    public.is_rotation_session_party(uuid),
    public.is_rotation_session_seat(uuid),
    public.join_club_via_invite(uuid),
    public.join_match_room_as_player(uuid, uuid),
    public.keep_removed_room_member(),
    public.kick_room_member(uuid, uuid),
    public.leave_match_room(uuid),
    public.mark_request_opponent_response(uuid, boolean),
    public.mark_request_participant_response(uuid, boolean),
    public.materialize_accepted_request(uuid, uuid, smallint),
    public.maybe_materialize_request(uuid),
    public.normalize_result_confirmations(),
    public.normalize_set_scores(jsonb, boolean),
    public.normalize_to_requester_perspective(jsonb, text),
    public.notify_result_event(),
    public.notify_room_closed(),
    public.notify_room_deleted(),
    public.notify_room_member_event(),
    public.notify_users(uuid[], text, uuid, uuid, uuid, jsonb, text),
    public.propose_match_result(uuid, jsonb),
    public.recompute_match_room_settled(uuid),
    public.reject_match_request(uuid),
    public.remove_room_guest(uuid),
    public.remove_rotation_session_player(uuid, uuid),
    public.reopen_match_result(uuid, text),
    public.reopen_match_room(uuid),
    public.replace_room_lineup(uuid, uuid[], jsonb),
    public.request_result_seats(uuid),
    public.request_seat_of(uuid, uuid),
    public.resolve_room_player(uuid, jsonb),
    public.resolve_rotation_player(jsonb),
    public.respond_request_participation(uuid, boolean),
    public.respond_room_invite(uuid, boolean),
    public.respond_rotation_participation(uuid, boolean),
    public.respond_rotation_plan(uuid, boolean),
    public.room_game_tallies(uuid[]),
    public.room_joined_user_ids(uuid),
    public.room_member_has_games(uuid, uuid),
    public.room_reachable_user_ids(uuid),
    public.room_snapshot(uuid),
    public.rotation_seats_accepted(uuid, uuid[]),
    public.run_notification_jobs(),
    public.settle_match_result(uuid),
    public.stamp_result_disputed_at(),
    public.swap_opponent_perspective(jsonb),
    public.swap_partner_perspective(jsonb),
    public.sync_club_member_count(),
    public.sync_match_room_from_personal_match(),
    public.sync_match_room_from_request(),
    public.sync_rotation_session_participants(),
    public.update_match_game(uuid, text, date, jsonb, jsonb, jsonb),
    public.update_match_room_password(uuid, text),
    public.validate_set_scores(jsonb)
    cascade;

-- ─── 6. 레이팅 캐시 — 근거(옛 경기)가 사라졌으니 비운다. 새 게임이 쌓이면 앱이 다시 채운다 ──
update public.users u set personal_ntrp = null
where personal_ntrp is not null
  and not exists (select 1 from public.game_players p where p.user_id = u.id);
