import 'server-only'

import { todayIsoKst } from '@/lib/format'
import { mapGameRow, mapMatchRow } from '@/lib/games/map'
import type { OpponentCandidate } from '@/lib/queries/users'
import { toDominantHand } from '@/lib/queries/users'
import { createClient } from '@/lib/supabase/server'
import type { Game, TennisMatch } from '@/types'

export type MatchMember = OpponentCandidate & { role: 'host' | 'player'; deleted: boolean }
/** 참가 신청자 — 호스트가 승인을 고를 때 보는 값(참가자 행과 같은 모양) */
export type MatchApplicant = OpponentCandidate & { deleted: boolean; appliedAt: string }

const PERSON_COLUMNS = 'id, name, nickname, profile_image, ntrp, personal_ntrp, stats_hidden, dominant_hand, gender, deleted_at'
type PersonRow = {
    id: string; name: string; nickname: string; profile_image: string | null; ntrp: number | null; personal_ntrp: number | null
    stats_hidden: boolean; dominant_hand: string | null; gender: string | null; deleted_at: string | null
}

/** 사람 한 명 — 참가자 표·신청 목록·대진 선수 풀이 같은 값을 읽는다. 성별은 이름 옆 '남'/'여'와 혼복 배치에 쓴다 */
function toPerson(u: PersonRow): OpponentCandidate & { deleted: boolean } {
    return {
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        profileImage: u.profile_image ?? undefined,
        ntrp: u.ntrp ?? undefined,
        personalNtrp: u.personal_ntrp ?? undefined,
        statsHidden: u.stats_hidden,
        dominantHand: toDominantHand(u.dominant_hand),
        gender: u.gender === 'male' || u.gender === 'female' ? u.gender : undefined,
        isGuest: false,
        clubNames: [],
        deleted: u.deleted_at != null,
    }
}

/** 매칭 한 건 — 로그인 회원이면 비공개 매칭도 행은 받는다(0099). 비공개의 명단·게임은 참가자에게만 보인다. */
export async function fetchMatchById(matchId: string): Promise<TennisMatch | null> {
    const supabase = await createClient()
    const { data } = await supabase.from('matches').select('*').eq('id', matchId).maybeSingle()
    return data ? mapMatchRow(data) : null
}

/** 여러 매칭을 한 번에 — 경기 결과의 묶음 머리(제목·일시·길이·코트 번호)가 읽는다. 매칭은 로그인 회원 누구나 볼 수 있다(0099) */
export async function fetchMatchesByIds(ids: string[]): Promise<Map<string, TennisMatch>> {
    if (ids.length === 0) return new Map()
    const supabase = await createClient()
    const { data } = await supabase.from('matches').select('*').in('id', ids)
    return new Map((data ?? []).map((row) => [row.id, mapMatchRow(row)]))
}

/**
 * 매칭별 참가 인원(회원 + 명단의 비회원) — 경기 결과의 묶음 머리 「4명」. 명단을 볼 수 없는 매칭(나간 비공개 매칭)은
 * RLS가 0으로 준다 — 호출부(`groupGamesIntoSessions`)가 게임의 선수 수로 받친다.
 */
export async function fetchMatchHeadcounts(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map()
    const supabase = await createClient()
    const { data } = await supabase.from('matches').select('id, members:match_members(count), guests:match_guests(count)').in('id', ids)
    return new Map((data ?? []).map((row) => [row.id, (row.members[0]?.count ?? 0) + (row.guests[0]?.count ?? 0)]))
}

/** 참가자 명단(호스트 먼저, 그다음 들어온 순) */
export async function fetchMatchMembers(matchId: string): Promise<MatchMember[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('match_members')
        .select(`role, joined_at, users(${PERSON_COLUMNS})`)
        .eq('match_id', matchId)
        .order('joined_at')
    return (data ?? [])
        .flatMap((row) => {
            const u = row.users
            if (!u) return []
            const member: MatchMember = { ...toPerson(u as PersonRow), role: row.role === 'host' ? 'host' : 'player' }
            return [member]
        })
        .sort((a, b) => Number(b.role === 'host') - Number(a.role === 'host'))
}

/** 명단의 비회원(0108) — 계정 없이 이름으로 오른 참가자. `addedBy`가 없으면 초대 링크로 스스로 등록했다 */
export type MatchGuest = {
    id: string
    name: string
    ntrp: number
    gender?: 'male' | 'female'
    hand?: 'right' | 'left'
    addedBy?: string
    addedByName?: string
}

/** 명단의 비회원(들어온 순). 비공개 매칭에 참가하기 전에는 RLS가 가린다 */
export async function fetchMatchGuests(matchId: string): Promise<MatchGuest[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('match_guests')
        .select('id, name, ntrp, gender, hand, added_by, adder:users!match_guests_added_by_fkey(name)')
        .eq('match_id', matchId)
        .order('created_at')
    return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        ntrp: Number(row.ntrp),
        gender: row.gender === 'male' || row.gender === 'female' ? row.gender : undefined,
        hand: row.hand === 'right' || row.hand === 'left' ? row.hand : undefined,
        addedBy: row.added_by ?? undefined,
        addedByName: row.adder?.name ?? undefined,
    }))
}

/** 매칭 안의 게임(기록 순) — 스코어 없는 「예정」 게임도 함께(보드가 그린다) */
export async function fetchMatchGames(matchId: string, confirmed: boolean): Promise<Game[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('games')
        .select('*, players:game_players(*), editor:users!games_updated_by_fkey(name)')
        .eq('match_id', matchId)
        .order('created_at')
    return (data ?? []).map((row) =>
        mapGameRow(row, row.players, { matchConfirmed: confirmed, updatedByName: row.editor?.name ?? undefined }),
    )
}

/**
 * memberCount = **참가 인원(회원 + 명단의 비회원, 0108)** — 정원과 견주는 수다.
 * 비공개 매칭에 참가하지 않았으면 null — 명단이 가려져 셀 수 없다(0명으로 보이면 거짓이다).
 * hosted = 내가 만든 매칭(목록의 「호스트」 칩 — 「참가 중」 대신).
 */
export type MatchListItem = TennisMatch & { hostName: string; memberCount: number | null; joined: boolean; applied: boolean; hosted: boolean }

/** 'YYYY-MM-DD' 하루 앞 */
function dayBefore(iso: string): string {
    const d = new Date(`${iso}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
}

/**
 * 매칭 목록.
 *   · `all` — 목록: **일정이 끝나지 않은 매칭만, 임박한 순서로**(끝났는지는 화면이 `splitMatchesByEnd`로 가른다 — DB는 자정을 넘기는
 *     경기를 놓치지 않게 어제부터 받는다). 비공개 매칭도 자물쇠로 나온다(비밀번호로 들어온다, 0099). DB에서 걸러 정렬한다 —
 *     받아서 뒤집으면 예정이 많아질 때 정작 가까운 것이 잘린다.
 *   · `mine` — 내가 참가한 매칭 전부. 지난 것도 필요하다(경기 뒤 게임 기록·최종 확정). 화면이 예정(임박순) → 「지난 매칭」 구분 줄 → 지난(최근순)으로 잇는다.
 * 개수가 커지면 커서를 얹는다(지금은 100건).
 */
export async function fetchMatchList(viewerId: string, filter: 'all' | 'mine'): Promise<MatchListItem[]> {
    const supabase = await createClient()
    const { data: mine } = await supabase.from('match_members').select('match_id').eq('user_id', viewerId)
    const myIds = new Set((mine ?? []).map((r) => r.match_id))
    if (filter === 'mine' && myIds.size === 0) return []
    const { data: applied } = await supabase.from('match_applications').select('match_id').eq('user_id', viewerId)
    const appliedIds = new Set((applied ?? []).map((r) => r.match_id))

    const base = supabase
        .from('matches')
        .select('*, host:users!matches_host_id_fkey(name), members:match_members(count), guests:match_guests(count)')
    const query = filter === 'mine'
        ? base.in('id', [...myIds]).order('played_at', { ascending: false })
        : base.gte('played_at', dayBefore(todayIsoKst())).order('played_at').order('played_time', { nullsFirst: true })
    const { data } = await query.limit(100)
    return (data ?? []).map((row) => ({
        ...mapMatchRow(row),
        hostName: row.host?.name ?? '',
        memberCount: row.is_listed || myIds.has(row.id) ? (row.members[0]?.count ?? 0) + (row.guests[0]?.count ?? 0) : null,
        joined: myIds.has(row.id),
        applied: appliedIds.has(row.id),
        hosted: row.host_id === viewerId,
    }))
}

/** 호스트가 보는 참가 신청 목록(신청 순). 호스트가 아니면 RLS가 본인 신청만 준다 */
export async function fetchMatchApplicants(matchId: string): Promise<MatchApplicant[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('match_applications')
        .select(`created_at, users(${PERSON_COLUMNS})`)
        .eq('match_id', matchId)
        .order('created_at')
    return (data ?? []).flatMap((row) => (row.users ? [{ ...toPerson(row.users as PersonRow), appliedAt: row.created_at }] : []))
}

/** 내가 이 매칭에 신청해 두었나 */
export async function fetchHasApplied(matchId: string, viewerId: string): Promise<boolean> {
    const supabase = await createClient()
    const { data } = await supabase.from('match_applications').select('match_id').eq('match_id', matchId).eq('user_id', viewerId).maybeSingle()
    return !!data
}

/** 초대 링크 토큰 — 호스트에게만(아니면 null) */
export async function fetchInviteToken(matchId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_match_invite_token', { p_match_id: matchId })
    return error ? null : data
}
