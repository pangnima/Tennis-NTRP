'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { saveMatchBoardAction } from '@/lib/actions/matches'
import {
    applyLineup, applySaved, diffBoard, emptyRow, fromGames, isRowDirty, mergePool, rowUpsert, setScore, setSlot, slotCount, swapTeam, syncBoard,
    validateBoard, validateRow, type BoardRow, type BoardState, type PoolPlayer,
} from '@/lib/games/board'
import type { LineupGame } from '@/lib/games/lineup'
import type { Game, MatchType } from '@/types'

/** roster = 매칭 명단(회원 + 명단의 비회원, 0108) — 비회원은 명단에 넣어야 풀에 선다 */
type Input = { matchId: string; matchType: MatchType; games: Game[]; roster: PoolPlayer[] }
const without = (set: ReadonlySet<string>, key: string) => new Set([...set].filter((k) => k !== key))

/**
 * 게임 보드의 상태 — 읽어 온 기준(loaded)과 고치는 줄(rows)을 함께 들고, 저장할 때는 차이만 보낸다.
 * **게임별 저장**: 줄 하나를 저장하면 그 줄의 기준만 서버가 돌려준 id·version으로 바뀌고 다른 줄의 입력은 남는다.
 * 새 게임 목록(저장 뒤 새로 그리기·다른 참가자의 저장·명단 변경)이 오면 `syncBoard`·`mergePool`로 병합한다 — 고치던 줄은 지키고 나머지는 서버 값.
 * 한 이벤트에서 여러 번 고칠 수 있는 자리라 갱신은 전부 함수형(`prev => …`)이다.
 */
export function useMatchBoard(input: Input) {
    const { matchId, matchType } = input
    const router = useRouter()
    const size = slotCount(matchType)
    const [seen, setSeen] = useState(input.games)
    const [state, setState] = useState<BoardState>(() => {
        const first = fromGames(input.games, input.roster, matchType)
        return { loaded: first.rows, rows: first.rows }
    })
    const [pool, setPool] = useState<PoolPlayer[]>(() => fromGames(input.games, input.roster, matchType).pool)
    const [editing, setEditing] = useState<ReadonlySet<string>>(new Set())
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    // 서버의 게임 목록이 바뀌면 병합한다(렌더 중 비교 — 이펙트로 한 박자 늦게 그리지 않는다)
    if (input.games !== seen) {
        const next = fromGames(input.games, input.roster, matchType)
        setSeen(input.games)
        setState((prev) => syncBoard(prev, next.rows, editing))
        // 풀의 기준은 서버(명단)다 — 명단에서 빠진 비회원은 빠지고, 고치던 줄이 쓰는 사람만 남는다
        setPool((prev) => mergePool(prev, next.pool, state.rows))
    }

    const diff = useMemo(() => diffBoard(state.loaded, state.rows, pool), [state, pool])
    const changes = diff.upserts.length + diff.deletes.length

    // 저장하지 않고 떠나면 브라우저가 한 번 묻는다
    useEffect(() => {
        if (changes === 0) return
        const warn = (e: BeforeUnloadEvent) => e.preventDefault()
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [changes])

    const setRows = (fn: (rows: BoardRow[]) => BoardRow[]) => setState((prev) => ({ ...prev, rows: fn(prev.rows) }))
    const setRowError = (key: string, message: string | null) =>
        setRowErrors((prev) => {
            const rest = Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key))
            return message ? { ...rest, [key]: message } : rest
        })

    function saveRow(row: BoardRow) {
        const invalid = validateRow(row, pool)
        setRowError(row.key, invalid)
        if (invalid) return
        setBusy(row.key)
        startTransition(async () => {
            const result = await saveMatchBoardAction(matchId, { upserts: [rowUpsert(row, pool)], deletes: [] })
            setBusy(null)
            if (result.error) return setRowError(row.key, result.error)
            setState((prev) => applySaved(prev, [row.key], result.rows))
            setEditing((prev) => without(prev, row.key))
            router.refresh()
        })
    }

    function saveAll() {
        const invalid = validateBoard(state.rows, pool)
        if (invalid) return setError(invalid)
        const keys = state.rows.filter((r) => isRowDirty(state.loaded, r)).map((r) => r.key)
        setError(null)
        setBusy('all')
        startTransition(async () => {
            const result = await saveMatchBoardAction(matchId, diff)
            setBusy(null)
            if (result.error) return setError(result.error)
            setState((prev) => applySaved(prev, keys, result.rows, diff.deletes))
            setEditing(new Set())
            setRowErrors({})
            router.refresh()
        })
    }

    /** 저장된 게임은 바로 지운다(확인 팝업이 묻는다) — 에러 문구를 돌려주면 팝업이 보여 준다 */
    async function deleteRow(row: BoardRow): Promise<string | null> {
        if (!row.id) return null
        const result = await saveMatchBoardAction(matchId, { upserts: [], deletes: [row.id] })
        if (result.error) return result.error
        setState((prev) => ({ loaded: prev.loaded.filter((r) => r.id !== row.id), rows: prev.rows.filter((r) => r.key !== row.key) }))
        router.refresh()
        return null
    }

    return {
        rows: state.rows,
        loaded: state.loaded,
        pool,
        size,
        changes,
        editing,
        rowErrors,
        error,
        busy,
        setSlot: (rowKey: string, index: number, key: string | null) => setRows((prev) => setSlot(prev, rowKey, index, key)),
        setScore: (rowKey: string, set: number, side: 't1' | 't2', value: string) => setRows((prev) => setScore(prev, rowKey, set, side, value)),
        swapTeam: (rowKey: string, team: 1 | 2) => setRows((prev) => swapTeam(prev, rowKey, team)),
        addRow: () => setRows((prev) => [...prev, emptyRow(size)]),
        /** 새 줄 지우기 — 저장 전이라 묻지 않는다 */
        removeRow: (rowKey: string) => setRows((prev) => prev.filter((r) => r.key !== rowKey)),
        applyLineup: (games: LineupGame[]) => setRows((prev) => applyLineup(prev, games, size)),
        startEdit: (rowKey: string) => setEditing((prev) => new Set([...prev, rowKey])),
        /** [취소] — 읽은 값으로 되돌리고 보기 모드로 */
        cancelEdit: (rowKey: string) => {
            setState((prev) => ({
                ...prev,
                rows: prev.rows.map((r) => {
                    const saved = r.key === rowKey ? prev.loaded.find((l) => l.id === r.id) : undefined
                    return saved ? { ...saved, key: r.key } : r
                }),
            }))
            setEditing((prev) => without(prev, rowKey))
            setRowError(rowKey, null)
        },
        reset: () => {
            setState((prev) => ({ ...prev, rows: prev.loaded }))
            setEditing(new Set())
            setRowErrors({})
            setError(null)
        },
        saveRow,
        saveAll,
        deleteRow,
    }
}

export type MatchBoard = ReturnType<typeof useMatchBoard>
