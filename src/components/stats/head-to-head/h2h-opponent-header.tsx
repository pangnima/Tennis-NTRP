import { chipClass, CHIP_NEUTRAL } from '@/components/common/chip-class'
import { cn } from '@/lib/utils'
import { HAND_LABEL } from '@/lib/profile/signup-fields'
import { formatNtrp } from '@/lib/rating/display'

type Props = {
    name: string
    hand: 'right' | 'left' | null
    ntrp: number | null
}

/** 상단 상대 식별 헤더 — 이름 크게 + 주력손/NTRP pill */
export function H2HOpponentHeader({ name, hand, ntrp }: Props) {
    return (
        <div className="flex items-center flex-wrap gap-2 border-b border-border pb-3">
            <span className="text-body font-semibold text-foreground truncate">{name}</span>
            {hand && <span className={cn(chipClass(), CHIP_NEUTRAL)}>{HAND_LABEL[hand]}</span>}
            {ntrp != null && <span className={cn(chipClass(), CHIP_NEUTRAL)}>NTRP {formatNtrp(ntrp)}</span>}
        </div>
    )
}
