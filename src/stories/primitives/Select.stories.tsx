import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const STATES = [
    { value: 'succeeded', label: 'succeeded' },
    { value: 'failed', label: 'failed' },
    { value: 'running', label: 'running' },
    { value: 'queued', label: 'queued' },
    { value: 'cancelled', label: 'cancelled' },
]

function StateSelect({
    size,
    placeholder = 'Any state',
    triggerProps,
    ...props
}: {
    size?: 'sm' | 'default'
    placeholder?: string
    triggerProps?: React.ComponentProps<typeof SelectTrigger>
} & Omit<React.ComponentProps<typeof Select<string>>, 'items' | 'children'>) {
    return (
        <Select items={STATES} {...props}>
            <SelectTrigger size={size} className="w-40" aria-label="Run state" {...triggerProps}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                        {state.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Select' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                <Labeled label="default">
                    <StateSelect defaultValue="failed" />
                </Labeled>
                <Labeled label="sm">
                    <StateSelect size="sm" defaultValue="failed" />
                </Labeled>
                <Labeled label="placeholder">
                    <StateSelect />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                <Labeled label="disabled">
                    <StateSelect disabled defaultValue="succeeded" />
                </Labeled>
                <Labeled label="invalid">
                    <StateSelect triggerProps={{ 'aria-invalid': true }} placeholder="Pick a state" />
                </Labeled>
                <Labeled label="empty">
                    <Select items={[]}>
                        <SelectTrigger className="w-40" aria-label="Webhook">
                            <SelectValue placeholder="No webhooks yet" />
                        </SelectTrigger>
                        <SelectContent />
                    </Select>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const Open: StoryObj = {
    render: () => (
        <Ground>
            <div className="h-80 pt-16">
                <StateSelect defaultValue="failed" defaultOpen />
            </div>
        </Ground>
    ),
}

const SOURCES = [
    { value: 'api', label: 'api', kind: 'service' },
    { value: 'worker', label: 'worker', kind: 'service' },
    { value: 'orders-feed', label: 'orders-feed', kind: 'webhook' },
    { value: 'harbor-exports', label: 'harbor-exports', kind: 'bucket' },
]

export const StepSource: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex h-96 max-w-md flex-col gap-2">
                <p className="text-sm font-medium">Source for step fetch</p>
                <Select items={SOURCES} defaultValue="api" defaultOpen>
                    <SelectTrigger className="w-full" aria-label="Source">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                            <SelectLabel>Services</SelectLabel>
                            {SOURCES.filter((c) => c.kind === 'service').map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    <span className="font-mono">{c.label}</span>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>Other</SelectLabel>
                            {SOURCES.filter((c) => c.kind !== 'service').map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    <span className="font-mono">{c.label}</span>
                                    <span className="text-xs text-muted-foreground">{c.kind}</span>
                                </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectItem value="disabled" disabled>
                            scheduler (unreachable)
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </Ground>
    ),
}
