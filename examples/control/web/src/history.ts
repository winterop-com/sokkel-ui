/**
 * What each source read over the last hour, kept in this window as the engine's data changes, so the
 * playback timeline can show the picture as it was. A window opened later holds less of the hour.
 */
import type { ControlData } from './sources'
import { SOURCES } from './sources'
import { engine } from './store'

/** How far back the playback reaches, in milliseconds. */
export const SPAN = 3_600_000

/** The least time between two readings kept of one source, in milliseconds. */
const APART = 10_000

interface Reading {
    at: number
    version: number
    data: unknown
}

const kept = new Map<string, Reading[]>()

/** Notes what the sources hold now, for each whose data changed since it was last noted. */
export function record(now: number): void {
    for (const source of engine.state().sources) {
        const data = engine.data(source.id)
        if (data === undefined) continue
        const readings = kept.get(source.id) ?? []
        const last = readings[readings.length - 1]
        if (last !== undefined && (last.version === source.version || now - last.at < APART)) continue
        readings.push({ at: source.readAt ?? now, version: source.version, data })
        while (readings.length > 0 && readings[0].at < now - SPAN) readings.shift()
        kept.set(source.id, readings)
    }
}

/** What every source holds now, or with `at` what each held at that moment: its latest reading by then, its first when it has none so early. */
export function dataAt(at: number | null): Partial<ControlData> {
    const data: Record<string, unknown> = {}
    for (const source of SOURCES) {
        if (at === null) data[source.id] = engine.data(source.id)
        else {
            const readings = kept.get(source.id) ?? []
            const before = readings.filter((reading) => reading.at <= at)
            data[source.id] = (before[before.length - 1] ?? readings[0])?.data
        }
    }
    return data as Partial<ControlData>
}
