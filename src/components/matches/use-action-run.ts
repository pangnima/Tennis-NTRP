'use client'

import { useRouter } from 'next/navigation'

type ActionResult = { error: string | null }

/**
 * 매칭 화면의 버튼들이 같이 쓰는 실행기 — 액션이 실패하면 문구를 돌려주고, 성공하면 화면을 새로 그린다
 * (`after`가 있으면 그리로 이동). `ConfirmButton`의 onConfirm이 이 반환값(문구 | null)을 그대로 받는다.
 */
export function useActionRun() {
    const router = useRouter()
    return async (action: () => Promise<ActionResult>, after?: string): Promise<string | null> => {
        const result = await action()
        if (result.error) return result.error
        if (after) router.push(after)
        router.refresh()
        return null
    }
}
