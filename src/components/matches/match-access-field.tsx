'use client'

import { useState } from 'react'
import { FIELD_LABEL, fieldClass } from '@/components/common/field-class'
import { Eye, EyeOff } from 'lucide-react'

import { ActionButton } from '@/components/common/action-button'
import { FieldToggle } from '@/components/common/field-toggle'
import { TYPO } from '@/lib/design/tokens'
import { MATCH_PASSWORD_MAX, validateMatchPassword } from '@/lib/matches/password'
import { cn } from '@/lib/utils'

export type MatchAccess = 'public' | 'private'

const OPTIONS: { value: MatchAccess; label: string }[] = [
    { value: 'public', label: '공개' },
    { value: 'private', label: '비공개' },
]
const HINT: Record<MatchAccess, string> = {
    public: '누구나 목록에서 보고 참가를 신청합니다. 호스트가 승인한 회원만 참가자가 됩니다.',
    private: '목록에 자물쇠로 보이고, 비밀번호를 아는 회원만 바로 들어옵니다. 초대 링크로 와도 들어옵니다.',
}

type Props = {
    access: MatchAccess
    onAccessChange: (v: MatchAccess) => void
    password: string
    onPasswordChange: (v: string) => void
    /** 수정 화면에서 이미 비공개인 매칭 — 비밀번호는 바꿀 때만 적는다(비우면 지금 것을 그대로) */
    passwordOptional?: boolean
}

/** 공개/비공개 선택 + 비공개 매칭의 비밀번호 — 매칭 만들기·수정의 「누구와」 카드 맨 위 */
export function MatchAccessField({ access, onAccessChange, password, onPasswordChange, passwordOptional = false }: Props) {
    const [shown, setShown] = useState(false)
    const invalid = password ? validateMatchPassword(password) : null

    return (
        <div className="space-y-3">
            <FieldToggle label="공개 범위" required options={OPTIONS} value={access} onChange={onAccessChange} />
            <p className={cn(TYPO.body2Muted, 'break-keep')}>{HINT[access]}</p>
            {access === 'private' && (
                <div>
                    <label htmlFor="match-password" className={FIELD_LABEL}>{passwordOptional ? '새 입장 비밀번호 (선택)' : '입장 비밀번호 *'}</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="match-password"
                            type={shown ? 'text' : 'password'}
                            autoComplete="new-password"
                            maxLength={MATCH_PASSWORD_MAX}
                            placeholder="4~20자, 공백 없이"
                            value={password}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            className={fieldClass()}
                        />
                        <ActionButton size="lg" variant="ghost" square aria-label={shown ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShown((v) => !v)}>
                            {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                        </ActionButton>
                    </div>
                    <p className={cn(TYPO.caption, 'mt-1.5 break-keep', invalid && 'text-destructive')}>
                        {invalid ?? (passwordOptional
                            ? '비워 두면 지금 비밀번호를 그대로 씁니다. 바꾸면 새 비밀번호를 참가할 회원에게 알려 주세요.'
                            : '참가할 회원에게 직접 알려 주세요. 만든 뒤에는 다시 볼 수 없고 바꿀 수만 있습니다.')}
                    </p>
                </div>
            )}
        </div>
    )
}
