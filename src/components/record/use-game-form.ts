'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { recordGameAction } from '@/lib/actions/games'
import { emptyRow, isPlanned, rowUpsert, setScore, setSlot, slotCount, swapTeam, validateRow, type BoardRow, type PoolPlayer } from '@/lib/games/board'
import { isDoubles, MAX_RECORD_GAMES, validateRecordInput, type RecordInput } from '@/lib/games/input'
import { DEFAULT_DURATION_MINUTES } from '@/lib/matches/when'
import { derivePublicNtrp } from '@/lib/personal-matches/ntrp'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { CourtSurface, MatchType } from '@/types'

export type GameFormDefaults = {
    viewerId: string
    viewerName: string
    matchType: MatchType
    playedAt: string
    playedTime: string
    surface: CourtSurface | ''
    courtName: string
    /** 저장 후 돌아갈 곳 */
    returnTo: string
}

/** 한 기록에 넣을 수 있는 회원 수(나 제외) */
const MEMBER_MAX = 15

/** 비어 있는 첫 줄을 참가자로 채운다 — 종목의 자리 수만큼 모였을 때만(나 + 고른 순서) */
function fillFirst(rows: BoardRow[], keys: string[], size: number): BoardRow[] {
    const [first] = rows
    if (rows.length !== 1 || keys.length < size || first.slots.some(Boolean) || !isPlanned(first)) return rows
    return [{ ...first, slots: keys.slice(0, size) }]
}

/**
 * 직접 기록 폼의 상태 — **참가자 풀 + 게임 줄**(매칭룸 게임 보드와 같은 규칙, `lib/games/board.ts`).
 * 참가자는 여러 명일 수 있고 게임마다 대진을 고른다(3명이 번갈아 단식, 파트너를 바꿔 가며 복식). 줄 하나가 한 게임이고
 * 스코어는 필수다(예정 게임은 매칭에만 있다). 줄마다 저장하지 않고 맨 아래 [경기 저장] 한 번으로 전부 들어간다.
 * 한 이벤트에서 여러 번 고칠 수 있는 자리라 줄의 갱신은 전부 함수형이다.
 */
export function useGameForm(d: GameFormDefaults) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

    const [matchType, setType] = useState<MatchType>(d.matchType)
    const [playedAt, setPlayedAt] = useState(d.playedAt)
    const [playedTime, setPlayedTime] = useState(d.playedTime)
    const [duration, setDuration] = useState(String(DEFAULT_DURATION_MINUTES))
    const [surface, setSurface] = useState<CourtSurface | ''>(d.surface)
    const [courtName, setCourtName] = useState(d.courtName)
    const [courtNo, setCourtNo] = useState('')
    const [notes, setNotes] = useState('')
    const [members, setMembers] = useState<PoolPlayer[]>([])
    const [guests, setGuests] = useState<PoolPlayer[]>([])
    const [rows, setRows] = useState<BoardRow[]>(() => [emptyRow(slotCount(d.matchType))])

    const size = slotCount(matchType)
    const pool = useMemo((): PoolPlayer[] => [
        { key: d.viewerId, userId: d.viewerId, name: d.viewerName, isMember: true },
        ...members,
        ...guests,
    ], [d.viewerId, d.viewerName, members, guests])
    const keysOf = (m: PoolPlayer[], g: PoolPlayer[]) => [d.viewerId, ...m.map((x) => x.key), ...g.map((x) => x.key)]

    /** 풀이 바뀌면 — 빠진 사람은 자리에서 내리고, 첫 줄이 비어 있으면 채운다 */
    function syncRows(m: PoolPlayer[], g: PoolPlayer[]) {
        const keys = keysOf(m, g)
        setRows((prev) => fillFirst(prev.map((r) => ({ ...r, slots: r.slots.map((s) => (s && keys.includes(s) ? s : null)) })), keys, size))
    }

    function submit() {
        const reasons = Object.fromEntries(rows.flatMap((r) => {
            const reason = validateRow(r, pool) ?? (isPlanned(r) ? '스코어를 적어 주세요.' : null)
            return reason ? [[r.key, reason] as const] : []
        }))
        setRowErrors(reasons)
        const bad = rows.findIndex((r) => reasons[r.key])
        if (bad >= 0) return setError(`${bad + 1}게임: ${reasons[rows[bad].key]}`)

        const input: RecordInput = {
            matchType, playedAt: playedAt || undefined, playedTime: playedTime || undefined, durationMinutes: Number(duration) || undefined,
            surface: surface || undefined, courtName: courtName.trim() || undefined, courtNo: courtNo.trim() || undefined, notes: notes.trim() || undefined,
            games: rows.map((r) => {
                const u = rowUpsert(r, pool)
                return { players: u.players, sets: u.sets }
            }),
        }
        const invalid = validateRecordInput(input, d.viewerId)
        if (invalid) return setError(invalid)
        setError(null)
        startTransition(async () => {
            const result = await recordGameAction(input)
            if (result.error) return setError(result.error)
            router.push(d.returnTo)
            router.refresh()
        })
    }

    return {
        isPending, error, rowErrors, submit, cancel: () => router.push(d.returnTo),
        doubles: isDoubles(matchType), matchType, pool, rows, members, guests, canAdd: rows.length < MAX_RECORD_GAMES,
        playedAt, setPlayedAt, playedTime, setPlayedTime, duration, setDuration, surface, setSurface,
        courtName, setCourtName, courtNo, setCourtNo, notes, setNotes,
        /** 종목을 바꾸면 자리 수가 달라져 줄을 새로 연다(참가자는 그대로) */
        setMatchType: (next: MatchType) => {
            setType(next)
            if (slotCount(next) !== size) setRows(fillFirst([emptyRow(slotCount(next))], keysOf(members, guests), slotCount(next)))
            setRowErrors({})
        },
        /** 검색 결과의 [추가] — 이름·NTRP·주력손은 프로필에서 따라온다(저장할 때 DB가 다시 채운다) */
        addMember: (c: OpponentCandidate) => {
            if (c.id === d.viewerId || members.length >= MEMBER_MAX || members.some((m) => m.key === c.id)) return
            const next = [...members, { key: c.id, userId: c.id, name: c.name, ntrp: derivePublicNtrp(c), hand: c.dominantHand, gender: c.gender, isMember: true }]
            setMembers(next)
            syncRows(next, guests)
        },
        addGuest: (guest: PoolPlayer) => {
            const next = guests.some((g) => g.key === guest.key) ? guests : [...guests, guest]
            setGuests(next)
            syncRows(members, next)
        },
        /** 참가자 칩의 × — 그 사람이 앉아 있던 자리도 비운다 */
        removePlayer: (key: string) => {
            const m = members.filter((x) => x.key !== key)
            const g = guests.filter((x) => x.key !== key)
            setMembers(m)
            setGuests(g)
            syncRows(m, g)
        },
        setSlot: (rowKey: string, index: number, key: string | null) => setRows((prev) => setSlot(prev, rowKey, index, key)),
        setScore: (rowKey: string, set: number, side: 't1' | 't2', value: string) => setRows((prev) => setScore(prev, rowKey, set, side, value)),
        swapTeam: (rowKey: string, team: 1 | 2) => setRows((prev) => swapTeam(prev, rowKey, team)),
        /** 새 줄은 바로 윗줄의 대진을 이어받는다 — 같은 상대와 한 게임 더 쳤으면 스코어만, 바뀌었으면 자리만 고친다 */
        addRow: () => setRows((prev) => (prev.length >= MAX_RECORD_GAMES ? prev : [...prev, emptyRow(size, [...(prev[prev.length - 1]?.slots ?? Array(size).fill(null))])])),
        removeRow: (rowKey: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== rowKey) : prev)),
    }
}

export type GameFormState = ReturnType<typeof useGameForm>
