'use client'

import { MemberMultiPicker } from '@/components/common/member-search/member-multi-picker'
import { FIELD_LABEL } from '@/components/common/field-class'
import type { MemberPick } from '@/components/common/member-search/member-pick-chips'

/** 매칭 만들기의 회원 초대(선택) — 호스트가 부른 회원은 신청 없이 바로 참가자. 수정 화면에는 없다(매칭 화면의 [회원 초대]) */
export function MatchInviteField({ viewerId, picks, onChange }: { viewerId: string; picks: MemberPick[]; onChange: (v: MemberPick[]) => void }) {
    return (
        <div>
            <p className={FIELD_LABEL}>회원 초대 (선택)</p>
            <MemberMultiPicker selfUserId={viewerId} picks={picks} onChange={onChange} max={50} picksLabel="초대할 회원" />
            <p className="mt-2 text-caption text-muted-foreground break-keep">
                호스트가 초대한 회원은 신청 없이 바로 참가자가 됩니다. 만든 뒤에도 매칭 화면에서 초대하거나 링크를 보낼 수 있습니다.
            </p>
        </div>
    )
}
