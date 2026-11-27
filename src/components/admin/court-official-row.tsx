'use client'

import { chipClass, CHIP_NEUTRAL } from '@/components/common/chip-class'
import { useState, useTransition } from 'react'

import { ActionButton } from '@/components/common/action-button'
import { ConfirmButton } from '@/components/common/confirm-button'
import { fieldClass, fieldMessageClass } from '@/components/common/field-class'
import { removeCourtAliasAction, renameCourtAction } from '@/lib/actions/admin-courts'
import { TYPO } from '@/lib/design/tokens'
import { COURT_NAME_MAX } from '@/lib/matches/court'
import type { OfficialCourt } from '@/lib/matches/court-clusters'
import { cn } from '@/lib/utils'

/**
 * 공식 코트 한 줄(0103) — 이름 · 쓰인 횟수 · [이름 바꾸기](그 자리에서 칸이 열린다) / 아래에 별칭 칩(각 [빼기]).
 * 이름을 바꾸면 옛 이름은 별칭으로 남아 그 이름으로 찾아도 걸린다. 별칭을 빼면 앞으로 그 이름을 공식 명칭으로 맞추지 않는다.
 */
export function CourtOfficialRow({ court }: { court: OfficialCourt }) {
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState(court.name)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    function save() {
        setError(null)
        startTransition(async () => {
            const result = await renameCourtAction(court.id, name)
            if (result.error) return setError(result.error)
            setEditing(false)
        })
    }

    return (
        <div className="space-y-2 p-4">
            {editing ? (
                <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); save() }}>
                    <input
                        value={name} maxLength={COURT_NAME_MAX} aria-label="공식 명칭" autoComplete="off"
                        onChange={(e) => setName(e.target.value)} className={fieldClass({ size: 'md', className: 'flex-1' })}
                    />
                    <ActionButton type="submit" variant="solid" disabled={isPending || !name.trim()}>{isPending ? '저장 중...' : '저장'}</ActionButton>
                    <ActionButton disabled={isPending} onClick={() => { setEditing(false); setName(court.name); setError(null) }}>취소</ActionButton>
                </form>
            ) : (
                <div className="flex items-center gap-3">
                    <p className={cn(TYPO.bodyStrong, 'min-w-0 flex-1 break-keep')}>
                        {court.name}
                        <span className="ml-2 font-normal"><span className="text-muted-foreground">사용 </span><span className="tabular-nums">{court.uses}</span></span>
                    </p>
                    <ActionButton size="sm" onClick={() => setEditing(true)}>이름 바꾸기</ActionButton>
                </div>
            )}
            {error && <p role="alert" className={fieldMessageClass('destructive')}>{error}</p>}
            {court.aliases.length > 0 && (
                <ul className="flex flex-wrap items-center gap-1.5">
                    {court.aliases.map((a) => (
                        <li key={a.key} className={cn(chipClass({ size: 'sm' }), CHIP_NEUTRAL, 'pr-0.5')}>
                            {a.alias}
                            <ConfirmButton
                                size="xs" variant="ghost" ariaLabel={`${a.alias} 빼기`}
                                title={`‘${a.alias}’ 빼기`}
                                description="앞으로 이 이름으로 적은 코트명은 공식 명칭으로 맞추지 않습니다. 이미 바뀐 기록은 그대로 둡니다."
                                confirmLabel="빼기"
                                onConfirm={async () => (await removeCourtAliasAction(a.key)).error}
                            >
                                빼기
                            </ConfirmButton>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
