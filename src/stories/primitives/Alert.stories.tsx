import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleAlert, Info, RefreshCw } from 'lucide-react'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'

const meta: Meta = { title: 'Primitives/Display/Alert' }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-6">{children}</div>
        </div>
    )
}

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-2">
                <Caption>default</Caption>
                <Alert>
                    <Info />
                    <AlertTitle>The harbor project moves to a new region tonight</AlertTitle>
                    <AlertDescription>Jobs keep running; expect a short pause at 02:00.</AlertDescription>
                </Alert>
            </div>
            <div className="flex max-w-xl flex-col gap-2">
                <Caption>destructive</Caption>
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>The upload was refused</AlertTitle>
                    <AlertDescription>orders-2026-10.csv is larger than the 50 MB limit.</AlertDescription>
                </Alert>
            </div>
            <div className="flex max-w-xl flex-col gap-2">
                <Caption>title only, no icon</Caption>
                <Alert>
                    <AlertTitle>Runs are paused for nightly-export.</AlertTitle>
                </Alert>
            </div>
        </Ground>
    ),
}

export const WithAction: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-2">
                <Caption>with an action</Caption>
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>Run 01a1a5c2 failed</AlertTitle>
                    <AlertDescription>
                        Step <span className="font-mono">validate</span> stopped the run at 2026-11-04 14:02.
                    </AlertDescription>
                    <AlertAction>
                        <Button size="xs" variant="outline">
                            <RefreshCw data-icon="inline-start" />
                            Retry
                        </Button>
                    </AlertAction>
                </Alert>
            </div>
        </Ground>
    ),
}
