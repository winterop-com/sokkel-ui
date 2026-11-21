import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import type { AlertTickerItem } from '@winterop-com/sokkel-ui/AlertTicker'
import { CHECK_WORDS, type CheckStatus } from '@winterop-com/sokkel-ui-tracking/checks'
import type { SourceAlert, SourceState } from '@winterop-com/sokkel-ui-tracking/sources'
import { useEffect, useMemo, useState } from 'react'

import { dataAt } from './history'
import { pictureOf, type Picture } from './picture'
import { DEFAULT_SETTINGS, settings, type Settings } from './settings'
import { change, useControl, type Control } from './store'

/** What every view of the site reads: the shared state, the moment shown, and the picture at it. */
export interface Watch extends Control {
    options: Settings
    /** The real moment, moved on each second. */
    now: number
    /** The moment the picture is of: now, or the playback's. */
    at: number
    picture: Picture
    /** The alerts not yet acknowledged. */
    open: SourceAlert[]
    select: (key: string | null) => void
    acknowledge: (ids: readonly string[]) => void
}

/** The real clock, read once a second. */
function useNow(): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [])
    return now
}

/** The site's state as a view reads it, followed as the sources are read and the windows change it. */
export function useWatch(): Watch {
    const control = useControl()
    const options = { ...DEFAULT_SETTINGS, ...useStore(settings) }
    const now = useNow()
    const { playhead, selected, acknowledged } = control.shared
    const at = playhead ?? now
    // The satellites move every second; everything else moves when its source is read.
    const picture = useMemo(() => pictureOf(dataAt(playhead), at, selected), [control.state, playhead, at, selected])
    const open = useMemo(
        () => control.state.alerts.filter((alert) => !acknowledged.includes(alert.id)),
        [control.state.alerts, acknowledged],
    )
    return {
        ...control,
        options,
        now,
        at,
        picture,
        open,
        select: (key) => change({ selected: key }),
        acknowledge: (ids) => change({ acknowledged: [...new Set([...acknowledged, ...ids])].slice(-300) }),
    }
}

const CLOCK = (zone: 'utc' | 'local') =>
    new Intl.DateTimeFormat('en-US', {
        timeZone: zone === 'utc' ? 'UTC' : undefined,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    })

/** A moment as the site's clocks say it: `14:30:00 UTC`. */
export const clockTime = (at: number, zone: 'utc' | 'local' = 'utc'): string => `${CLOCK(zone).format(at)}${zone === 'utc' ? ' UTC' : ''}`

/** The tone an alert is said in, by the status its source took. */
export const ALERT_TONE: Record<CheckStatus, 'critical' | 'warning' | 'good' | 'quiet'> = {
    down: 'critical',
    degraded: 'warning',
    up: 'good',
    unknown: 'quiet',
}

/** An alert in a sentence: `Flights is down`. */
export const alertText = (alert: SourceAlert): string =>
    `${alert.label} is ${CHECK_WORDS.statuses[alert.to].toLowerCase()}${alert.reason === undefined ? '' : ` (${alert.reason})`}`

/** The alerts as the ticker shows them, newest first. */
export const tickerItems = (alerts: readonly SourceAlert[], zone: 'utc' | 'local'): AlertTickerItem[] =>
    alerts.map((alert) => ({ id: alert.id, text: alertText(alert), tone: ALERT_TONE[alert.to], when: clockTime(alert.at, zone) }))

/** What a source's tile and row say under its status: that it is off, simulated, or why it is not up. */
export function sourceNote(source: SourceState): string | undefined {
    if (!source.enabled) return 'Switched off'
    if (source.fallback) return 'Live read failed; showing the simulation'
    const failed = source.results.find((result) => result.failure !== undefined)?.failure
    if (failed !== undefined) return `${CHECK_WORDS.reasons[failed.reason]}${failed.actual === undefined ? '' : `: ${failed.actual}`}`
    return undefined
}

/** The last latency a source answered with, in whole milliseconds. */
export const lastLatency = (source: SourceState): number | undefined => {
    const last = [...source.latency].reverse().find((value) => value !== null)
    return last === undefined || last === null ? undefined : Math.round(last)
}

/** A source's latencies as a line draws them: the gaps left out. */
export const latencySeries = (source: SourceState): number[] => source.latency.filter((value): value is number => value !== null)
