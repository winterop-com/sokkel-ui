import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Field, FieldDescription, FieldLabel } from '../../components/ui/field'
import { Slider } from '../../components/ui/slider'
import { Row, Stack } from '../../components/Layout'

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Stack align="start" className="w-full max-w-xs">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </Stack>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Slider', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="2xl" align="stretch" wrap>
            <Labeled label="single">
                <Slider aria-label="Concurrency" defaultValue={[40]} />
            </Labeled>
            <Labeled label="range">
                <Slider aria-label="Duration range" defaultValue={[20, 70]} />
            </Labeled>
            <Labeled label="stepped">
                <Slider aria-label="Retries" defaultValue={[3]} min={0} max={10} step={1} />
            </Labeled>
            <Labeled label="vertical">
                <div className="h-40">
                    <Slider aria-label="Share of rows" orientation="vertical" defaultValue={[60]} />
                </div>
            </Labeled>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="2xl" align="stretch" wrap>
            <Labeled label="disabled">
                <Slider aria-label="Concurrency" disabled defaultValue={[40]} />
            </Labeled>
            <Labeled label="at minimum">
                <Slider aria-label="Concurrency" defaultValue={[0]} />
            </Labeled>
            <Labeled label="at maximum">
                <Slider aria-label="Concurrency" defaultValue={[100]} />
            </Labeled>
        </Row>
    ),
}

function Concurrency() {
    const [value, setValue] = useState(4)
    return (
        <Field className="max-w-md">
            <Row gap="none" justify="between">
                <FieldLabel>Concurrent runs</FieldLabel>
                <span className="font-mono text-sm tabular-nums">{value}</span>
            </Row>
            <Slider
                aria-label="Concurrent runs"
                value={[value]}
                min={1}
                max={16}
                step={1}
                onValueChange={(next) => setValue(Array.isArray(next) ? next[0] : next)}
            />
            <FieldDescription>
                How many runs of sync-inventory may be running at once. Further runs queue until one finishes.
            </FieldDescription>
        </Field>
    )
}

export const RunConcurrency: StoryObj = { render: () => <Concurrency /> }
