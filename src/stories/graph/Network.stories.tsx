import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { NetworkGraph, type NetworkLink, type NetworkNode } from '@winterop-com/sokkel-ui-graph/NetworkGraph'
import { Stage } from './Frame'

/** Tidevann's notes and the links between them, each note colored by its folder. */
const NOTES: NetworkNode[] = [
    { id: 'export', label: 'Nightly export', group: 'Jobs' },
    { id: 'inventory', label: 'Sync inventory', group: 'Jobs' },
    { id: 'index', label: 'Rebuild index', group: 'Jobs' },
    { id: 'digest', label: 'Send digest', group: 'Jobs' },
    { id: 'orders', label: 'Import orders', group: 'Jobs' },
    { id: 'retry', label: 'Retry a run', group: 'Runbooks' },
    { id: 'oncall', label: 'On call', group: 'Runbooks' },
    { id: 'rotate', label: 'Rotate the api keys', group: 'Runbooks' },
    { id: 'harbor', label: 'harbor', group: 'Projects' },
    { id: 'juniper', label: 'juniper', group: 'Projects' },
    { id: 'larkspur', label: 'larkspur', group: 'Projects' },
    { id: 'ada', label: 'ada', group: 'People' },
    { id: 'grace', label: 'grace', group: 'People' },
    { id: 'linus', label: 'linus', group: 'People' },
    { id: 'margaret', label: 'margaret', group: 'People' },
    { id: 'sync', label: 'Weekly sync', group: 'Meetings' },
    { id: 'review', label: 'Quarter review', group: 'Meetings' },
    { id: 'day-1', label: '2026-11-09', group: 'Daily' },
    { id: 'day-2', label: '2026-11-08', group: 'Daily' },
    { id: 'retention', label: 'Export retention', faint: true },
    { id: 'reading', label: 'Reading list', group: 'Inbox' },
    { id: 'ideas', label: 'Ideas', group: 'Inbox' },
]

const LINKS: NetworkLink[] = [
    ['export', 'retry'],
    ['export', 'larkspur'],
    ['export', 'ada'],
    ['export', 'digest'],
    ['export', 'retention'],
    ['inventory', 'harbor'],
    ['inventory', 'retry'],
    ['inventory', 'grace'],
    ['index', 'juniper'],
    ['index', 'linus'],
    ['digest', 'larkspur'],
    ['digest', 'margaret'],
    ['orders', 'juniper'],
    ['orders', 'retry'],
    ['oncall', 'retry'],
    ['oncall', 'rotate'],
    ['oncall', 'grace'],
    ['rotate', 'harbor'],
    ['sync', 'grace'],
    ['sync', 'ada'],
    ['sync', 'linus'],
    ['sync', 'export'],
    ['review', 'harbor'],
    ['review', 'juniper'],
    ['review', 'larkspur'],
    ['review', 'margaret'],
    ['day-1', 'sync'],
    ['day-1', 'export'],
    ['day-2', 'inventory'],
    ['day-2', 'oncall'],
].map(([source, target]) => ({ source: source as string, target: target as string }))

function Network({ nodes, links, meta }: { nodes: NetworkNode[]; links: NetworkLink[]; meta: string }) {
    const [current, setCurrent] = useState<string | null>('export')
    return (
        <Stage title="Graph" meta={meta}>
            <NetworkGraph
                nodes={nodes}
                links={links}
                current={current}
                onSelect={(id) => id !== null && setCurrent(id)}
                words={{ label: 'Notes' }}
            />
        </Stage>
    )
}

const meta: Meta = { title: 'Graphs/Network' }
export default meta

type Story = StoryObj

/** Three notes, two of them linked to the third. */
export const Short: Story = {
    render: () => (
        <Network
            nodes={NOTES.slice(0, 3)}
            links={[
                { source: 'export', target: 'inventory' },
                { source: 'export', target: 'index' },
            ]}
            meta="Three notes"
        />
    ),
}

/**
 * A vault of notes colored by folder, larger the more links they have: pointing at one lights it, its
 * links and its neighbors; choosing one rings it as the note open now. A note linked to that does not
 * exist is faint, and the notes with no link stand in a row under the rest.
 */
export const Vault: Story = { render: () => <Network nodes={NOTES} links={LINKS} meta={`${String(NOTES.length)} notes`} /> }
