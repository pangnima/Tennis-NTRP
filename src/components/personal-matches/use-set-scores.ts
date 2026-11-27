'use client'

import { useState } from 'react'
import type { PersonalMatchSetScore } from '@/types'

// 빈 스코어 — NaN은 입력란을 비워 두기 위한 표시값(SetScoreRow가 ''로 렌더)
const EMPTY_SET: PersonalMatchSetScore = { me: NaN, opp: NaN }

function withAd(s: PersonalMatchSetScore): PersonalMatchSetScore {
    return {
        me: s.me,
        opp: s.opp,
        ...(s.myAd ? { myAd: s.myAd } : {}),
        ...(s.oppAd ? { oppAd: s.oppAd } : {}),
    }
}

/**
 * 스코어 수정 폼의 스코어 state + 핸들러 — 한 게임 = 스코어 하나라 줄은 하나다(배열은 관점 변환
 * `setsFromSeat`이 받는 모양). 빈 값은 NaN으로 보관해 한 자리 숫자를 지울 수 있게 한다.
 */
export function useSetScores(initial?: PersonalMatchSetScore[]) {
    const [sets, setSets] = useState<PersonalMatchSetScore[]>(
        initial?.length ? initial.map(withAd) : [EMPTY_SET],
    )

    function updateSet(i: number, field: 'me' | 'opp', val: string) {
        if (val === '') {
            setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: NaN } : s)))
            return
        }
        const num = parseInt(val, 10)
        if (isNaN(num) || num < 0 || num > 99) return
        setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: num } : s)))
    }
    // 복식 애드/듀스. undefined = 미지정(둘 다 듀스).
    function setMyAd(i: number, v: 'me' | 'partner' | undefined) {
        setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, myAd: v } : s)))
    }
    function setOppAd(i: number, v: 'opponent' | 'opponent2' | undefined) {
        setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, oppAd: v } : s)))
    }

    return { sets, updateSet, setMyAd, setOppAd }
}
