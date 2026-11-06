import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { GraphCanvas } from '../../components/graph/GraphCanvas'
import { GraphNodeBox, graphNodeSize, type GraphNodeData } from '../../components/graph/GraphNode'
import { measureByCharacters } from '../../components/graph/measure'
import { useNodeGraph, type GraphItem, type GraphLink } from '../../components/graph/use-node-graph'
import { Stage } from './Frame'
import { Row } from '../../components/Layout'

/** Every way a node box is drawn: named or not, with a kind, a status, a duration, progress, and chosen. */
const BOXES: { data: GraphNodeData; selected?: boolean; width: number }[] = [
    { data: { code: 'fetch' }, width: 120 },
    { data: { code: 'transform', kind: 'sql' }, width: 140 },
    { data: { code: 'upload', name: 'Upload to storage', kind: 's3' }, width: 170 },
    { data: { code: 'fetch-orders', name: 'Fetch orders', status: 'succeeded', duration_ms: 1840 }, width: 170 },
    { data: { code: 'transform', status: 'running', duration_ms: 12_400, progress: 0.62 }, width: 150 },
    { data: { code: 'validate', kind: 'schema', status: 'failed', duration_ms: 310 }, width: 160 },
    { data: { code: 'send-digest', status: 'queued' }, width: 150 },
    { data: { code: 'notify', kind: 'webhook', status: 'skipped' }, width: 150 },
    { data: { code: 'import-orders', name: 'Import orders', status: 'completed_with_errors', duration_ms: 64_000 }, width: 190 },
    { data: { code: 'rebuild-index', status: 'cancelled', duration_ms: 4000 }, width: 170 },
    { data: { code: 'sync-inventory', name: 'Sync inventory', kind: 'http', status: 'succeeded' }, selected: true, width: 170 },
]

function Boxes() {
    return (
        <Row gap="xl" align="stretch" wrap className="min-h-svh content-start bg-canvas p-6">
            {BOXES.map((box, index) => (
                <div key={index} style={{ width: box.width, height: graphNodeSize(box.data, measureByCharacters).height }}>
                    <GraphNodeBox data={box.data} selected={box.selected} />
                </div>
            ))}
        </Row>
    )
}

/** The services of the juniper project, drawn with the canvas and the hook rather than a ready-made view. */
const SERVICES: GraphItem[] = [
    { id: 'api', data: { code: 'api', name: 'API', kind: 'service', status: 'succeeded' } },
    { id: 'scheduler', data: { code: 'scheduler', kind: 'service', status: 'succeeded' } },
    { id: 'worker', data: { code: 'worker', kind: 'service', status: 'running' } },
    { id: 'queue', data: { code: 'queue', kind: 'broker', status: 'succeeded' } },
    { id: 'storage', data: { code: 'storage', kind: 'bucket', status: 'waiting' } },
]

const CALLS: GraphLink[] = [
    { source: 'api', target: 'queue', label: 'enqueue', arrow: true },
    { source: 'scheduler', target: 'queue', label: 'enqueue', arrow: true },
    { source: 'queue', target: 'worker', label: 'deliver', arrow: true },
    { source: 'worker', target: 'storage', label: 'write', arrow: true },
]

function Services() {
    const [selected, setSelected] = useState<string | null>(null)
    const graph = useNodeGraph(SERVICES, CALLS, { selected })
    return (
        <Stage title="Services" meta="juniper, drawn with GraphCanvas and useNodeGraph">
            <GraphCanvas
                nodes={graph.nodes}
                edges={graph.edges}
                settled={graph.settled}
                onSelect={setSelected}
                words={{ label: 'Services' }}
            />
        </Stage>
    )
}

function Nothing() {
    return (
        <Stage title="Services" meta="Nothing deployed yet">
            <GraphCanvas nodes={[]} edges={[]} words={{ empty: 'No services yet' }} />
        </Stage>
    )
}

const meta: Meta = { title: 'Graphs/Canvas' }
export default meta

type Story = StoryObj

/** An empty canvas says so, and offers no zoom. */
export const Empty: Story = { render: () => <Nothing /> }

/** A node box in every state it is drawn in; the last one is chosen. */
export const NodeBoxes: Story = { name: 'Node boxes', render: () => <Boxes /> }

/** A graph none of the views cover, built from the canvas, the node box and the layout hook, with labeled edges. */
export const CustomGraph: Story = { name: 'Custom graph', render: () => <Services /> }
