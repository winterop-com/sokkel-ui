import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DependencyGraph, type LineageEdge, type LineageNode } from '@winterop-com/sokkel-ui-graph/DependencyGraph'
import { Stage } from './Frame'

/** Where the juniper project's order data comes from and goes: datasets read and written by jobs. */
const NODES: LineageNode[] = [
    { code: 'orders-raw', name: 'Raw orders', role: 'dataset', kind: 'table' },
    { code: 'inventory-raw', name: 'Raw inventory', role: 'dataset', kind: 'table' },
    { code: 'import-orders', role: 'job', kind: 'python', status: 'succeeded' },
    { code: 'sync-inventory', role: 'job', kind: 'python', status: 'succeeded' },
    { code: 'orders', role: 'dataset', kind: 'table' },
    { code: 'inventory', role: 'dataset', kind: 'table' },
    { code: 'nightly-export', role: 'job', kind: 'sql', status: 'running' },
    { code: 'export', name: 'Nightly export', role: 'dataset', kind: 'parquet' },
    { code: 'send-digest', role: 'job', kind: 'email', status: 'queued' },
]

const EDGES: LineageEdge[] = [
    { from: 'orders-raw', to: 'import-orders' },
    { from: 'import-orders', to: 'orders' },
    { from: 'inventory-raw', to: 'sync-inventory' },
    { from: 'sync-inventory', to: 'inventory' },
    { from: 'orders', to: 'nightly-export' },
    { from: 'inventory', to: 'nightly-export' },
    { from: 'nightly-export', to: 'export' },
    { from: 'export', to: 'send-digest' },
]

/** One job between two datasets. */
const SHORT_NODES: LineageNode[] = [
    { code: 'orders-raw', role: 'dataset', kind: 'table' },
    { code: 'import-orders', role: 'job', kind: 'python' },
    { code: 'orders', role: 'dataset', kind: 'table' },
]

function Lineage({ nodes, edges, meta }: { nodes: LineageNode[]; edges: LineageEdge[]; meta: string }) {
    const [selected, setSelected] = useState<string | null>(null)
    return (
        <Stage title="Lineage" meta={meta}>
            <DependencyGraph nodes={nodes} edges={edges} selected={selected} onSelect={setSelected} words={{ label: 'Lineage' }} />
        </Stage>
    )
}

const meta: Meta = { title: 'Graphs/Lineage' }
export default meta

type Story = StoryObj

/** A job between the dataset it reads and the one it writes: datasets have round corners and a cylinder, jobs a cog. */
export const Short: Story = {
    render: () => (
        <Lineage
            nodes={SHORT_NODES}
            edges={[
                { from: 'orders-raw', to: 'import-orders' },
                { from: 'import-orders', to: 'orders' },
            ]}
            meta="juniper, orders"
        />
    ),
}

/** The lineage of the nightly export, from two raw tables to the digest, with each job's last status. */
export const Export: Story = { render: () => <Lineage nodes={NODES} edges={EDGES} meta="juniper, nightly export" /> }
