import type { Meta, StoryObj } from '@storybook/react-vite'

import { Progress, ProgressLabel, ProgressValue } from '@winterop-com/sokkel-ui/primitives/progress'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Display/Progress', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-md">
            {[0, 25, 60, 100].map((value) => (
                <Stack key={value} gap="sm">
                    <Caption>{value}%, bar only</Caption>
                    <Progress value={value} aria-label="Upload progress" />
                </Stack>
            ))}
            <Stack gap="sm">
                <Caption>with label and value</Caption>
                <Progress value={42}>
                    <ProgressLabel>Rows written</ProgressLabel>
                    <ProgressValue />
                </Progress>
            </Stack>
        </Stack>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-md">
            <Stack gap="sm">
                <Caption>indeterminate (value null)</Caption>
                <Progress value={null}>
                    <ProgressLabel>Waiting for harbor</ProgressLabel>
                </Progress>
            </Stack>
            <Stack gap="sm">
                <Caption>complete</Caption>
                <Progress value={100}>
                    <ProgressLabel>Done</ProgressLabel>
                    <ProgressValue />
                </Progress>
            </Stack>
        </Stack>
    ),
}

export const RunningExport: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-lg rounded-lg border p-4">
            <Row align="baseline" justify="between" wrap>
                <p className="text-sm font-medium">
                    Backfill of <span className="font-mono">nightly-export</span>
                </p>
                <span className="text-xs text-muted-foreground tabular-nums">started 2026-11-04 14:02</span>
            </Row>
            <Progress value={7} max={12}>
                <ProgressLabel>Months exported</ProgressLabel>
                <ProgressValue>{(_, value) => `${value ?? 0} of 12`}</ProgressValue>
            </Progress>
            <p className="text-xs text-muted-foreground">
                Writing <span className="font-mono">orders-2026-08.csv</span>, about 1.2s a month.
            </p>
        </Stack>
    ),
}
