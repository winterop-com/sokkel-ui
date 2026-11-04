import type { Meta, StoryObj } from '@storybook/react-vite'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'

const meta: Meta = { title: 'Primitives/Display/Spinner' }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            {children}
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    )
}

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                <Labeled label="size-3">
                    <Spinner className="size-3" />
                </Labeled>
                <Labeled label="default (size-4)">
                    <Spinner />
                </Labeled>
                <Labeled label="size-6">
                    <Spinner className="size-6" />
                </Labeled>
                <Labeled label="muted">
                    <Spinner className="text-muted-foreground" />
                </Labeled>
                <Labeled label="running ink">
                    <Spinner className="text-status-running-ink" />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const InContext: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-center gap-4">
                <Labeled label="in a disabled button">
                    <Button disabled>
                        <Spinner data-icon="inline-start" />
                        Running
                    </Button>
                </Labeled>
                <Labeled label="in a badge">
                    <Badge className="bg-status-running/15 text-status-running-ink">
                        <Spinner data-icon="inline-start" />
                        running
                    </Badge>
                </Labeled>
                <Labeled label="beside text">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner />
                        Running <span className="font-mono">sync-inventory</span>
                    </p>
                </Labeled>
            </div>
        </Ground>
    ),
}
