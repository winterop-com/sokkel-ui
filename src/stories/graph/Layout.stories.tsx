import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import type { GraphRouting, GraphSpacing } from '@winterop-com/sokkel-ui-graph/layout'
import { PipelineGraph, type PipelineStep } from '@winterop-com/sokkel-ui-graph/PipelineGraph'
import { RunGraph } from '@winterop-com/sokkel-ui-graph/RunGraph'
import { Stage } from './Frame'
import { FAILED, LONG_NAMES, NIGHTLY_EXPORT } from './data'

function Laid({
    steps,
    title,
    meta,
    routing,
    spacing,
    minNodeWidth,
    maxNodeWidth,
}: {
    steps: PipelineStep[]
    title: string
    meta: string
    routing?: GraphRouting
    spacing?: GraphSpacing
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
                words={{ label: title }}
            />
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
