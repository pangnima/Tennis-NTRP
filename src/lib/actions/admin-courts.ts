'use server'

import { revalidatePath } from 'next/cache'

import { gameErrorMessage } from '@/lib/games/errors'
import { COURT_NAME_MAX } from '@/lib/matches/court'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/actions/result'

type Client = Awaited<ReturnType<typeof createClient>>

/** 코트명 정리(0103) — 관리자 판정은 RPC가 한다(`not_admin`). 코트명은 목록·상세·찾기 어디에나 보이므로 전부 다시 그린다 */
async function callRpc(run: (supabase: Client) => PromiseLike<{ error: { message: string } | null }>, fallback: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }
    const { error } = await run(supabase)
    if (error) return { error: gameErrorMessage(error.message, fallback) }
    revalidatePath('/', 'layout')
    return { error: null }
}

function invalidName(name: string): string | null {
    const n = name.trim()
    if (!n) return '공식 명칭을 적어 주세요.'
    if (n.length > COURT_NAME_MAX) return `공식 명칭은 ${COURT_NAME_MAX}자까지 적을 수 있습니다.`
    return null
}

/** 고른 이름들을 공식 명칭 하나로 — 그 이름으로 적힌 매칭·경기의 코트명도 함께 바뀐다(되돌릴 수 없다) */
export async function mergeCourtNamesAction(official: string, names: string[]): Promise<ActionResult> {
    const invalid = invalidName(official)
    if (invalid) return { error: invalid }
    if (names.length === 0) return { error: '합칠 이름을 하나 이상 골라 주세요.' }
    if (names.length > 50) return { error: '한 번에 50개까지 합칠 수 있습니다.' }
    return callRpc((s) => s.rpc('merge_court_names', { p_official: official.trim(), p_names: names }), '합치지 못했습니다.')
}

/** 공식 명칭 바꾸기 — 옛 이름은 별칭으로 남는다 */
export async function renameCourtAction(courtId: string, name: string): Promise<ActionResult> {
    const invalid = invalidName(name)
    if (invalid) return { error: invalid }
    return callRpc((s) => s.rpc('rename_court', { p_court_id: courtId, p_name: name.trim() }), '이름을 바꾸지 못했습니다.')
}

/** 별칭 빼기 — 앞으로 그 이름을 공식 명칭으로 맞추지 않는다(이미 바뀐 기록은 그대로) */
export async function removeCourtAliasAction(key: string): Promise<ActionResult> {
    return callRpc((s) => s.rpc('remove_court_alias', { p_key: key }), '빼지 못했습니다.')
}
