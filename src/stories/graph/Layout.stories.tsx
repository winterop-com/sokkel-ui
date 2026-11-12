import type { Meta, StoryObj } from '@storybook/react-vite'
import { Maximize, Minus, Plus } from 'lucide-react'
import { useState } from 'react'

import { Section } from '@winterop-com/sokkel-ui/Section'
import type { GraphControls } from '@winterop-com/sokkel-ui-graph/GraphCanvas'
import { GraphLayoutMenu, type GraphLayoutChoice } from '@winterop-com/sokkel-ui-graph/GraphLayoutMenu'
import { GraphToolbarButton } from '@winterop-com/sokkel-ui-graph/GraphToolbar'
import type { GraphRouting, GraphSpacing } from '@winterop-com/sokkel-ui-graph/layout'
import { PipelineGraph, type PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { RunGraph } from '@winterop-com/sokkel-ui-graph/RunGraph'
import { Stage } from './Frame'
import { FAILED, FAN_OUT_RUN, LARGE, LONG_NAMES, NIGHTLY_EXPORT } from './data'

function Laid({
    steps,
    title,
    meta,
    routing,
    spacing,
    minNodeWidth,
    maxNodeWidth,
    wrapWidth,
    wrapToCanvas,
}: {
    steps: PipelineStep[]
    title: string
    meta: string
    routing?: GraphRouting
    spacing?: GraphSpacing
    wrapWidth?: number
    wrapToCanvas?: boolean
    minNodeWidth?: number
    maxNodeWidth?: number
}) {
    const [selected, setSelected] = useState<string | null>(null)
    return (
        <Stage title={title} meta={meta}>
            <PipelineGraph
                steps={steps}
                selected={selected}
                onSelect={setSelected}
                routing={routing}
                spacing={spacing}
                minNodeWidth={minNodeWidth}
                maxNodeWidth={maxNodeWidth}
                wrapWidth={wrapWidth}
                wrapToCanvas={wrapToCanvas}
                words={{ label: title }}
            />
        </Stage>
    )
}

/** A run in a section whose head carries the layout menu and the zoom buttons, the graph filling the section. */
function InSection() {
    const [layout, setLayout] = useState<GraphLayoutChoice>({ direction: 'right', routing: 'orthogonal', spacing: 'normal' })
    const [controls, setControls] = useState<GraphControls | null>(null)
    return (
        <Stage title="import-orders" meta="Run 01a1a5f8, running">
            <Section
                title="Steps"
                fill
                flush
                className="min-w-0 flex-1"
                actions={
                    <>
                        <GraphLayoutMenu value={layout} onValueChange={setLayout} closeOnChoice />
                        <GraphToolbarButton label="Zoom out" onClick={controls?.zoomOut} disabled={controls === null || controls.empty}>
                            <Minus aria-hidden />
                        </GraphToolbarButton>
                        <GraphToolbarButton label="Zoom in" onClick={controls?.zoomIn} disabled={controls === null || controls.empty}>
                            <Plus aria-hidden />
                        </GraphToolbarButton>
                        <GraphToolbarButton label="Fit the graph" onClick={controls?.fit} disabled={controls === null || controls.empty}>
                            <Maximize aria-hidden />
                        </GraphToolbarButton>
                    </>
                }
            >
                <RunGraph
                    steps={FAN_OUT_RUN}
                    frame="filled"
                    controls={false}
                    onControls={setControls}
                    direction={layout.direction}
                    routing={layout.routing}
                    spacing={layout.spacing}
                    words={{ label: 'import-orders run' }}
                />
            </Section>
        </Stage>
    )
}

const meta: Meta = { title: 'Graphs/Layout' }
export default meta

type Story = StoryObj

/** The default: edges routed in right-angled steps with rounded corners, at the normal spacing. */
export const Orthogonal: Story = {
    render: () => <Laid steps={NIGHTLY_EXPORT} title="nightly-export" meta="harbor, routed orthogonal" />,
}

/** `routing="polyline"`: each edge in straight runs, bending only where elk routes it round a box. */
export const Polyline: Story = {
    render: () => <Laid steps={NIGHTLY_EXPORT} title="nightly-export" meta="harbor, routed as polylines" routing="polyline" />,
}

/** `routing="splines"`: each edge a curve elk routes between the ranks. */
export const Splines: Story = {
    render: () => <Laid steps={NIGHTLY_EXPORT} title="nightly-export" meta="harbor, routed as splines" routing="splines" />,
}

/** `spacing="compact"`: ranks and boxes closer together, for a dense graph in a small panel. */
export const Compact: Story = {
    render: () => <Laid steps={NIGHTLY_EXPORT} title="nightly-export" meta="harbor, compact" spacing="compact" />,
}

/** `spacing="roomy"`: wider gaps between ranks and boxes, for a graph that is read rather than scanned. */
export const Roomy: Story = {
    render: () => <Laid steps={NIGHTLY_EXPORT} title="nightly-export" meta="harbor, roomy" spacing="roomy" />,
}

/**
 * Each box as wide as its words, between `minNodeWidth` 96 and `maxNodeWidth` 360: the short steps
 * keep the narrowest box, and the longest name ends in an ellipsis and shows whole on pointing.
 */
export const NodeWidths: Story = {
    name: 'Node widths',
    render: () => (
        <Laid steps={LONG_NAMES} title="import-orders" meta="harbor, boxes 96 to 360 wide" minNodeWidth={96} maxNodeWidth={360} />
    ),
}

/** Every box one width, `minNodeWidth` and `maxNodeWidth` both 160, so the ranks line up as a grid. */
export const FixedWidth: Story = {
    name: 'Fixed width',
    render: () => <Laid steps={LONG_NAMES} title="import-orders" meta="harbor, every box 160 wide" minNodeWidth={160} maxNodeWidth={160} />,
}

/** A failed run routed as splines at the compact spacing, the options together on a run. */
export const RunInSplines: Story = {
    name: 'Run in splines',
    render: () => (
        <Stage title="nightly-export" meta="Run 01a1a5c2, failed">
            <RunGraph steps={FAILED} routing="splines" spacing="compact" words={{ label: 'nightly-export run' }} />
        </Stage>
    ),
}

/**
 * `wrapToCanvas` with `wrapWidth={1120}`: rebuild-index, too wide for one row, cut into rows as wide
 * as the canvas holds at the least fit zoom and never past 1120px, stacked down, each carrying on
 * from the one above.
 */
export const Wrapped: Story = {
    render: () => <Laid steps={LARGE} title="rebuild-index" meta="harbor, 57 steps wrapped to the canvas" wrapWidth={1120} wrapToCanvas />,
}

/**
 * A run filling a section (`frame="filled"`: the section's own ground, no dots, each wheel notch one
 * zoom step), its head carrying a `GraphLayoutMenu` that closes on a choice and zoom buttons reached through `onControls`.
 * Choosing another layout fits the graph again, even after it was moved.
 */
export const InASection: Story = { name: 'In a section', render: () => <InSection /> }
