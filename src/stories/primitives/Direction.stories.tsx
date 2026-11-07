import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DirectionProvider, useDirection } from '@winterop-com/sokkel-ui/primitives/direction'
import { Slider } from '@winterop-com/sokkel-ui/primitives/slider'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * The text direction Base UI components read for keyboard and layout. The provider sets it;
 * the `dir` attribute on the element still decides how the browser lays text out.
 */
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
            <Stack dir={dir} gap="lg" className="w-full max-w-sm rounded-lg border border-border p-4">
                <Reads />
                <Stack gap="sm">
                    <p className="text-xs text-muted-foreground">Retry limit</p>
                    <Slider defaultValue={[3]} min={0} max={10} />
                </Stack>
                <Row align="stretch" wrap>
                    <Button variant="outline">Cancel</Button>
                    <Button>Run import-orders</Button>
                </Row>
            </Stack>
        </DirectionProvider>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Direction', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Stack gap="sm" className="w-full max-w-sm">
                <Caption>ltr</Caption>
                <Sample dir="ltr" />
            </Stack>
            <Stack gap="sm" className="w-full max-w-sm">
                <Caption>rtl</Caption>
                <Sample dir="rtl" />
            </Stack>
        </Row>
    ),
}

export const NestedLtrIsland: StoryObj = {
    render: () => (
        <DirectionProvider direction="rtl">
            <Stack dir="rtl" className="w-full max-w-md rounded-lg border border-border p-4">
                <Caption>rtl page</Caption>
                <Reads />
                <DirectionProvider direction="ltr">
                    <Stack dir="ltr" gap="sm" className="rounded-md bg-muted p-3">
                        <Caption>ltr island for code</Caption>
                        <Reads />
                        <p className="font-mono text-xs">expression: .orders[].amount | length &gt; 0</p>
                    </Stack>
                </DirectionProvider>
            </Stack>
        </DirectionProvider>
    ),
}
