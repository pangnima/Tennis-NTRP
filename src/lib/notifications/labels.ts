import { matchTitle } from '@/lib/matches/when'
import type { Notification, NotificationPayload, NotificationType } from '@/types'

/**
 * 알림 문구·링크의 단일 출처. DB는 사건(type)과 스냅샷(payload)만 남기고 사람이 읽는 말은 여기서 만든다 —
 * 문구를 DB에 넣으면 어휘가 바뀔 때 이미 쌓인 행이 낡는다.
 *
 * 알림은 "일어난 일"이다 — 누가 나를 불렀다, 들어왔다, 나갔다, 내 경기가 기록·수정·삭제됐다, 매칭이 확정·삭제됐다.
 * 기다리는 단계는 공개 매칭의 참가 신청 하나뿐이다(0099, 오너 결정) — 신청·승인·거절·내보내기 알림이 그것이다.
 * 독촉 알림은 없다.
 */
export type NotificationLabel = { title: string; body: string }

const who = (p: NotificationPayload, fallback = '참가자') => p.actorName ?? fallback

export const NOTIFICATION_LABEL: Record<NotificationType, (p: NotificationPayload) => NotificationLabel> = {
    match_added: (p) => ({ title: '매칭에 초대됐습니다', body: `${who(p, '호스트')}님이 매칭에 추가했습니다. 원하지 않으면 매칭에서 나갈 수 있습니다.` }),
    // 비회원이 명단에 올랐을 때도 같은 사건이다(0108) — 타입을 늘리지 않고 payload.guestName으로 가른다
    match_joined: (p) => ({
        title: '새 참가자',
        body: !p.guestName
            ? `${who(p)}님이 매칭에 참가했습니다.`
            : p.viaLink || !p.actorName
                ? `비회원 ${p.guestName}님이 초대 링크로 참가했습니다.`
                : `${p.actorName}님이 비회원 ${p.guestName}님을 참가자로 추가했습니다.`,
    }),
    // 초대 링크로 등록한 비회원의 본인 취소(0109)도 같은 사건
    match_left: (p) => ({ title: '참가자 나감', body: p.guestName ? `비회원 ${p.guestName}님이 참가를 취소했습니다.` : `${who(p)}님이 매칭에서 나갔습니다.` }),
    match_confirmed: (p) => ({
        title: '매칭 확정',
        body: p.auto
            ? '종료 후 7일이 지나 매칭이 자동으로 확정됐습니다. 기록은 더 이상 수정되지 않습니다.'
            : `${who(p, '호스트')}님이 매칭을 최종 확정했습니다. 기록은 더 이상 수정되지 않습니다.`,
    }),
    match_deleted: (p) => ({ title: '매칭 삭제', body: `${who(p, '호스트')}님이 매칭을 삭제했습니다.` }),
    match_applied: (p) => ({ title: '참가 신청', body: `${who(p, '회원')}님이 매칭 참가를 신청했습니다. 매칭 화면에서 승인하거나 거절해 주세요.` }),
    match_approved: (p) => ({ title: '참가 확정', body: `${who(p, '호스트')}님이 참가를 승인했습니다. 이제 매칭 참가자입니다.` }),
    // 신청이 취소된 이유(0101) — 호스트의 거절 · 모집 마감 · 비공개 전환. 타입을 늘리지 않고 payload.reason으로 가른다
    match_declined: (p) =>
        p.reason === 'closed'
            ? { title: '참가 신청 취소', body: `${who(p, '호스트')}님이 모집을 마감해 참가 신청이 취소됐습니다.` }
            : p.reason === 'private'
                ? { title: '참가 신청 취소', body: `${who(p, '호스트')}님이 매칭을 비공개로 바꿔 참가 신청이 취소됐습니다.` }
                : { title: '참가 신청 거절', body: `${who(p, '호스트')}님이 이번 매칭 참가 신청을 받지 않았습니다.` },
    match_removed: (p) => ({ title: '매칭에서 빠졌습니다', body: `${who(p, '호스트')}님이 매칭 명단에서 내보냈습니다. 이미 기록된 경기는 그대로 남습니다.` }),
    match_tomorrow: (p) => ({ title: '내일 매칭', body: p.playedTime ? `내일 ${p.playedTime} 매칭이 있습니다.` : '내일 매칭이 있습니다.' }),
    game_recorded: (p) => ({ title: '경기가 기록됐습니다', body: `${who(p)}님이 함께 뛴 경기를 기록했습니다. 스코어가 틀리면 직접 고칠 수 있습니다.` }),
    game_updated: (p) => ({ title: '경기가 수정됐습니다', body: `${who(p)}님이 경기 기록을 고쳤습니다. 확인해 주세요.` }),
    game_deleted: (p) => ({ title: '경기가 삭제됐습니다', body: `${who(p)}님이 경기 기록을 삭제했습니다.` }),
}

export function notificationLabel(n: Pick<Notification, 'type' | 'payload'>): NotificationLabel {
    // 모르는 타입(배포 순서가 어긋난 순간의 새 타입)은 화면을 깨지 않고 빈 문구로 둔다
    return NOTIFICATION_LABEL[n.type]?.(n.payload) ?? { title: '알림', body: '' }
}

/** 매칭 한 줄(12.05(토) 10:00~12:00 · 코트 · 남복) — 스냅샷에 날짜·종목이 있을 때만 */
export function notificationTitleLine(p: NotificationPayload): string | null {
    if (!p.playedAt || !p.matchType) return null
    return matchTitle({
        playedAt: p.playedAt,
        playedTime: p.playedTime,
        durationMinutes: p.durationMinutes ?? 0,
        courtName: p.courtName,
        matchType: p.matchType,
    })
}

/** 눌렀을 때 갈 곳 — 매칭이 있으면 그 매칭, 없으면(직접 기록·삭제된 매칭) 내 경기 */
export function notificationHref(n: Pick<Notification, 'matchId'>): string {
    return n.matchId ? `/matches/${n.matchId}` : '/games'
}
