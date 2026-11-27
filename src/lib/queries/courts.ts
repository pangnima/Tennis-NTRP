import 'server-only'

import type { CourtNameUse, OfficialCourt } from '@/lib/matches/court-clusters'
import { createClient } from '@/lib/supabase/server'

export type CourtOverview = { names: CourtNameUse[]; courts: OfficialCourt[] }

/**
 * 코트명 정리 화면의 재료(0103) — 관리자 전용 RPC `admin_court_overview`. 관리자가 아니면 RPC가 `not_admin`으로
 * 거절하므로 null(화면은 404). names = 공식에 안 묶인 이름(매칭 + 직접 기록), courts = 공식 코트와 별칭.
 */
export async function fetchCourtOverview(): Promise<CourtOverview | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('admin_court_overview')
    if (error || !data) return null
    // RPC가 만든 모양 그대로다(jsonb) — 합계만 숫자로 맞춘다
    const raw = data as unknown as CourtOverview
    return {
        names: raw.names.map((n) => ({ name: n.name, uses: Number(n.uses) })),
        courts: raw.courts.map((c) => ({ ...c, uses: Number(c.uses) })),
    }
}
