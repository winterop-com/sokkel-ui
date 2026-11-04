import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Button } from '../../components/ui/button'
import { DirectionProvider, useDirection } from '../../components/ui/direction'
import { Slider } from '../../components/ui/slider'

/**
 * The text direction Base UI components read for keyboard and layout. The provider sets it;
 * the `dir` attribute on the element still decides how the browser lays text out.
 */
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

function Reads() {
    const direction = useDirection()
    return (
        <p className="text-sm">
            useDirection() reads <span className="font-mono">{direction}</span>
        </p>
    )
}

function Sample({ dir }: { dir: 'ltr' | 'rtl' }) {
    return (
        <DirectionProvider direction={dir}>
            <div dir={dir} className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border p-4">
                <Reads />
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Retry limit</p>
                    <Slider defaultValue={[3]} min={0} max={10} />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>Run weather-gate</Button>
                </div>
            </div>
        </DirectionProvider>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Direction' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <div className="flex w-full max-w-sm flex-col gap-2">
                    <Caption>ltr</Caption>
                    <Sample dir="ltr" />
                </div>
                <div className="flex w-full max-w-sm flex-col gap-2">
                    <Caption>rtl</Caption>
                    <Sample dir="rtl" />
                </div>
            </div>
        </Ground>
    ),
}

export const NestedLtrIsland: StoryObj = {
    render: () => (
        <Ground>
            <DirectionProvider direction="rtl">
                <div dir="rtl" className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-border p-4">
                    <Caption>rtl page</Caption>
                    <Reads />
                    <DirectionProvider direction="ltr">
                        <div dir="ltr" className="flex flex-col gap-2 rounded-md bg-muted p-3">
                            <Caption>ltr island for code</Caption>
                            <Reads />
                            <p className="font-mono text-xs">expression: .properties.timeseries | length &gt; 0</p>
                        </div>
                    </DirectionProvider>
                </div>
            </DirectionProvider>
        </Ground>
    ),
}
