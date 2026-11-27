/**
 * 전 회원의 personal_ntrp(개인 경기 기반 레이팅 캐시)를 일괄 재계산한다 — 랭킹과 다음 게임의 NTRP 스냅샷이 읽는 값.
 * service-role 키로 RLS를 우회해 전체 게임을 읽고, 앱과 같은 엔진(toPersonalMatches → explode → replay)으로 산출한다.
 * 평소에는 게임을 기록·수정·삭제할 때 앱이 참가 회원 것을 고친다(lib/games/recompute.ts). 이 스크립트는
 * 그 경로가 빠진 경우(키 없이 운영한 기간, SQL로 넣은 시드)의 일괄 보정용이다.
 *
 * 실행: npm run db:backfill-personal-ntrp
 * 필요 env(.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * ⚠ 어느 프로젝트에 붙는지는 NEXT_PUBLIC_SUPABASE_URL이 정한다 — 로컬 .env.local은 dev다.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

import { mapGameRow } from '../src/lib/games/map'
import { toPersonalMatches } from '../src/lib/games/perspective'
import { explodePersonalMatchSets } from '../src/lib/personal-matches/explode'
import { roundRating } from '../src/lib/rating/elo'
import { replayPersonalRatings } from '../src/lib/rating/personal-rating'
import type { Database } from '../src/types/supabase'
import type { Game } from '../src/types'

async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
        console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
        process.exit(1)
    }
    const supabase = createClient<Database>(url, key)

    const { data: users, error: uErr } = await supabase.from('users').select('id, ntrp')
    if (uErr || !users) {
        console.error('users 조회 실패:', uErr?.message)
        process.exit(1)
    }
    const ntrpById = new Map<string, number>()
    for (const u of users) if (u.ntrp != null && Number(u.ntrp) > 0) ntrpById.set(u.id, Number(u.ntrp))

    const { data: rows, error: gErr } = await supabase.from('games').select('*, players:game_players(*)')
    if (gErr || !rows) {
        console.error('games 조회 실패:', gErr?.message)
        process.exit(1)
    }
    const games: Game[] = rows.map((row) => mapGameRow(row, row.players))

    let updated = 0
    for (const u of users) {
        const matches = toPersonalMatches(games, u.id)
        const snap = replayPersonalRatings(explodePersonalMatchSets(matches), ntrpById.get(u.id) ?? null, (id) => ntrpById.get(id))
        const personalNtrp = snap.matchesPlayed > 0 ? roundRating(snap.rating) : null
        const { error } = await supabase.from('users').update({ personal_ntrp: personalNtrp }).eq('id', u.id)
        if (error) console.error(`update 실패 (${u.id}):`, error.message)
        else if (personalNtrp != null) updated++
    }
    console.log(`백필 완료: personal_ntrp 갱신 ${updated}명 / 전체 ${users.length}명 (게임 ${games.length}건)`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
