/**
 * How the map colors the links and the hosts: by the state of a host's connections, or by the
 * process that moves the most with it. The track affiliations are the slots both layers paint by,
 * each painted here with a status or chart token in place of an affiliation's color, so a host and
 * its link always share one.
 */

import type { MapLegendEntry } from '@winterop-com/sokkel-ui-maps/MapLegend'
import type { MapTone } from '@winterop-com/sokkel-ui-maps/tone'
import type { TrackAffiliation } from '@winterop-com/sokkel-ui-maps/TrackLayer'
import type { ConnectionFlow } from '@winterop-com/sokkel-ui-tracking/network'

import type { ColorBy } from './model'

/** What a connection's state says of it. */
export type Phase = 'established' | 'opening' | 'closing' | 'datagram'

export function phaseOf(state: string | undefined): Phase {
    if (state === undefined || state === '') return 'datagram'
    const upper = state.toUpperCase()
    if (upper === 'ESTABLISHED') return 'established'
    if (upper.startsWith('SYN')) return 'opening'
    return 'closing'
}

export const PHASES: { phase: Phase; label: string; tone: TrackAffiliation; color: string }[] = [
    { phase: 'established', label: 'Established', tone: 'friend', color: 'var(--status-succeeded)' },
    { phase: 'opening', label: 'Opening', tone: 'pending', color: 'var(--status-queued)' },
    { phase: 'datagram', label: 'Datagram (UDP)', tone: 'unknown', color: 'var(--status-running)' },
    { phase: 'closing', label: 'Closing', tone: 'neutral', color: 'var(--status-cancelled)' },
]

/** The tones the busiest processes take in turn, each painted in a chart color. */
const PROCESS_TONES: { tone: TrackAffiliation; color: string }[] = [
    { tone: 'friend', color: 'var(--chart-1)' },
    { tone: 'neutral', color: 'var(--chart-2)' },
    { tone: 'unknown', color: 'var(--chart-3)' },
    { tone: 'pending', color: 'var(--chart-4)' },
]

/** The tone every other process shares. */
const OTHER: TrackAffiliation = 'hostile'

export interface Coloring {
    /** The tone of a remote host, from its connections. */
    toneOf: (connections: readonly ConnectionFlow[]) => TrackAffiliation
    /** The colors a layer paints each tone in. */
    colors: Record<MapTone, string>
    legend: MapLegendEntry[]
    /** The tone of each legend entry, in its order, for counting. */
    tones: TrackAffiliation[]
}

const weight = (connection: ConnectionFlow) => connection.bytesIn + connection.bytesOut

/** How the map colors by `by`, over the connections shown now. */
export function coloring(by: ColorBy, connections: readonly ConnectionFlow[]): Coloring {
    if (by === 'state') {
        const colors = { plain: 'var(--muted-foreground)' } as Record<MapTone, string>
        for (const { tone, color } of PHASES) colors[tone] = color
        colors.hostile = 'var(--status-failed)'
        const order: Phase[] = ['established', 'opening', 'datagram', 'closing']
        return {
            toneOf: (mine) => {
                const phases = new Set(mine.map((connection) => phaseOf(connection.state)))
                const phase = order.find((each) => phases.has(each)) ?? 'closing'
                return PHASES.find((each) => each.phase === phase)?.tone ?? 'neutral'
            },
            colors,
            legend: PHASES.map(({ label, color }) => ({ label, color })),
            tones: PHASES.map(({ tone }) => tone),
        }
    }
    // The busiest processes by bytes (or by connections when nothing is metered), each with a tone of its own.
    const totals = new Map<string, number>()
    for (const connection of connections) {
        const name = connection.process ?? ''
        if (name === '') continue
        totals.set(name, (totals.get(name) ?? 0) + weight(connection) + 1)
    }
    const named = [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, PROCESS_TONES.length)
    const toneByProcess = new Map(named.map(([name], index) => [name, PROCESS_TONES[index].tone]))
    const colors = { plain: 'var(--muted-foreground)', [OTHER]: 'var(--muted-foreground)' } as Record<MapTone, string>
    for (const { tone, color } of PROCESS_TONES) colors[tone] = color
    return {
        toneOf: (mine) => {
            const byProcess = new Map<string, number>()
            for (const connection of mine) {
                const name = connection.process ?? ''
                byProcess.set(name, (byProcess.get(name) ?? 0) + weight(connection) + 1)
            }
            const [top] = [...byProcess].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            return (top === undefined ? undefined : toneByProcess.get(top[0])) ?? OTHER
        },
        colors,
        legend: [
            ...named.map(([name], index) => ({ label: name, color: PROCESS_TONES[index].color })),
            { label: 'Other', color: 'var(--muted-foreground)' },
        ],
        tones: [...named.map((_, index) => PROCESS_TONES[index].tone), OTHER],
    }
}
