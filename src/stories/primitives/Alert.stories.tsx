import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleAlert, Info, RefreshCw } from 'lucide-react'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Stack } from '../../components/Layout'

const meta: Meta = { title: 'Primitives/Display/Alert', parameters: { frame: 'padded' } }
export default meta

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="xl" className="mx-auto max-w-[1100px]">
            {children}
        </Stack>
    )
}

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <Stack gap="sm" className="max-w-xl">
                <Caption>default</Caption>
                <Alert>
                    <Info />
                    <AlertTitle>The harbor project moves to a new region tonight</AlertTitle>
                    <AlertDescription>Jobs keep running; expect a short pause at 02:00.</AlertDescription>
                </Alert>
            </Stack>
            <Stack gap="sm" className="max-w-xl">
                <Caption>destructive</Caption>
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>The upload was refused</AlertTitle>
                    <AlertDescription>orders-2026-10.csv is larger than the 50 MB limit.</AlertDescription>
                </Alert>
            </Stack>
            <Stack gap="sm" className="max-w-xl">
                <Caption>title only, no icon</Caption>
                <Alert>
                    <AlertTitle>Runs are paused for nightly-export.</AlertTitle>
                </Alert>
            </Stack>
        </Ground>
    ),
}

export const WithAction: StoryObj = {
    render: () => (
        <Ground>
            <Stack gap="sm" className="max-w-xl">
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
            </Stack>
        </Ground>
    ),
}
