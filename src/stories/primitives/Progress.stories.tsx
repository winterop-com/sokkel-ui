import type { Meta, StoryObj } from '@storybook/react-vite'

import { Progress, ProgressLabel, ProgressValue } from '../../components/ui/progress'

const meta: Meta = { title: 'Primitives/Display/Progress' }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-md flex-col gap-6">
                {[0, 25, 60, 100].map((value) => (
                    <div key={value} className="flex flex-col gap-2">
                        <Caption>{value}%, bar only</Caption>
                        <Progress value={value} aria-label="Upload progress" />
                    </div>
                ))}
                <div className="flex flex-col gap-2">
                    <Caption>with label and value</Caption>
                    <Progress value={42}>
                        <ProgressLabel>Rows written</ProgressLabel>
                        <ProgressValue />
                    </Progress>
                </div>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-md flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <Caption>indeterminate (value null)</Caption>
                    <Progress value={null}>
                        <ProgressLabel>Waiting for harbor</ProgressLabel>
                    </Progress>
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>complete</Caption>
                    <Progress value={100}>
                        <ProgressLabel>Done</ProgressLabel>
                        <ProgressValue />
                    </Progress>
                </div>
            </div>
        </Ground>
    ),
}

export const RunningExport: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-lg flex-col gap-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">
                        Backfill of <span className="font-mono">nightly-export</span>
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums">started 2026-11-04 14:02</span>
                </div>
                <Progress value={7} max={12}>
                    <ProgressLabel>Months exported</ProgressLabel>
                    <ProgressValue>{(_, value) => `${value ?? 0} of 12`}</ProgressValue>
                </Progress>
                <p className="text-xs text-muted-foreground">
                    Writing <span className="font-mono">orders-2026-08.csv</span>, about 1.2s a month.
                </p>
            </div>
        </Ground>
    ),
}
