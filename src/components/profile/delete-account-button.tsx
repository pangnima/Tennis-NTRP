'use client'

import { UserX } from 'lucide-react'

import { ConfirmButton } from '@/components/common/confirm-button'
import { deleteAccountAction } from '@/lib/actions/auth'
import { CARD_BASE } from '@/lib/design/tokens'

// 계정(서비스) 탈퇴 — soft delete(익명화). 되돌릴 수 없는 확인이라 ConfirmButton(docs/design-system.md §7).
// 성공하면 액션이 로그인 화면으로 redirect하므로 onConfirm은 실패 문구만 돌려준다.
export function DeleteAccountButton() {
    return (
        <div className={`${CARD_BASE} p-5 sm:p-6 border-destructive/30`}>
            <h2 className="text-h4 font-semibold text-destructive">회원 탈퇴</h2>
            <p className="text-caption text-muted-foreground mt-1">
                탈퇴하면 계정 정보가 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <ConfirmButton
                size="sm" variant="dangerFill" className="mt-3" tone="destructive"
                title="회원 탈퇴"
                description={<>정말 탈퇴하시겠습니까? 계정 정보가 삭제됩니다. 과거 경기 기록은 &quot;탈퇴한 회원&quot;으로 남으며, 이 작업은 되돌릴 수 없습니다.</>}
                confirmLabel="탈퇴하기"
                onConfirm={async () => (await deleteAccountAction())?.error ?? null}
            >
                <UserX className="size-3.5" />
                회원 탈퇴
            </ConfirmButton>
        </div>
    )
}
