import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { BlockPicker } from '@winterop-com/sokkel-ui-graph/BlockPicker'
import type { PipelineBlock } from '@winterop-com/sokkel-ui-graph/blocks'
import { GraphCanvas, type GraphControls } from '@winterop-com/sokkel-ui-graph/GraphCanvas'
import { GraphOverlay, type GraphAnchor } from '@winterop-com/sokkel-ui-graph/GraphOverlay'
import { GraphControlButton } from '@winterop-com/sokkel-ui-graph/GraphViewButtons'
import { PipelineGraph, type PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { GraphNodeBox, graphNodeSize, type GraphNodeData } from '@winterop-com/sokkel-ui-graph/GraphNode'
import { measureByCharacters } from '@winterop-com/sokkel-ui-graph/measure'
import { useNodeGraph, type GraphItem, type GraphLink } from '@winterop-com/sokkel-ui-graph/use-node-graph'
import { Stage } from './Frame'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import type { StatusMap } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { NIGHTLY_EXPORT } from './data'
import { BLOCKS, GROUPS } from './editor/blocks'

/**
 * Every way a node box is drawn: named or not, with a kind, a status, a duration, progress, a count
 * on the code line, a badge in a tone, and chosen. A box with no width is sized from its words.
 */
const BOXES: { data: GraphNodeData; selected?: boolean; width?: number }[] = [
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
    { data: { code: 'transform', name: 'Reshape', kind: 'python', count: '4 items', countPlacement: 'line' } },
    { data: { code: 'validate', kind: 'schema', badge: { label: 'beta', tone: 'warning', title: 'Its settings may still change' } } },
    {
        data: {
            code: 'upload',
            name: 'Upload to storage',
            kind: 's3',
            badge: { label: 'not installed', tone: 'critical', title: 'The s3 block is not installed on worker' },
        },
    },
    { data: { code: 'sync-inventory', name: 'Sync inventory', kind: 'http', status: 'succeeded' }, selected: true, width: 170 },
]

function Boxes() {
    return (
        <Row gap="xl" align="stretch" wrap className="min-h-svh content-start bg-canvas p-6">
            {BOXES.map((box, index) => (
                <div
                    key={index}
                    style={{ ...graphNodeSize(box.data, measureByCharacters), ...(box.width === undefined ? {} : { width: box.width }) }}
                >
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

/** Tidevann's states for a service, which a status board draws its nodes in. */
const HEALTH: StatusMap = {
    operational: { color: 'good' },
    degraded: { color: 'warning' },
    outage: { color: 'critical' },
    maintenance: { color: 'info' },
}

const HEALTHY: GraphItem[] = [
    { id: 'web', data: { code: 'web', kind: 'service', status: 'operational' } },
    { id: 'api', data: { code: 'api', kind: 'service', status: 'outage' } },
    { id: 'worker', data: { code: 'worker', kind: 'service', status: 'degraded' } },
    { id: 'queue', data: { code: 'queue', kind: 'store', status: 'operational', shape: 'round' } },
    { id: 'search', data: { code: 'search', kind: 'store', status: 'maintenance', shape: 'round' } },
]

const DEPENDS: GraphLink[] = [
    { source: 'web', target: 'api', arrow: true },
    { source: 'api', target: 'queue', arrow: true },
    { source: 'api', target: 'search', arrow: true },
    { source: 'worker', target: 'queue', arrow: true },
]

function Health() {
    const graph = useNodeGraph(HEALTHY, DEPENDS)
    return (
        <StatusProvider statuses={HEALTH}>
            <Stage title="Services" meta="by health, in the app's own states">
                <GraphCanvas nodes={graph.nodes} edges={graph.edges} settled={graph.settled} words={{ label: 'Services by health' }} />
            </Stage>
        </StatusProvider>
    )
}

function Nothing() {
    return (
        <Stage title="Services" meta="Nothing deployed yet">
            <GraphCanvas nodes={[]} edges={[]} words={{ empty: 'No services yet' }} />
        </Stage>
    )
}

/** A code not yet taken, from a block's kind: http, http-2, http-3. */
function freeCode(steps: readonly PipelineStep[], kind: string): string {
    const prefix = kind.split('.')[0] ?? kind
    const taken = new Set(steps.map((step) => step.code))
    if (!taken.has(prefix)) return prefix
    for (let n = 2; ; n += 1) if (!taken.has(`${prefix}-${String(n)}`)) return `${prefix}-${String(n)}`
}

/**
 * A pipeline with an add button in the canvas's own cluster, beside the zoom buttons. The button
 * opens the block picker beside itself, and `/` opens it in the middle of the canvas; a step picked
 * goes after the chosen one, placed beside its box.
 */
function Adding({ initial, opened }: { initial: PipelineStep[]; opened: 'button' | 'center' }) {
    const [steps, setSteps] = useState(initial)
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
    const [selected, setSelected] = useState<string | null>(initial.at(-1)?.code ?? null)
    const [button, setButton] = useState<HTMLButtonElement | null>(null)
    const [at, setAt] = useState<'button' | 'center' | null>(opened)
    const [controls, setControls] = useState<GraphControls | null>(null)
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== '/' || event.target instanceof HTMLInputElement) return
            event.preventDefault()
            setAt('center')
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])
    const anchor: GraphAnchor | null = at === 'center' ? 'center' : at === 'button' && button !== null ? { element: button } : null
    const pick = (block: PipelineBlock) => {
        const code = freeCode(steps, block.kind)
        const after = selected === null ? undefined : controls?.nodeBox(selected)
        setSteps((held) => [...held, { code, name: block.name, kind: block.kind, needs: selected === null ? [] : [selected] }])
        // The new box goes on the side the chosen one's edges leave from.
        if (after !== null && after !== undefined && controls !== null)
            setPositions((held) => ({
                ...held,
                [code]:
                    controls.direction === 'down'
                        ? { x: after.x, y: after.y + after.height + 48 }
                        : { x: after.x + after.width + 64, y: after.y },
            }))
        setSelected(code)
        setAt(null)
    }
    return (
        <Stage title="nightly-export" meta={initial.length === 0 ? 'harbor, no steps yet' : 'harbor, press / to add a step'}>
            <PipelineGraph
                steps={steps}
                positions={positions}
                selected={selected}
                onSelect={setSelected}
                onControls={setControls}
                words={{ label: 'nightly-export', empty: 'No steps yet' }}
                extraControls={
                    <GraphControlButton
                        ref={setButton}
                        label="Add a step"
                        aria-expanded={at === 'button'}
                        onClick={() => setAt((open) => (open === 'button' ? null : 'button'))}
                    >
                        <Plus aria-hidden />
                    </GraphControlButton>
                }
            >
                {anchor !== null && (
                    <GraphOverlay at={anchor} onClose={() => setAt(null)}>
                        <BlockPicker
                            blocks={BLOCKS}
                            groups={GROUPS}
                            title={selected === null ? 'First step' : `After ${selected}`}
                            onPick={pick}
                            onClose={() => setAt(null)}
                        />
                    </GraphOverlay>
                )}
            </PipelineGraph>
        </Stage>
    )
}

const meta: Meta = { title: 'Graphs/Canvas' }
export default meta

type Story = StoryObj

/** An empty canvas says so, and offers no zoom. */
export const Empty: Story = { render: () => <Nothing /> }

/**
 * An empty canvas keeps the app's own buttons in its corner while the zoom buttons step aside. The
 * add button, a `GraphControlButton` in `extraControls`, opens the picker beside itself, above it
 * where there is no room below, and over the canvas's words; pressing it again closes it.
 */
export const EmptyWithTools: Story = { name: 'Empty with tools', render: () => <Adding initial={[]} opened="button" /> }

/** A node box in every state it is drawn in, a critical or warning badge edging it as an issue of its tone would; the last one is chosen. */
export const NodeBoxes: Story = { name: 'Node boxes', render: () => <Boxes /> }

/** A graph none of the views cover, built from the canvas, the node box and the layout hook, with labeled edges. */
export const CustomGraph: Story = { name: 'Custom graph', render: () => <Services /> }

/** Nodes in an app's own states from a `StatusProvider`: each dot in its state's color, an outage and a degraded service edged as an issue is. */
export const AppStates: Story = { name: 'App states', render: () => <Health /> }

/**
 * `/` opens the picker in the middle of the canvas (`at="center"`), and the add button beside the
 * zoom buttons opens it beside itself. The step picked goes after the chosen one, placed beside its
 * box from `nodeBox` on the canvas's controls, on the side its `direction` runs to.
 */
export const KeyboardPicker: Story = { name: 'Keyboard picker', render: () => <Adding initial={NIGHTLY_EXPORT} opened="center" /> }
