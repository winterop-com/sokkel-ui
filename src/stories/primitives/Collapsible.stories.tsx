import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronRightIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@winterop-com/sokkel-ui/primitives/collapsible'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/** A region a trigger shows and hides. It carries no styling of its own; the story draws it. */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Step({ open, disabled }: { open?: boolean; disabled?: boolean }) {
    return (
        <Collapsible defaultOpen={open} disabled={disabled} className="w-full max-w-md rounded-lg border border-border">
            <CollapsibleTrigger render={<Button variant="ghost" className="group w-full justify-start rounded-b-none" />}>
                <ChevronRightIcon className="transition-transform group-data-panel-open:rotate-90" />
                <span className="font-mono">validate</span>
                <span className="ml-auto text-xs text-muted-foreground">rows.check</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border px-3 py-2 font-mono text-xs text-muted-foreground">
                rules: orders, on_invalid: fail
            </CollapsibleContent>
        </Collapsible>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Collapsible', parameters: { frame: 'column' } }
export default meta

export const States: StoryObj = {
    render: () => (
        <>
            <Stack gap="sm">
                <Caption>closed</Caption>
                <Step />
            </Stack>
            <Stack gap="sm">
                <Caption>open</Caption>
                <Step open />
            </Stack>
            <Stack gap="sm">
                <Caption>disabled</Caption>
                <Step disabled />
            </Stack>
        </>
    ),
}

const STEPS = [
    { code: 'fetch', uses: 'http.get', with: 'url: https://files.example.org/orders-2026-10.csv', took: '0.2s' },
    { code: 'validate', uses: 'rows.check', with: 'rules: orders, on_invalid: fail', took: '0.1s' },
    { code: 'upload', uses: 'bucket.put', with: 'bucket: harbor-exports', took: '-' },
]

function JobSteps() {
    const [open, setOpen] = useState<string | null>('validate')
    return (
        <Stack gap="none" className="w-full max-w-xl divide-y divide-border rounded-lg border border-border">
            {STEPS.map((step) => (
                <Collapsible key={step.code} open={open === step.code} onOpenChange={(next) => setOpen(next ? step.code : null)}>
                    <CollapsibleTrigger render={<Button variant="ghost" className="group w-full justify-start rounded-none" />}>
                        <ChevronRightIcon className="transition-transform group-data-panel-open:rotate-90" />
                        <span className="font-mono">{step.code}</span>
                        <span className="text-xs text-muted-foreground">{step.uses}</span>
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{step.took}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 py-2 font-mono text-xs text-muted-foreground">{step.with}</CollapsibleContent>
                </Collapsible>
            ))}
        </Stack>
    )
}

export const Steps: StoryObj = {
    render: () => (
        <Stack gap="sm">
            <h2 className="text-sm font-medium">
                Steps of <span className="font-mono">import-orders</span>
            </h2>
            <JobSteps />
        </Stack>
    ),
}
