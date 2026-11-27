'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { MatchPasswordForm } from '@/components/matches/match-password-form'
import { CARD_BASE, TYPO } from '@/lib/design/tokens'
import { cn } from '@/lib/utils'

/**
 * 비공개 매칭 상세의 입구 — 링크·알림으로 바로 온 사람용(목록에서는 줄을 누르면 팝업이 같은 폼을 연다).
 * 비밀번호가 맞으면 바로 참가자가 되고 명단·게임이 열린다. 비밀번호는 호스트에게 받는다 — 초대 링크로 오면 이 화면 없이 들어온다.
 */
export function MatchPasswordGate({ matchId, hostName, closed = false }: { matchId: string; hostName: string; closed?: boolean }) {
    const router = useRouter()

    // 호스트가 모집을 마감했다 — 비밀번호를 받지 않는다(DB recruitment_closed)
    if (closed) {
        return (
            <div className={cn(CARD_BASE, 'space-y-2 p-5')}>
                <p className={cn(TYPO.h4, 'flex items-center gap-2')}><Lock className="size-4" aria-hidden />모집이 마감된 매칭입니다</p>
                <p className={cn(TYPO.body2Muted, 'break-keep')}>호스트({hostName}님)가 마감을 해제하면 다시 비밀번호로 들어올 수 있습니다.</p>
            </div>
        )
    }

    return (
        <div className={cn(CARD_BASE, 'space-y-3 p-5')}>
            <p className={cn(TYPO.h4, 'flex items-center gap-2')}><Lock className="size-4" aria-hidden />비공개 매칭입니다</p>
            <p className={cn(TYPO.body2Muted, 'break-keep')}>
                비밀번호를 넣으면 바로 참가하고 참가자 명단과 게임이 보입니다. 비밀번호는 호스트({hostName}님)에게 받으세요.
            </p>
            <MatchPasswordForm matchId={matchId} onJoined={() => router.refresh()} />
        </div>
    )
}
