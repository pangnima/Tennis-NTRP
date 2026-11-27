import type { CourtSurface } from '@/types'
import {
    type WinLoss, type BundleWithPersonal,
    calcWinRate, emptyWL,
} from '@/lib/analytics/shared'

export type { WinLoss }

export type SurfaceStats = Record<'hard' | 'clay' | 'grass' | 'other' | 'unknown', WinLoss>

export function aggregateBySurface(bundle: BundleWithPersonal): SurfaceStats {
    const result: SurfaceStats = {
        hard: emptyWL(),
        clay: emptyWL(),
        grass: emptyWL(),
        other: emptyWL(),
        unknown: emptyWL(),
    }

    for (const pm of bundle.personalMatches) {
        const surface: CourtSurface | 'unknown' = pm.surface ?? 'unknown'
        const wl = result[surface]
        wl.total++
        if (pm.winner === 'me') { wl.wins++; }
        else if (pm.winner === 'opponent') { wl.losses++; }
        else { wl.draws++; }
    }

    for (const key of Object.keys(result) as (CourtSurface | 'unknown')[]) {
        const wl = result[key]
        wl.winRate = calcWinRate(wl.wins, wl.losses)
    }

    return result
}
