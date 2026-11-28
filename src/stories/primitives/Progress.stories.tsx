import type { Meta, StoryObj } from '@storybook/react-vite'

import { Progress, ProgressLabel, ProgressValue } from '@winterop-com/sokkel-ui/primitives/progress'
import { ProgressRing } from '@winterop-com/sokkel-ui/primitives/progress-ring'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Surface } from '@winterop-com/sokkel-ui/Section'

const meta: Meta = { title: 'Primitives/Display/Progress', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

/** A bar at several values, and one with its label and value. */
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

/**
 * Waiting with no share to tell, nearly done, and done. The value is said as `DownloadButton` says
 * its share: a bar just short of its end reads >99%, never 100% before it is.
 */
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
                <Caption>nearly done (99.6)</Caption>
                <Progress value={99.6}>
                    <ProgressLabel>Rows written</ProgressLabel>
                    <ProgressValue />
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

/**
 * The ring that stands where a bar has no room, as on an upload in a list: empty, under way, nearly
 * done and done, then at a larger size beside its label. It fills clockwise from the top.
 */
export const Ring: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-md">
            <Row gap="lg">
                {[0, 0.25, 0.6, 0.95, 1].map((value) => (
                    <Stack key={value} gap="xs" align="center">
                        <ProgressRing value={value} label="Upload progress" />
                        <Caption>{Math.round(value * 100)}%</Caption>
                    </Stack>
                ))}
            </Row>
            <Row gap="sm">
                <ProgressRing value={0.42} label="orders-2026-08.csv" className="size-6" />
                <span className="text-sm">
                    Uploading <span className="font-mono">orders-2026-08.csv</span>
                </span>
            </Row>
        </Stack>
    ),
}

/** A backfill's progress counted in months, with what it is writing now. */
export const RunningExport: StoryObj = {
    render: () => (
        <Surface pad className="max-w-lg">
            <Stack gap="lg">
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
        </Surface>
    ),
}
