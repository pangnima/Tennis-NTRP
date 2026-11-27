'use client'

import { useEffect, useMemo, useState } from 'react'

import { courtKey, matchCourt, type CourtCandidate } from '@/lib/matches/court'
import { createClient } from '@/lib/supabase/client'

/** via = 공식 코트가 별칭으로 걸렸을 때 그 별칭(「다른 이름: 양시숲」) */
export type CourtItem = { value: string; uses?: number; via?: string; isNew?: boolean }
export type CourtGroup = { value: string; items: CourtItem[] }

type Shared = { name: string; uses: number; official: boolean; via: string | null }

const DEBOUNCE_MS = 200

/**
 * 코트명 후보 — **「공식 코트」**(관리자가 정리한 정식 명칭, 0103 — 별칭으로 쳐도 걸린다) → 「최근 코트」(내 것, 화면에서
 * `matchCourt`로 거름) → 「함께 쓰는 코트」(매칭에 쓰인 이름). 찾기는 DB `search_court_names`(띄어쓰기 무시·줄임말·초성,
 * 공식 먼저·많이 쓴 순). 같은 키는 한 번만. 질의가 있고 같은 키의 후보(또는 걸린 별칭)가 없으면 마지막에 「새 코트로 쓰기」.
 * 브라우저 read-only 조회(RPC는 로그인 회원만)라 200ms 모아서 묻는다.
 */
export function useCourtSearch(query: string, recent: string[]) {
    const [shared, setShared] = useState<Shared[]>([])

    useEffect(() => {
        let alive = true
        const timer = setTimeout(async () => {
            const { data } = await createClient().rpc('search_court_names', { p_query: query, p_limit: 8 })
            if (alive) setShared(data ?? [])
        }, DEBOUNCE_MS)
        return () => { alive = false; clearTimeout(timer) }
    }, [query])

    const groups = useMemo((): CourtGroup[] => {
        const official: CourtItem[] = shared.filter((s) => s.official).map((s) => ({ value: s.name, uses: s.uses, via: s.via ?? undefined }))
        const seen = new Set(official.map((o) => courtKey(o.value)))
        const mine = recent
            .map((name) => ({ name, rank: matchCourt(name, query) }))
            .filter((r): r is { name: string; rank: 0 | 1 | 2 } => r.rank !== null && !seen.has(courtKey(r.name)))
            .sort((a, b) => a.rank - b.rank)
            .map((r) => ({ value: r.name }))
        for (const m of mine) seen.add(courtKey(m.value))
        const others = shared.filter((s) => !s.official && !seen.has(courtKey(s.name))).map((s) => ({ value: s.name, uses: s.uses }))
        const q = query.trim()
        const qKey = courtKey(q)
        // 걸린 별칭과 키가 같아도 "있는 코트"다 — 그대로 저장하면 DB가 공식 명칭으로 맞춘다
        const exact = seen.has(qKey) || others.some((c) => courtKey(c.value) === qKey) || official.some((o) => o.via != null && courtKey(o.via) === qKey)
        const out: CourtGroup[] = []
        if (official.length > 0) out.push({ value: '공식 코트', items: official })
        if (mine.length > 0) out.push({ value: '최근 코트', items: mine })
        if (others.length > 0) out.push({ value: '함께 쓰는 코트', items: others })
        if (q && !exact) out.push({ value: '새 코트', items: [{ value: q, isNew: true }] })
        return out
    }, [recent, shared, query])

    const candidates = useMemo(
        (): CourtCandidate[] => groups.flatMap((g) => g.items.filter((i) => !i.isNew).map((i) => ({ name: i.value, via: i.via }))),
        [groups],
    )
    return { groups, candidates }
}
