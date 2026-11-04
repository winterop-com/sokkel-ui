import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PipelineGraph, type PipelineStep } from '../../components/graph/PipelineGraph'
import { Section } from '../../components/Section'
import type { GraphDirection } from '../../components/graph/layout'
import { Editor } from './Editing'
import { Stage } from './Frame'
import { LARGE, NIGHTLY_EXPORT, SHORT } from './data'

function Pipeline({ steps, title, meta, direction }: { steps: PipelineStep[]; title: string; meta: string; direction?: GraphDirection }) {
    const [selected, setSelected] = useState<string | null>(null)
    return (
        <Stage title={title} meta={meta}>
            <PipelineGraph steps={steps} selected={selected} onSelect={setSelected} direction={direction} words={{ label: title }} />
        </Stage>
    )
}

function Fitted() {
    const [selected, setSelected] = useState<string | null>('transform')
    return (
        <div className="min-h-svh bg-background p-4 text-foreground md:p-6">
            <div className="flex flex-col gap-4">
                <Section title="Steps" meta="7">
                    <PipelineGraph
                        steps={NIGHTLY_EXPORT}
                        frame="fitted"
                        selected={selected}
                        onSelect={setSelected}
                        words={{ label: 'nightly-export' }}
                    />
                </Section>
                <p className="text-sm text-muted-foreground">
                    The graph is as tall as its drawing. The wheel scrolls the page past it; hold ctrl or cmd, or pinch, to zoom it.
                </p>
            </div>
        </div>
    )
}

const meta: Meta = { title: 'Graphs/Pipeline' }
export default meta

type Story = StoryObj

/** Three steps in a row, each titled by its code. */
export const Short: Story = { render: () => <Pipeline steps={SHORT} title="sync-inventory" meta="harbor" /> }

/** A pipeline that fans in and out: named steps carry their code and kind on the line beneath. */
export const Branching: Story = { render: () => <Pipeline steps={NIGHTLY_EXPORT} title="nightly-export" meta="harbor" /> }

/** The same pipeline drawn top to bottom, so edges leave a box's foot and arrive at the next one's head. */
export const Down: Story = {
    render: () => <Pipeline steps={NIGHTLY_EXPORT} title="nightly-export" meta="harbor, drawn down" direction="down" />,
}

/** The pipeline on a page, in a section as tall as its drawing, with one step chosen. */
export const OnAPage: Story = { name: 'On a page', render: () => <Fitted /> }

/** 57 steps: too wide to fit at a readable zoom, so the fit stops at its floor and the graph starts at the left edge. */
export const Large: Story = { render: () => <Pipeline steps={LARGE} title="rebuild-index" meta="larkspur, 57 steps" /> }

/** The pipeline as an editor with local state: drag from a port to connect, Delete removes the chosen step or edge, a box drags, right-click opens its menu, and a connection dropped on empty ground adds a step there. */
export const Editing: Story = { render: () => <Editor /> }
