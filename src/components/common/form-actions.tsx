import type { ReactNode } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { FORM_ACTION_ROW, FORM_CANCEL, FORM_SUBMIT } from '@/lib/dashboard/tokens'

type Props = {
    /** 상황별 문구만 다르다 — '경기 저장' · '매칭 만들기' · 'N명 초대하기' … */
    submitLabel: string
    onCancel: () => void
    cancelLabel?: string
    /** 없으면 type="submit" — 폼 밖(팝업 패널)에서는 이 핸들러를 준다 */
    onSubmit?: () => void
    isPending?: boolean
    pendingLabel?: string
    disabled?: boolean
    /** 왼쪽에 붙는 보조 액션 — 저장/취소 축이 아닌 버튼 */
    secondary?: ReactNode
}

/**
 * 폼·팝업 하단의 액션 줄 — **저장(옐로우 `solid`) 왼쪽 · 취소(`outline`) 오른쪽**, 전체는 우측 정렬.
 * 둘 다 버튼 단계 **lg(44px)** 다 — 화면의 주 행동이고 모바일에서 손가락으로 누른다.
 * 조립을 여기 하나로 모아 호출부는 라벨과 핸들러만 고른다. 파괴적 확인(탈퇴·삭제)은 여기 오지 않는다 —
 * 되돌릴 수 없는 행동은 색으로 위험을 말해야 한다(`ConfirmButton`·`dangerFill`).
 */
export function FormActions({
    submitLabel, onCancel, cancelLabel = '취소', onSubmit,
    isPending = false, pendingLabel = '저장 중...', disabled = false, secondary,
}: Props) {
    return (
        <div className={FORM_ACTION_ROW}>
            {secondary && <div className="lg:mr-auto">{secondary}</div>}
            <ActionButton
                type={onSubmit ? 'button' : 'submit'}
                variant="solid"
                size="lg"
                onClick={onSubmit}
                disabled={disabled || isPending}
                className={FORM_SUBMIT}
            >
                {isPending ? pendingLabel : submitLabel}
            </ActionButton>
            <ActionButton size="lg" onClick={onCancel} disabled={isPending} className={FORM_CANCEL}>
                {cancelLabel}
            </ActionButton>
        </div>
    )
}
