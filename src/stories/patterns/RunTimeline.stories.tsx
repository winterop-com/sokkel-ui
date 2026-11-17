import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { RunTimeline } from '@winterop-com/sokkel-ui/RunTimeline'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { DAY, HOUR, lanesFrom, NOW } from '../fixtures/schedules'

/**
 * Jobs and their runs along one time axis: a lane a job, each run a mark in its state's color where
 * it fell, runs still to come hollow, and a line at the current time.
 */
const meta: Meta = { title: 'Patterns/Run timeline', parameters: { frame: 'padded' } }
export default meta

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
