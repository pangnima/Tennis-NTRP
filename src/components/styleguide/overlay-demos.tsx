'use client'

import { useState } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { AppDialog } from '@/components/common/app-dialog'
import { ConfirmButton } from '@/components/common/confirm-button'
import { fieldClass, fieldMessageClass } from '@/components/common/field-class'
import { FormActions } from '@/components/common/form-actions'
import { notify } from '@/lib/feedback/notify'

/** 팝업 세 가지 중 둘(확인 · 짧은 입력)과 토스트를 실제로 열어 본다 — 견본이라 아무것도 저장하지 않는다 */
export function OverlayDemos() {
    const [open, setOpen] = useState(false)
    return (
        <div className="flex flex-wrap items-center gap-2">
            <ConfirmButton
                size="sm" title="이 게임을 삭제할까요?" description="견본입니다 — 눌러도 아무것도 지워지지 않습니다."
                confirmLabel="삭제" tone="destructive" onConfirm={async () => null}
            >
                확인 팝업
            </ConfirmButton>
            <ActionButton size="sm" onClick={() => setOpen(true)}>짧은 입력 팝업</ActionButton>
            <ActionButton size="sm" onClick={() => notify.success('저장했습니다')}>토스트</ActionButton>
            <AppDialog
                open={open} onOpenChange={setOpen} title="비밀번호 변경" description="견본입니다 — 저장하지 않습니다."
                footer={<FormActions submitLabel="바꾸기" onSubmit={() => setOpen(false)} onCancel={() => setOpen(false)} />}
            >
                <input aria-label="새 비밀번호" placeholder="4~20자" className={fieldClass()} />
                <p className={fieldMessageClass()}>칸 아래 한 줄 — 도움말은 보조색, 오류는 위험색</p>
            </AppDialog>
        </div>
    )
}
