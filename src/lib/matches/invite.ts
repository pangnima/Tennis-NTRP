/**
 * 초대 링크로 읽는 매칭(0108) — `get_invited_match(token)`의 jsonb를 화면이 쓰는 모양으로 바꾼다(순수, vitest).
 *
 * 로그인하지 않은 사람에게 가는 값이라 DB가 **이름·성별·구분과 대진·스코어만** 싣는다(user id·사진·닉네임·NTRP 없음).
 * 회원을 가르는 `key`는 매칭별 해시다 — 게임 보드가 "같은 사람"을 알아보는 데만 쓴다. 그래서 보드에 넘기는 `Game`의
 * `userId` 자리에 이 key를 넣는다(진짜 회원 id가 아니다 — 읽기 전용 보드는 이름만 그린다).
 */
import type { PoolPlayer } from '@/lib/games/board'
import { mapMatchRow, mapSets } from '@/lib/games/map'
import type { Game, GamePlayer, TennisMatch } from '@/types'
import type { Database } from '@/types/supabase'

type MatchRow = Database['public']['Tables']['matches']['Row']

export type InviteKind = 'host' | 'member' | 'guest'
export type InviteRosterEntry = { key: string; name: string; gender?: 'male' | 'female'; kind: InviteKind; deleted: boolean }

/**
 * 이 화면을 보는 비회원(0109) — 계정이 없어 **기기가 기억한다**(쿠키). 두 단계다:
 *   · `owner: true`  = 이 기기에서 등록했다(쿠키에 비회원 id, DB가 확인) → 강조 + [참가 취소]
 *   · `owner: false` = 다른 기기에서 명단의 내 이름을 골랐다(쿠키에 이름뿐) → 강조만. 이름은 비밀이 아니라 아무것도 바꿀 수 없다
 */
export type InviteMe = { key: string; name: string; owner: boolean }

const cookieSuffix = (token: string) => token.replace(/[^0-9A-Za-z]/g, '').slice(0, 16)
/** 등록한 기기의 쿠키(값 = 비회원 id) · 이름을 고른 기기의 쿠키(값 = 이름). 매칭(토큰)마다 따로 */
export const inviteGuestCookie = (token: string) => `invite_guest_${cookieSuffix(token)}`
export const inviteMeCookie = (token: string) => `invite_me_${cookieSuffix(token)}`
/** 30일 — 링크로 보기가 매칭 종료 7일 뒤 닫히므로 넉넉하다 */
export const INVITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export type InviteView = {
    match: TennisMatch
    hostName: string
    roster: InviteRosterEntry[]
    me?: InviteMe
    /** 읽기 전용 보드에 넘기는 게임 — 선수의 `userId`는 회원 id가 아니라 초대용 key */
    games: Game[]
    /** 보드의 선수 풀(명단) */
    pool: PoolPlayer[]
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const gender = (v: unknown): 'male' | 'female' | undefined => (v === 'male' || v === 'female' ? v : undefined)
const kind = (v: unknown): InviteKind => (v === 'host' || v === 'guest' ? v : 'member')

/** @param pickedName 다른 기기에서 고른 내 이름(쿠키) — 명단의 비회원일 때만 인정한다 */
export function toInviteView(raw: unknown, pickedName?: string): InviteView | null {
    const root = obj(raw)
    const row = obj(root.match)
    if (typeof row.id !== 'string') return null
    // host_id는 DB가 빼고 준다 — 도메인 타입의 자리만 채운다
    const match = mapMatchRow({ ...(row as unknown as MatchRow), host_id: '' })

    const roster = list(root.roster).map((e): InviteRosterEntry => {
        const r = obj(e)
        return { key: String(r.key), name: String(r.name ?? ''), gender: gender(r.gender), kind: kind(r.kind), deleted: r.deleted === true }
    })
    const pool = roster.map((r): PoolPlayer => ({
        key: r.key, userId: r.kind === 'guest' ? undefined : r.key, name: r.name, gender: r.gender, isMember: r.kind !== 'guest',
    }))
    const games = list(root.games).map((e, i): Game => {
        const g = obj(e)
        const players = list(g.players).map((p): GamePlayer => {
            const s = obj(p)
            return {
                team: s.team === 2 ? 2 : 1,
                slot: s.slot === 2 ? 2 : 1,
                userId: s.member === true ? String(s.key) : undefined,
                name: String(s.name ?? ''),
                gender: gender(s.gender),
            }
        })
        return {
            id: `invite-${i + 1}`, matchId: match.id, createdBy: '', matchType: match.matchType, playedAt: match.playedAt,
            sets: mapSets(g.sets), players, locked: true, createdAt: '',
        }
    })
    // 나 — 등록한 기기(DB가 확인한 meKey)가 먼저, 없으면 고른 이름. 둘 다 지금 명단에 있는 비회원이어야 한다
    const guestOf = (key: string | undefined) => roster.find((r) => r.kind === 'guest' && r.key === key)
    const owned = guestOf(typeof root.meKey === 'string' ? root.meKey : undefined)
    const picked = owned ? undefined : guestOf(pickedName ? `guest:${pickedName.trim()}` : undefined)
    const me = owned ? { key: owned.key, name: owned.name, owner: true } : picked ? { key: picked.key, name: picked.name, owner: false } : undefined
    return { match, hostName: typeof root.hostName === 'string' ? root.hostName : '', roster, me, games, pool }
}

/** 링크로 새로 참가할 수 있나 — 확정·모집 마감·정원(DB `join_match_as_guest`·`join_match`의 거울). 경기 시작은 막지 않는다 */
export function inviteJoinBlocked(view: Pick<InviteView, 'match' | 'roster'>): boolean {
    const { match, roster } = view
    return !!match.confirmedAt || !!match.closedAt || roster.length >= match.capacity
}
