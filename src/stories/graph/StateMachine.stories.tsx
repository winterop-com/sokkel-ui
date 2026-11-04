import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { StateMachine, type MachineState, type MachineTransition } from '../../components/graph/StateMachine'
import { Stage } from './Frame'

/** The life of a run in the harbor project: queued, running, then succeeded, failed or cancelled, with a retry. */
const STATES: MachineState[] = [
    { code: 'queued' },
    { code: 'running' },
    { code: 'succeeded', final: true },
    { code: 'failed' },
    { code: 'cancelled', final: true },
]

const TRANSITIONS: MachineTransition[] = [
    { from: 'queued', to: 'running', label: 'start' },
    { from: 'queued', to: 'cancelled', label: 'cancel' },
    { from: 'running', to: 'succeeded', label: 'finish' },
    { from: 'running', to: 'failed', label: 'fail' },
    { from: 'running', to: 'cancelled', label: 'cancel' },
    { from: 'failed', to: 'queued', label: 'retry' },
]

/** A door with a lock: two states and a loop. */
const DOOR: MachineState[] = [
    { code: 'closed', name: 'Closed' },
    { code: 'open', name: 'Open' },
]
const DOOR_MOVES: MachineTransition[] = [
    { from: 'closed', to: 'open', label: 'open' },
    { from: 'open', to: 'closed', label: 'close' },
    { from: 'closed', to: 'closed', label: 'knock' },
]

function Machine({
    title,
    states,
    transitions,
    initial,
    current,
    meta,
}: {
    title: string
    states: MachineState[]
    transitions: MachineTransition[]
    initial: string
    current: string
    meta: string
}) {
    const [selected, setSelected] = useState<string | null>(null)
    return (
        <Stage title={title} meta={meta}>
            <StateMachine
                states={states}
                transitions={transitions}
                initial={initial}
                current={current}
                selected={selected}
                onSelect={setSelected}
                words={{ label: title }}
            />
        </Stage>
    )
}

const meta: Meta = { title: 'Graphs/State machine' }
export default meta

type Story = StoryObj

/** Two states, a transition each way, and one from a state back to itself, drawn as a loop. */
export const Short: Story = {
    render: () => <Machine title="Door" states={DOOR} transitions={DOOR_MOVES} initial="closed" current="open" meta="Open now" />,
}

/** A run's states with the events that move it, entered at queued; the run is running now, and the two final states lead to the final marker. */
export const RunStates: Story = {
    name: 'Run states',
    render: () => (
        <Machine
            title="Run states"
            states={STATES}
            transitions={TRANSITIONS}
            initial="queued"
            current="running"
            meta="harbor, run 01a1a5b9"
        />
    ),
}
