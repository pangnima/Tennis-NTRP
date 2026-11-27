/**
 * 매칭 게임 보드 — 대진표 + 스코어를 한 장에서 고치는 폼의 순수 규칙(vitest).
 *
 * 한 줄 = 한 게임. 자리(slots)는 절대 좌표 순서다: 복식 [팀1 slot1, 팀1 slot2, 팀2 slot1, 팀2 slot2], 단식 [팀1, 팀2].
 * 자리에는 선수 풀의 키가 들어간다(회원 = userId, 비회원 = `guest:이름`). 점수 칸이 전부 비면 「예정」 게임이다.
 * **복식 팀의 첫 자리 = 포(듀스), 둘째 자리 = 백(애드)** — 스코어를 저장할 때 세트마다 `t1Ad = t2Ad = 2`(둘째 slot)로 남겨
 * 통계의 코트 사이드 집계가 읽는다. 다른 경로(상세 수정의 토글)로 `Ad = 1`이 저장된 게임은 읽을 때 두 자리를 바꿔 그린다.
 * 저장은 바뀐 줄만 보낸다(`diffBoard`) — 같은 매칭을 두 사람이 고쳐도 서로 다른 게임이면 둘 다 남는다.
 */
import type { LineupGame } from '@/lib/games/lineup'
import type { Game, GameSet, MatchType } from '@/types'

export type PoolPlayer = {
    key: string
    userId?: string
    name: string
    ntrp?: number
    personalNtrp?: number
    statsHidden?: boolean
    hand?: 'right' | 'left'
    gender?: 'male' | 'female'
    isMember: boolean
}

export type ScorePair = { t1: string; t2: string }

export type BoardRow = {
    /** 화면 키 — 저장된 게임은 게임 id, 새 줄은 임시 키 */
    key: string
    /** 저장된 게임 id */
    id?: string
    /** 낙관적 동시성 — 읽었을 때의 `coalesce(updated_at, created_at)`. 다르면 DB가 `game_conflict`로 거절 */
    version?: string
    slots: (string | null)[]
    scores: ScorePair[]
    /** 저장돼 있던 세트(참고용 — 포/백은 자리 순서가 정한다) */
    baseSets: GameSet[]
    /** 예전 상세 수정 화면에서 남긴 메모 — 보드는 받지 않고 보기 모드에서 보여만 준다 */
    memo?: string
}

export type BoardPlayerInput = { team: 1 | 2; slot: 1 | 2; userId?: string; name?: string; ntrp?: number; hand?: 'right' | 'left'; gender?: 'male' | 'female' }
export type BoardUpsert = { id?: string; version?: string; players: BoardPlayerInput[]; sets: GameSet[] }
export type BoardDiff = { upserts: BoardUpsert[]; deletes: string[] }

export const guestKey = (name: string) => `guest:${name.trim()}`
export const slotCount = (matchType: MatchType) => (matchType === 'singles' ? 2 : 4)

/**
 * 비회원을 넣을 때 종목이 정하는 성별 — 남복 = 남, 여복 = 여(고를 수 없다). 단식·혼복은 null(고른다).
 * 화면 규칙이다: 회원은 막지 않으므로 DB도 종목과 성별을 맞춰 보지 않는다(0107).
 */
export function fixedGuestGender(matchType: MatchType): 'male' | 'female' | null {
    return matchType === 'men_doubles' ? 'male' : matchType === 'women_doubles' ? 'female' : null
}
const EMPTY_PAIR: ScorePair = { t1: '', t2: '' }

/** 자리 index → (팀, slot) */
export function seatOf(index: number, size: number): { team: 1 | 2; slot: 1 | 2 } {
    const half = size / 2
    return { team: index < half ? 1 : 2, slot: index % half === 0 ? 1 : 2 }
}

/** 저장된 게임과 매칭 명단(회원 + 명단의 비회원, 0108) → 선수 풀(명단 + 이 매칭 게임에만 남은 사람) + 줄 */
export function fromGames(games: Game[], members: PoolPlayer[], matchType: MatchType): { pool: PoolPlayer[]; rows: BoardRow[] } {
    const pool = [...members]
    const seen = new Set(pool.map((p) => p.key))
    const size = slotCount(matchType)
    const rows = games.map((g): BoardRow => {
        const slots: (string | null)[] = Array(size).fill(null)
        for (const p of g.players) {
            const key = p.userId ?? guestKey(p.name)
            if (!seen.has(key)) {
                seen.add(key)
                pool.push({ key, userId: p.userId, name: p.name, ntrp: p.ntrp, hand: p.hand, gender: p.gender, isMember: !!p.userId })
            }
            const index = (p.team - 1) * (size / 2) + (p.slot - 1)
            if (index < size) slots[index] = key
        }
        // 첫 slot이 애드(백)로 저장된 팀은 두 자리를 바꿔 「둘째 자리 = 백」 규칙에 맞춘다
        if (size === 4 && g.sets[0]?.t1Ad === 1) [slots[0], slots[1]] = [slots[1], slots[0]]
        if (size === 4 && g.sets[0]?.t2Ad === 1) [slots[2], slots[3]] = [slots[3], slots[2]]
        const scores = g.sets.length > 0 ? g.sets.map((s) => ({ t1: String(s.t1), t2: String(s.t2) })) : [{ ...EMPTY_PAIR }]
        return { key: g.id, id: g.id, version: g.updatedAt ?? g.createdAt, slots, scores, baseSets: g.sets, memo: g.notes }
    })
    return { pool, rows }
}

let seq = 0
/** 새 줄 — 자리는 비어 있고 점수 칸 하나 */
export function emptyRow(size: number, slots: (string | null)[] = Array(size).fill(null)): BoardRow {
    seq += 1
    return { key: `new-${Date.now().toString(36)}-${seq}`, slots, scores: [{ ...EMPTY_PAIR }], baseSets: [] }
}

/** 자리를 바꾼다 — 같은 게임의 다른 자리에 있던 사람을 고르면 두 자리를 맞바꾼다 */
export function setSlot(rows: BoardRow[], rowKey: string, index: number, playerKey: string | null): BoardRow[] {
    return rows.map((r) => {
        if (r.key !== rowKey) return r
        const slots = [...r.slots]
        const other = playerKey ? slots.indexOf(playerKey) : -1
        if (other >= 0 && other !== index) slots[other] = slots[index]
        slots[index] = playerKey
        return { ...r, slots }
    })
}

/** 복식 팀의 포/백을 맞바꾼다([⇄]) */
export function swapTeam(rows: BoardRow[], rowKey: string, team: 1 | 2): BoardRow[] {
    return rows.map((r) => {
        if (r.key !== rowKey || r.slots.length !== 4) return r
        const slots = [...r.slots]
        const i = team === 1 ? 0 : 2
        ;[slots[i], slots[i + 1]] = [slots[i + 1], slots[i]]
        return { ...r, slots }
    })
}

/** 점수 칸 — 숫자만, 두 자리까지 */
export function setScore(rows: BoardRow[], rowKey: string, setIndex: number, side: 't1' | 't2', value: string): BoardRow[] {
    const clean = value.replace(/\D/g, '').slice(0, 2)
    return rows.map((r) =>
        r.key === rowKey ? { ...r, scores: r.scores.map((s, i) => (i === setIndex ? { ...s, [side]: clean } : s)) } : r,
    )
}

export const isPlanned = (row: BoardRow) => row.scores.every((s) => s.t1 === '' && s.t2 === '')

/** 세트 하나의 이긴 팀 — 칸이 비었거나 같으면 null */
export function setWinner(s: ScorePair): 1 | 2 | null {
    if (s.t1 === '' || s.t2 === '') return null
    const a = Number(s.t1)
    const b = Number(s.t2)
    return a === b ? null : a > b ? 1 : 2
}

/**
 * 줄의 이긴 팀 — **모든 세트를 같은 팀이 이겼을 때만**(세트가 갈리거나 무승부가 섞이면 null).
 * 행 단위 승자는 통계에 없으므로(세트가 경기 하나) 이름 강조는 분명할 때만 한다.
 */
export function rowWinner(row: BoardRow): 1 | 2 | null {
    const winners = row.scores.map(setWinner)
    const first = winners[0] ?? null
    return first !== null && winners.every((w) => w === first) ? first : null
}

/**
 * 자동 대진표 적용 — **점수가 들어간 줄은 그대로 두고** 점수 없는 줄만 새 대진으로 바꾼다.
 * 지워진 저장 줄은 `diffBoard`가 삭제로 보낸다.
 */
export function applyLineup(rows: BoardRow[], games: LineupGame[], size: number): BoardRow[] {
    const kept = rows.filter((r) => !isPlanned(r))
    const fresh = games.map((g) => emptyRow(size, [...g.team1, ...g.team2].map((p) => p.key)))
    return [...kept, ...fresh]
}

/** 줄 하나의 검증 — 이유를 돌려준다(없으면 null). 게임 번호는 붙이지 않는다(줄 아래에 그대로 보여 준다) */
export function validateRow(r: BoardRow, pool: PoolPlayer[]): string | null {
    if (r.slots.some((s) => !s)) return '선수 자리를 모두 채워 주세요.'
    if (new Set(r.slots).size !== r.slots.length) return '같은 사람이 두 자리에 있습니다.'
    if (!r.slots.some((s) => pool.find((p) => p.key === s)?.isMember)) return '회원이 한 명은 있어야 합니다.'
    if (isPlanned(r)) return null
    for (const s of r.scores) {
        if (s.t1 === '' || s.t2 === '') return '스코어를 양쪽 다 넣거나 둘 다 비워 주세요.'
        if (s.t1 === '0' && s.t2 === '0') return '0:0은 기록할 수 없습니다.'
    }
    return null
}

/** 저장 전 검증 — 처음 걸린 줄의 이유 하나를 「N게임: 이유」로 돌려준다(없으면 null) */
export function validateBoard(rows: BoardRow[], pool: PoolPlayer[]): string | null {
    for (const [i, r] of rows.entries()) {
        const reason = validateRow(r, pool)
        if (reason) return `${i + 1}게임: ${reason}`
    }
    return null
}

/** 줄 → 저장할 세트. 복식은 세트마다 「둘째 자리 = 백(애드)」을 남긴다(t1Ad = t2Ad = 2) */
function toSets(row: BoardRow): GameSet[] {
    if (isPlanned(row)) return []
    const doubles = row.slots.length === 4
    return row.scores.map((s) => (doubles ? { t1: Number(s.t1), t2: Number(s.t2), t1Ad: 2, t2Ad: 2 } : { t1: Number(s.t1), t2: Number(s.t2) }))
}

function toPlayers(row: BoardRow, byKey: Map<string, PoolPlayer>): BoardPlayerInput[] {
    return row.slots.map((key, i) => {
        const p = byKey.get(key as string)
        const seat = seatOf(i, row.slots.length)
        if (p?.userId) return { ...seat, userId: p.userId }
        return { ...seat, name: p?.name ?? '', ntrp: p?.ntrp, hand: p?.hand, gender: p?.gender }
    })
}

const sameRow = (a: BoardRow, b: BoardRow) => a.slots.join() === b.slots.join() && JSON.stringify(a.scores) === JSON.stringify(b.scores)
const savedOf = (loaded: BoardRow[], row: BoardRow) => (row.id ? loaded.find((r) => r.id === row.id) : undefined)

/** 저장할 것이 있는 줄 — 새 줄이거나, 읽은 값과 자리·점수가 다르다 */
export function isRowDirty(loaded: BoardRow[], row: BoardRow): boolean {
    const prev = savedOf(loaded, row)
    return !prev || !sameRow(prev, row)
}

/** 줄 하나의 저장 내용 */
export function rowUpsert(row: BoardRow, pool: PoolPlayer[]): BoardUpsert {
    return { id: row.id, version: row.version, players: toPlayers(row, new Map(pool.map((p) => [p.key, p]))), sets: toSets(row) }
}

/** 읽은 상태와 지금 상태의 차이 — 바뀐 줄만 upsert(줄 순서대로), 사라진 저장 줄은 delete */
export function diffBoard(loaded: BoardRow[], current: BoardRow[], pool: PoolPlayer[]): BoardDiff {
    const upserts = current.filter((r) => isRowDirty(loaded, r)).map((r) => rowUpsert(r, pool))
    const alive = new Set(current.flatMap((r) => (r.id ? [r.id] : [])))
    const deletes = loaded.flatMap((r) => (r.id && !alive.has(r.id) ? [r.id] : []))
    return { upserts, deletes }
}

export type RowMode = 'view' | 'score' | 'edit'

/**
 * 줄의 모양 — 셋이다.
 *   · **보기**(`view`): 스코어가 저장된 게임 — 이름·점수 글자 + [수정]
 *   · **점수**(`score`): 저장된 **예정** 게임 — 선수는 글자, **점수 칸만** 열려 있다. 코트에서 끝나자마자 점수만 넣으면 되고,
 *     대진을 읽을 수 있다(내 이름 강조가 선다 — 선택칸으로 열어 두던 때는 내 자리가 보이지 않았다, 11-27 피드백)
 *   · **편집**(`edit`): 새 줄 · [수정]을 누른 줄 · 자리가 저장된 값과 달라진 줄(자동 대진표가 방금 바꾼 예정 게임) — 선택칸 + 점수 칸
 * 점수를 넣는 중인 예정 게임은 자리가 그대로라 `score`에 머문다(선택칸으로 바뀌지 않는다).
 */
export function rowMode(row: BoardRow, loaded: BoardRow[], editing: ReadonlySet<string>): RowMode {
    const prev = savedOf(loaded, row)
    if (!prev || editing.has(row.key) || prev.slots.join() !== row.slots.join()) return 'edit'
    if (isPlanned(prev)) return 'score'
    return isRowDirty(loaded, row) ? 'edit' : 'view'
}

/** 보드의 상태 — 읽어 온 기준(loaded, 저장된 게임만)과 고치는 줄(rows) */
export type BoardState = { loaded: BoardRow[]; rows: BoardRow[] }
export type SavedRef = { id: string; version: string }

/**
 * 저장 성공을 반영한다 — 저장한 줄(`keys`, upsert 순서)은 서버가 돌려준 id·version을 받고 기준도 그 값이 된다,
 * 지운 게임은 기준에서 빠진다. **저장하지 않은 다른 줄은 손대지 않는다**(게임별 저장).
 */
export function applySaved(state: BoardState, keys: string[], saved: SavedRef[], deletes: string[] = []): BoardState {
    const refs = new Map(keys.flatMap((k, i) => (saved[i] ? [[k, saved[i]] as const] : [])))
    const savedIds = new Set([...refs.values()].map((s) => s.id))
    const rows = state.rows.flatMap((r): BoardRow[] => {
        const ref = refs.get(r.key)
        if (ref) return [{ ...r, id: ref.id, version: ref.version, baseSets: toSets(r) }]
        // 새로 그린 목록이 먼저 도착해 같은 게임이 끝에 붙어 있으면 뺀다(저장한 줄이 그 게임이다)
        return r.id && savedIds.has(r.id) ? [] : [r]
    })
    const gone = new Set([...deletes, ...savedIds])
    const loaded = [...state.loaded.filter((r) => !r.id || !gone.has(r.id)), ...rows.filter((r) => refs.has(r.key))]
    return { loaded, rows }
}

/**
 * 서버에서 새 게임 목록이 왔을 때(저장 뒤 새로 그리기·다른 참가자의 저장) 병합한다.
 *   · 고치는 중이 아닌 저장 줄 → 서버 값으로(지워졌으면 뺀다)
 *   · 고치는 중인 줄(바뀐 줄·`keep`) → 그대로. version은 읽었던 값이라 남이 먼저 고쳤으면 저장할 때 `game_conflict`로 알려 준다.
 *     서버에서 지워진 게임을 고치던 중이면 새 줄로 남긴다(저장하면 다시 만든다)
 *   · 새 줄 → 그대로 · 서버에 새로 생긴 게임 → 끝에 붙인다 · 내가 지우려고 뺀(아직 저장 안 한) 게임 → 다시 넣지 않는다
 */
export function syncBoard(state: BoardState, next: BoardRow[], keep: ReadonlySet<string> = new Set()): BoardState {
    const server = new Map(next.map((r) => [r.id as string, r]))
    const known = new Set(state.loaded.map((r) => r.id))
    const shown = new Set(state.rows.map((r) => r.id))
    const rows = state.rows.flatMap((r): BoardRow[] => {
        if (!r.id) return [r]
        const fresh = server.get(r.id)
        const busy = keep.has(r.key) || isRowDirty(state.loaded, r)
        if (busy) return fresh ? [r] : [{ ...r, id: undefined, version: undefined }]
        return fresh ? [{ ...fresh, key: r.key }] : []
    })
    const added = next.filter((r) => !shown.has(r.id) && !known.has(r.id))
    return { loaded: next, rows: [...rows, ...added] }
}

/** 이 게임에 내가 있나 — 보드가 내 게임 줄을 강조한다(회원 = userId, 초대 화면의 비회원 = `guest:이름`) */
export function isMine(row: BoardRow, meKey: string | null | undefined): boolean {
    return meKey != null && row.slots.includes(meKey)
}

/** 「내 게임 N」 */
export function countMine(rows: BoardRow[], meKey: string | null | undefined): number {
    return rows.filter((r) => isMine(r, meKey)).length
}

/**
 * 서버의 새 선수 풀(명단 + 저장된 게임의 선수)과 화면의 풀을 합친다(0108).
 * 기준은 서버다 — 명단에서 빠진 사람은 풀에서도 빠진다. 다만 **지금 줄이 쓰고 있는 사람**은 남긴다(고치던 자리가 비어 보이지 않게).
 */
export function mergePool(prev: PoolPlayer[], next: PoolPlayer[], rows: BoardRow[]): PoolPlayer[] {
    const known = new Set(next.map((p) => p.key))
    const used = new Set(rows.flatMap((r) => r.slots.filter((k): k is string => k != null)))
    return [...next, ...prev.filter((p) => !known.has(p.key) && used.has(p.key))]
}
