'use client'

import { Field } from '@/components/common/field'
import { fieldClass } from '@/components/common/field-class'
import { CAPACITY_MAX, CAPACITY_MIN, formatAmountInput, formatWon, parseAmount, perPersonFee } from '@/lib/matches/fee'

type Props = {
    /** 코트 비용 총액 — 쉼표가 들어간 글자(「40,000」) */
    fee: string
    onFeeChange: (v: string) => void
    /** 정원(호스트 포함) */
    capacity: string
    onCapacityChange: (v: string) => void
}

const UNIT = 'pointer-events-none absolute inset-y-0 right-3 flex items-center text-body text-muted-foreground'

/**
 * 코트 비용(3칸, 선택) │ 인원(1칸) — 바로 위 코트명│코트 번호 줄과 같은 열에 선다(0104).
 * 비용은 코트 **총액**을 적고 아래에 「1인당 약 N원」을 계산해 보여 준다. **비우면 주의 한 줄**(만들기는 된다 —
 * 신청하는 사람이 얼마를 내는지 모르게 된다는 것만 알린다). 인원은 종목의 기본값(단식 2 · 복식 4)에서 고친다.
 */
export function MatchFeeFields({ fee, onFeeChange, capacity, onCapacityChange }: Props) {
    const amount = parseAmount(fee)
    const people = parseAmount(capacity)
    const per = amount != null && people != null && people >= CAPACITY_MIN ? perPersonFee(amount, people) : null
    const message = amount == null
        ? '코트 비용을 적지 않았어요 — 신청하는 사람이 얼마를 내는지 알 수 없습니다.'
        : amount === 0 ? '무료 코트로 안내합니다.' : per != null ? `1인당 약 ${formatWon(per)} (${people}명 기준)` : undefined

    return (
        <div className="grid grid-cols-4 items-start gap-x-1.5">
            <Field id="court-fee" label="코트 비용" optional className="col-span-3" message={message} tone={amount == null ? 'warning' : 'muted'}>
                <div className="relative">
                    <input
                        id="court-fee" inputMode="numeric" autoComplete="off" value={fee} placeholder="코트 대여료 총액 — 예: 40,000"
                        onChange={(e) => onFeeChange(formatAmountInput(e.target.value))} className={fieldClass({ className: 'pr-9' })}
                    />
                    <span className={UNIT} aria-hidden>원</span>
                </div>
            </Field>
            <Field id="capacity" label="인원" required>
                <div className="relative">
                    <input
                        id="capacity" inputMode="numeric" autoComplete="off" value={capacity} maxLength={2} aria-describedby="capacity-help"
                        onChange={(e) => onCapacityChange(e.target.value.replace(/\D/g, ''))} className={fieldClass({ className: 'pr-9' })}
                    />
                    <span className={UNIT} aria-hidden>명</span>
                </div>
                <span id="capacity-help" className="sr-only">호스트를 포함한 정원, {CAPACITY_MIN}명에서 {CAPACITY_MAX}명</span>
            </Field>
        </div>
    )
}
