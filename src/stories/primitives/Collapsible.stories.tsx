import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronRightIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '../../components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible'

/** A region a trigger shows and hides. It carries no styling of its own; the story draws it. */
function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Step({ open, disabled }: { open?: boolean; disabled?: boolean }) {
    return (
        <Collapsible defaultOpen={open} disabled={disabled} className="w-full max-w-md rounded-lg border border-border">
            <CollapsibleTrigger render={<Button variant="ghost" className="group w-full justify-start rounded-b-none" />}>
                <ChevronRightIcon className="transition-transform group-data-panel-open:rotate-90" />
                <span className="font-mono">gate</span>
                <span className="ml-auto text-xs text-muted-foreground">jq.assert</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border px-3 py-2 font-mono text-xs text-muted-foreground">
                expression: .properties.timeseries | length &gt; 0
            </CollapsibleContent>
        </Collapsible>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Collapsible' }
export default meta

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-2">
                <Caption>closed</Caption>
                <Step />
            </div>
            <div className="flex flex-col gap-2">
                <Caption>open</Caption>
                <Step open />
            </div>
            <div className="flex flex-col gap-2">
                <Caption>disabled</Caption>
                <Step disabled />
            </div>
        </Ground>
    ),
}

const STEPS = [
    { code: 'fetch', block: 'http.get', with: 'connection: met-no', took: '0.2s' },
    { code: 'gate', block: 'jq.assert', with: 'expression: .properties.timeseries | length > 0', took: '0.1s' },
    { code: 'store', block: 'dhis2.data-values', with: 'connection: dhis2-play', took: '-' },
]

function PipelineSteps() {
    const [open, setOpen] = useState<string | null>('gate')
    return (
        <div className="flex w-full max-w-xl flex-col divide-y divide-border rounded-lg border border-border">
            {STEPS.map((step) => (
                <Collapsible key={step.code} open={open === step.code} onOpenChange={(next) => setOpen(next ? step.code : null)}>
                    <CollapsibleTrigger render={<Button variant="ghost" className="group w-full justify-start rounded-none" />}>
                        <ChevronRightIcon className="transition-transform group-data-panel-open:rotate-90" />
                        <span className="font-mono">{step.code}</span>
                        <span className="text-xs text-muted-foreground">{step.block}</span>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{step.took}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 py-2 font-mono text-xs text-muted-foreground">{step.with}</CollapsibleContent>
                </Collapsible>
            ))}
        </div>
    )
}

export const Steps: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-2">
                <h2 className="text-sm font-medium">
                    Steps of <span className="font-mono">weather-gate</span>
                </h2>
                <PipelineSteps />
            </div>
        </Ground>
    ),
}
