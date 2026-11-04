import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Field, FieldDescription, FieldLabel } from '../../components/ui/field'
import { Slider } from '../../components/ui/slider'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex w-full max-w-xs flex-col items-start gap-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Slider' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-8">
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
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-8">
                <Labeled label="disabled">
                    <Slider aria-label="Concurrency" disabled defaultValue={[40]} />
                </Labeled>
                <Labeled label="at minimum">
                    <Slider aria-label="Concurrency" defaultValue={[0]} />
                </Labeled>
                <Labeled label="at maximum">
                    <Slider aria-label="Concurrency" defaultValue={[100]} />
                </Labeled>
            </div>
        </Ground>
    ),
}

function Concurrency() {
    const [value, setValue] = useState(4)
    return (
        <Ground>
            <Field className="max-w-md">
                <div className="flex items-center justify-between">
                    <FieldLabel>Concurrent runs</FieldLabel>
                    <span className="font-mono text-sm tabular-nums">{value}</span>
                </div>
                <Slider
                    aria-label="Concurrent runs"
                    value={[value]}
                    min={1}
                    max={16}
                    step={1}
                    onValueChange={(next) => setValue(Array.isArray(next) ? next[0] : next)}
                />
                <FieldDescription>
                    How many runs of weather-gate may be running at once. Further triggers queue until one finishes.
                </FieldDescription>
            </Field>
        </Ground>
    )
}

export const RunConcurrency: StoryObj = { render: () => <Concurrency /> }
