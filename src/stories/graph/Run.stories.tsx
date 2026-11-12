import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { formatDuration } from '@winterop-com/sokkel-ui-graph/GraphNode'
import { RunGraph, type RunStep } from '@winterop-com/sokkel-ui-graph/RunGraph'
import { Inspector, InspectorSection } from '@winterop-com/sokkel-ui/Inspector'
import { Fill } from '@winterop-com/sokkel-ui/Layout'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Stage } from './Frame'
import { FAILED, FAN_OUT_RUN, RUNNING } from './data'

function Run({ steps, meta }: { steps: RunStep[]; meta: string }) {
    const [selected, setSelected] = useState<string | null>(null)
    return (
        <Stage title="nightly-export" meta={meta}>
            <RunGraph steps={steps} selected={selected} onSelect={setSelected} words={{ label: 'nightly-export run' }} />
        </Stage>
    )
}

function Inspected() {
    const [selected, setSelected] = useState<string | null>('transform')
    const step = RUNNING.find((each) => each.code === selected)
    return (
        <Stage title="nightly-export" meta="Run 01a1a5b9, started by ada">
            <Fill>
                <RunGraph steps={RUNNING} selected={selected} onSelect={setSelected} words={{ label: 'nightly-export run' }} />
            </Fill>
            {step !== undefined && (
                <Inspector
                    title={step.name ?? <span className="font-mono">{step.code}</span>}
                    code={step.name === undefined ? undefined : step.code}
                    status={<StatusChip status={step.status} />}
                    onClose={() => setSelected(null)}
                    className="max-w-full max-md:max-h-72"
                >
                    <InspectorSection title="Step">
                        <DescriptionList
                            items={[
                                { term: 'Kind', value: step.kind, code: true },
                                { term: 'Needs', value: step.needs.join(', '), code: true },
                                { term: 'Took', value: step.duration_ms === undefined ? undefined : formatDuration(step.duration_ms) },
                                {
                                    term: 'Progress',
                                    value: step.progress === undefined ? undefined : `${String(Math.round(step.progress * 100))}%`,
                                },
                            ]}
                        />
                    </InspectorSection>
                </Inspector>
            )}
        </Stage>
    )
}

const meta: Meta = { title: 'Graphs/Run' }
export default meta

type Story = StoryObj

/** A run partway through: two fetches done, transform running with its progress along its foot, the rest queued behind dashed edges. */
export const Running: Story = { render: () => <Run steps={RUNNING} meta="Run 01a1a5b9, running" /> }

/** A run that failed at validate: the failure is the one box drawn in its color, and the steps after it were skipped. */
export const Failed: Story = { render: () => <Run steps={FAILED} meta="Run 01a1a5c2, failed" /> }

/**
 * A run with a source and a fan-out: the source dashed on the ground, split's regions as chips with
 * their states and a retry's countdown, archive's items counted at the end of its code line, and the edge from fetch into the
 * running archive flowing (standing lit with motion reduced). Pointing at a box says what it is doing.
 */
export const FanOut: Story = {
    name: 'Fan-out',
    render: () => (
        <Stage title="import-orders" meta="Run 01a1a5f8, running">
            <RunGraph steps={FAN_OUT_RUN} words={{ label: 'import-orders run' }} />
        </Stage>
    ),
}

/** The run beside an inspector on the chosen step; choosing another box changes the panel, and the ground clears it. */
export const WithInspector: Story = { name: 'With inspector', render: () => <Inspected /> }
