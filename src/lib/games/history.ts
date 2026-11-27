/**
 * 게임 수정 기록(0105, DB `game_edits`)의 읽기 규칙 — 순수 함수(vitest).
 * 참가자 누구나 스코어를 고치고 지울 수 있는 구조라, **누가·언제·무엇을** 바꿨는지를 묶음 아래 아코디언에 쌓아 보여 준다.
 * 남는 것: 스코어가 있던 게임의 스코어·선수 변경과 삭제. 예정 대진을 고치거나 처음 스코어를 넣는 것은 「기록」이라 남지 않는다.
 */
import { sessionKey } from '@/lib/games/list'
import type { GameSet, MatchType } from '@/types'

export type EditPlayer = { team: 1 | 2; slot: 1 | 2; userId?: string; name: string }
export type EditSnapshot = { sets: GameSet[]; players: EditPlayer[] }

export type GameEdit = {
    id: string
    gameId: string
    matchId?: string
    actorName?: string
    action: 'edit' | 'delete'
    before: EditSnapshot
    /** 삭제면 없다 */
    after?: EditSnapshot
    matchType: MatchType
    playedAt: string
    playedTime?: string
    courtName?: string
    courtNo?: string
    createdAt: string
}

/** DB의 jsonb → 스냅샷. 모양이 다르면 빈 값으로(기록 한 줄이 화면을 깨지 않게) */
export function parseSnapshot(raw: unknown): EditSnapshot {
    const obj = (raw && typeof raw === 'object' ? raw : {}) as { sets?: unknown; players?: unknown }
    const sets = Array.isArray(obj.sets)
        ? obj.sets.flatMap((s): GameSet[] => {
            const v = s as { t1?: unknown; t2?: unknown }
            return typeof v?.t1 === 'number' && typeof v?.t2 === 'number' ? [{ t1: v.t1, t2: v.t2 }] : []
        })
        : []
    const players = Array.isArray(obj.players)
        ? obj.players.flatMap((p): EditPlayer[] => {
            const v = p as { team?: unknown; slot?: unknown; userId?: unknown; name?: unknown }
            if (typeof v?.name !== 'string') return []
            return [{ team: v.team === 2 ? 2 : 1, slot: v.slot === 2 ? 2 : 1, userId: typeof v.userId === 'string' ? v.userId : undefined, name: v.name }]
        })
        : []
    return { sets, players }
}

/** 보는 사람의 팀을 왼쪽에 — 뛰지 않았으면 팀 1이 왼쪽 */
function orient(snap: EditSnapshot, viewerId: string): { lineup: string; score: string } {
    const mine = snap.players.find((p) => p.userId === viewerId)?.team ?? 1
    const names = (team: 1 | 2) =>
        snap.players.filter((p) => p.team === team).sort((a, b) => a.slot - b.slot).map((p) => (p.userId === viewerId ? '나' : p.name)).join('·')
    const s = snap.sets[0]
    const score = !s ? '스코어 없음' : mine === 1 ? `${s.t1}:${s.t2}` : `${s.t2}:${s.t1}`
    return { lineup: `${names(mine)} vs ${names(mine === 1 ? 2 : 1)}`, score }
}

const seats = (snap: EditSnapshot) => snap.players.map((p) => `${p.team}-${p.slot}:${p.userId ?? p.name}`).sort().join(',')

/** 기록 한 줄의 내용 — 「스코어 6:4 → 6:3 · 나 vs 남자02」「삭제 · 나 vs 남자02 7:5」「선수 변경 · 나 vs 남자02 → 나 vs 남자03 (6:3)」 */
export function describeEdit(edit: GameEdit, viewerId: string): string {
    const b = orient(edit.before, viewerId)
    if (edit.action === 'delete' || !edit.after) return `삭제 · ${b.lineup} ${b.score}`
    const a = orient(edit.after, viewerId)
    const lineupChanged = seats(edit.before) !== seats(edit.after)
    // 스코어는 절대 좌표로 비교한다(선수가 바뀌어 내 팀이 달라져도 같은 스코어면 같은 것)
    const scoreChanged = JSON.stringify(edit.before.sets) !== JSON.stringify(edit.after.sets)
    if (lineupChanged && scoreChanged) return `선수·스코어 변경 · ${b.lineup} ${b.score} → ${a.lineup} ${a.score}`
    if (lineupChanged) return `선수 변경 · ${b.lineup} → ${a.lineup} (${a.score})`
    return `스코어 ${b.score} → ${a.score} · ${a.lineup}`
}

/** 기록 시각 — 'MM.DD HH:mm'(KST) */
export function editStamp(iso: string): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(iso))
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`
}

/** 기록을 묶음 키로 모은다(게임과 같은 키 — 지워진 게임의 기록도 제 묶음에 붙는다). 묶음 안은 오래된 것부터 */
export function groupEditsBySession(edits: GameEdit[]): Map<string, GameEdit[]> {
    const out = new Map<string, GameEdit[]>()
    for (const e of [...edits].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        const key = sessionKey(e)
        out.set(key, [...(out.get(key) ?? []), e])
    }
    return out
}
