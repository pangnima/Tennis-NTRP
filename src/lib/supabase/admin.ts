import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { supabaseEnv } from '@/lib/supabase/env'
import type { Database } from '@/types/supabase'

/**
 * service_role 클라이언트 — RLS를 우회한다. **서버 액션 안에서, 방금 성공한 쓰기의 뒷정리에만** 쓴다
 * (지금은 게임 참가 회원 전원의 레이팅 캐시 재계산 하나). 사용자 입력으로 대상을 고르는 조회·쓰기에 쓰지 않는다.
 *
 * 키(`SUPABASE_SERVICE_ROLE_KEY`)가 없으면 null — 호출부는 아무것도 하지 않는다(레이팅 캐시는 회원 세션으로 쓸 수 없다, 0103).
 * 로컬 `.env.local`은 dev 키, prod 키는 Vercel Production env에만 둔다. `NEXT_PUBLIC_`을 붙이지 않는다.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) return null
    return createClient<Database>(supabaseEnv().url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
