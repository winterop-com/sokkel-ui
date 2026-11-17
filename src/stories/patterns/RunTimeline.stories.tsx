import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { RunTimeline, type RunTimelineLane, type RunTimelineRun } from '@winterop-com/sokkel-ui/RunTimeline'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'

/**
 * Jobs and their runs along one time axis: a lane a job, each run a mark in its state's color where
 * it fell, runs still to come hollow, and a line at the current time.
 */
const meta: Meta = { title: 'Patterns/Run timeline', parameters: { frame: 'padded' } }
export default meta

const HOUR = 3_600_000
const DAY = 24 * HOUR
/** The current time every story is drawn at. */
const NOW = Date.UTC(2026, 10, 14, 12, 0)

/** A run each `every` milliseconds from `first`, until `last`, in the state `state` gives its index, or scheduled after now. */
function runs(prefix: string, first: number, last: number, every: number, state: (index: number) => string, minutes = 0): RunTimelineRun[] {
    const made: RunTimelineRun[] = []
    for (let at = first, index = 0; at <= last; at += every, index++) {
        made.push({
            id: `${prefix}-${String(index)}`,
            at,
            end: minutes > 0 ? at + minutes * 60_000 : undefined,
            status: at > NOW ? undefined : state(index),
        })
    }
    return made
}

/** Every run succeeded but the ones at the indexes in `failed` and `skipped`. */
const mostly =
    (failed: number[], skipped: number[] = []) =>
    (index: number): string =>
        failed.includes(index) ? 'failed' : skipped.includes(index) ? 'skipped' : 'succeeded'

function lanesFrom(from: number, to: number, minutes = 0): RunTimelineLane[] {
    return [
        {
            id: 'nightly-export',
            name: 'nightly-export',
            detail: 'Every day at 02:00',
            runs: runs('export', Date.UTC(2026, 9, 1, 2), to, DAY, mostly([20, 39], [31]), minutes * 4),
        },
        {
            id: 'sync-inventory',
            name: 'sync-inventory',
            detail: 'Every 6 hours',
            runs: runs('sync', Date.UTC(2026, 9, 1, 0), to, 6 * HOUR, mostly([150, 151, 170], [140]), minutes),
        },
        {
            id: 'rebuild-index',
            name: 'rebuild-index',
            detail: 'Paused',
            runs: runs('index', Date.UTC(2026, 9, 1, 4), NOW - 3 * DAY, 2 * DAY, mostly([18])).filter((run) => Number(run.at) < NOW),
        },
        {
            id: 'send-digest',
            name: 'send-digest',
            detail: 'Mondays at 08:00',
            runs: runs('digest', Date.UTC(2026, 9, 5, 8), to, 7 * DAY, mostly([])),
        },
        { id: 'running', name: 'Concurrency', detail: 'at most 2 at once', total: true, runs: [] },
    ].map((lane) => ({ ...lane, runs: lane.runs.filter((run) => Number(run.at) >= from - DAY && Number(run.at) <= to) }))
}

/** Thirty days around today: sixteen behind and fourteen ahead. */
export const Month: StoryObj = {
    render: () => {
        const from = NOW - 16 * DAY
        const to = NOW + 14 * DAY
        return <RunTimeline lanes={lanesFrom(from, to)} from={from} to={to} now={NOW} timeZone="UTC" />
    },
}

/** One day: each run a bar as long as it took, the hours along the axis. */
export const Day: StoryObj = {
    render: () => {
        const from = NOW - 16 * HOUR
        const to = NOW + 8 * HOUR
        return <RunTimeline lanes={lanesFrom(from, to, 25)} from={from} to={to} now={NOW} timeZone="UTC" />
    },
}

const RANGES = { '6h': 6 * HOUR, '24h': DAY, '3d': 3 * DAY, '7d': 7 * DAY, '30d': 30 * DAY } as const
type Range = keyof typeof RANGES

/**
 * In a section with the ranges to pick from: a lane is chosen by its name, and its upcoming runs drag
 * sideways as one, or move with the arrow keys, the app moving them by what `onShift` hears.
 */
export const Shift: StoryObj = {
    render: function Render() {
        const [range, setRange] = useState<Range>('30d')
        const [selected, setSelected] = useState<string | null>('sync-inventory')
        const [moved, setMoved] = useState<Record<string, number>>({})
        const span = RANGES[range]
        const from = NOW - span * 0.55
        const to = NOW + span * 0.45
        const lanes = lanesFrom(from, to, range === '6h' || range === '24h' ? 25 : 0).map((lane) => ({
            ...lane,
            runs: lane.runs.map((run) => (Number(run.at) > NOW ? { ...run, at: Number(run.at) + (moved[lane.id] ?? 0) } : run)),
        }))
        return (
            <Section
                title="Timeline"
                actions={
                    <Segmented
                        label="Range"
                        value={range}
                        options={Object.keys(RANGES).map((value) => ({ value: value as Range, label: value }))}
                        onValueChange={setRange}
                    />
                }
            >
                <RunTimeline
                    lanes={lanes}
                    from={from}
                    to={to}
                    now={NOW}
                    timeZone="UTC"
                    selected={selected}
                    onSelect={setSelected}
                    onShift={({ lane, by }) => setMoved((current) => ({ ...current, [lane]: (current[lane] ?? 0) + by }))}
                />
            </Section>
        )
    },
}
