'use client'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import { MatchApplyButton } from '@/components/matches/match-apply-button'
import { useActionRun } from '@/components/matches/use-action-run'
import { deleteMatchAction, leaveMatchAction, removeMatchMemberAction, setMatchConfirmedAction } from '@/lib/actions/matches'

/**
 * 매칭 상세의 행동 — **버튼은 자기가 다루는 것 옆에 놓인다**.
 *   · 제목 오른쪽(`MatchHeaderActions`, 36px): 매칭 자체 — 호스트의 [수정] + [최종 확정]/[확정 취소]/[매칭 삭제] ·
 *     공개 매칭 비참가자의 [참가 신청]/[신청 취소](비공개 매칭은 본문의 비밀번호 카드가 입구다)
 *   · 「참가자」 제목 옆(`MatchHostTools`, 32px): 호스트만 — [모집 마감]/[마감 해제] · [회원 초대] · [초대 링크 복사] · [비밀번호 변경]
 *   · 참가자 표의 줄(32px): 내 줄 [나가기] · 호스트가 보는 남의 줄 [내보내기]
 * 한 줄에 놓인 버튼은 높이가 같다. 위계는 모양(노란 채움 / 테두리 / 빨강)으로만 만든다.
 */

/** scoredCount = 스코어가 들어간 게임 수 — 예정 게임은 확정·삭제 판정에서 세지 않는다(DB와 같은 눈높이) */
type HeaderProps = {
    matchId: string
    isHost: boolean
    isMember: boolean
    isListed: boolean
    confirmed: boolean
    scoredCount: number
    /** 내가 이 매칭에 참가 신청을 해 두었나(공개 매칭 비참가자) */
    hasApplied: boolean
    /** 모집이 닫혔다 — 호스트의 모집 마감 · 경기 시작(`isRecruitmentClosed`) */
    applicationClosed: boolean
}

/**
 * 제목 오른쪽 — 목록 화면의 [+ 매칭 만들기]와 같은 자리, 같은 크기(md).
 * 호스트의 관리 버튼은 **하나만** 보인다: 스코어 있는 게임이 없으면 [매칭 삭제], 있으면 [최종 확정], 확정 뒤에는 [확정 취소].
 */
export function MatchHeaderActions({ matchId, isHost, isMember, isListed, confirmed, scoredCount, hasApplied, applicationClosed }: HeaderProps) {
    const run = useActionRun()

    if (!isMember) {
        if (confirmed || !isListed) return null
        return <MatchApplyButton matchId={matchId} hasApplied={hasApplied} closed={applicationClosed} />
    }
    if (!isHost) return null
    if (confirmed) {
        return (
            <ConfirmButton
                size="md" title="확정을 취소할까요?" confirmLabel="확정 취소"
                description="취소하면 참가자가 다시 게임을 기록하고 고칠 수 있습니다."
                onConfirm={() => run(() => setMatchConfirmedAction(matchId, false))}
            >
                확정 취소
            </ConfirmButton>
        )
    }
    // 확정 전 호스트: [수정](매칭 정보 수정 화면) + 관리 버튼 하나
    return (
        <div className="flex flex-wrap items-center gap-2">
            <ActionButton href={`/matches/${matchId}/edit`} size="md">수정</ActionButton>
            {scoredCount > 0 ? (
                <ConfirmButton
                    size="md" title="매칭을 최종 확정할까요?" confirmLabel="최종 확정"
                    description="확정하면 아무도 게임을 추가하거나 스코어를 고칠 수 없습니다. 스코어가 없는 예정 게임과 처리하지 않은 참가 신청은 지워집니다. 잘못된 기록이 나오면 확정을 취소할 수 있습니다."
                    onConfirm={() => run(() => setMatchConfirmedAction(matchId, true))}
                >
                    최종 확정
                </ConfirmButton>
            ) : (
                <ConfirmButton
                    size="md" variant="dangerFill" tone="destructive" title="매칭을 삭제할까요?" confirmLabel="삭제"
                    description="참가자에게 삭제 알림이 가고, 짜 둔 대진과 참가 신청도 함께 지워집니다. 되돌릴 수 없습니다."
                    onConfirm={() => run(() => deleteMatchAction(matchId), '/matches')}
                >
                    매칭 삭제
                </ConfirmButton>
            )}
        </div>
    )
}

/** 참가자 표의 내 줄 — 호스트가 아닌 참가자의 [나가기]. 이미 기록된 게임은 남는다 */
export function MatchLeaveButton({ matchId }: { matchId: string }) {
    const run = useActionRun()
    return (
        <ConfirmButton
            size="sm" variant="danger" tone="destructive" title="매칭에서 나갈까요?" confirmLabel="나가기"
            description="이미 기록된 내 게임은 그대로 남습니다."
            onConfirm={() => run(() => leaveMatchAction(matchId), '/matches')}
        >
            나가기
        </ConfirmButton>
    )
}

/** 호스트가 보는 남의 줄 — [내보내기]. 이미 기록된 게임은 그 사람의 전적이라 남는다 */
export function MatchRemoveButton({ matchId, userId, name }: { matchId: string; userId: string; name: string }) {
    const run = useActionRun()
    return (
        <ConfirmButton
            size="sm" variant="danger" tone="destructive" title={`${name}님을 내보낼까요?`} confirmLabel="내보내기"
            description="매칭 명단에서 빠지고 알림이 갑니다. 이미 기록된 게임은 그대로 남습니다."
            onConfirm={() => run(() => removeMatchMemberAction(matchId, userId))}
        >
            내보내기
        </ConfirmButton>
    )
}
