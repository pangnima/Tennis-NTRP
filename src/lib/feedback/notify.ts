import { toast } from 'sonner'

/**
 * 토스트는 이것으로만 부른다(docs/design-system.md §8) — 문구 톤·시간·위치를 한 곳에서 정한다.
 *
 * 쓰는 때: **화면이 그대로인 성공**(복사·저장·초대·승인·삭제). 오류는 토스트로 알리지 않는다 —
 * 사라지면 다시 읽을 수 없어서, 그 자리의 한 줄(`fieldMessageClass('destructive')`)이나 `Notice`로 말한다.
 * 페이지가 바뀌는 성공(저장 → 상세로)도 토스트가 없다 — 바뀐 화면이 곧 결과다.
 */
export const notify = {
    success(message: string) {
        toast.success(message)
    },
    /** 성공도 오류도 아닌 알림(「이미 참가한 매칭입니다」) */
    info(message: string) {
        toast(message)
    },
}
