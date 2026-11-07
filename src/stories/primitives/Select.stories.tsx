import type { Meta, StoryObj } from '@storybook/react-vite'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

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

const meta: Meta = { title: 'Primitives/Inputs/Select', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen label="default">
                <StateSelect defaultValue="failed" />
            </Specimen>
            <Specimen label="sm">
                <StateSelect size="sm" defaultValue="failed" />
            </Specimen>
            <Specimen label="placeholder">
                <StateSelect />
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen label="disabled">
                <StateSelect disabled defaultValue="succeeded" />
            </Specimen>
            <Specimen label="invalid">
                <StateSelect triggerProps={{ 'aria-invalid': true }} placeholder="Pick a state" />
            </Specimen>
            <Specimen label="empty">
                <Select items={[]}>
                    <SelectTrigger className="w-40" aria-label="Webhook">
                        <SelectValue placeholder="No webhooks yet" />
                    </SelectTrigger>
                    <SelectContent />
                </Select>
            </Specimen>
        </Row>
    ),
}

const ORDERS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'slowest', label: 'Slowest first' },
]

/** The quiet trigger: a ghost button that shows the chosen value, for a value picked in a bar or beside a heading. */
export const Quiet: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            {(['default', 'sm'] as const).map((size) => (
                <Specimen key={size} label={size}>
                    <Select items={ORDERS} defaultValue="newest">
                        <SelectTrigger variant="quiet" size={size} aria-label="Order">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ORDERS.map((order) => (
                                <SelectItem key={order.value} value={order.value}>
                                    {order.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Specimen>
            ))}
        </Row>
    ),
}

export const Open: StoryObj = {
    render: () => (
        <div className="h-80 pt-16">
            <StateSelect defaultValue="failed" defaultOpen />
        </div>
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
        <Stack gap="sm" className="h-96 max-w-md">
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
        </Stack>
    ),
}
