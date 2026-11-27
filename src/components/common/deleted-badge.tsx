import { chipClass, CHIP_NEUTRAL } from '@/components/common/chip-class'
import { cn } from '@/lib/utils'

/**
 * 탈퇴한 회원 표시(어휘표 「탈퇴 회원」) — 어디서나 같은 한 단어.
 * 이름은 스냅샷이 있는 자리(게임의 선수)에서는 원래 이름, 없는 자리(명단·소유자·프로필)에서는
 * 익명화된 `탈퇴한 회원`이 보이지만 배지는 둘 다 이것이다(F-25).
 */
export function DeletedBadge({ className }: { className?: string }) {
    return (
        <span className={cn(chipClass(), CHIP_NEUTRAL, className)}>
            탈퇴
        </span>
    )
}
