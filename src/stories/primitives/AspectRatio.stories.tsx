import type { Meta, StoryObj } from '@storybook/react-vite'

import { AspectRatio } from '@winterop-com/sokkel-ui/primitives/aspect-ratio'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Display/AspectRatio', parameters: { frame: 'column' } }
export default meta

const RATIOS = [
    ['16 / 9', 16 / 9],
    ['4 / 3', 4 / 3],
    ['1 / 1', 1],
    ['21 / 9', 21 / 9],
] as const

export const Variants: StoryObj = {
    render: () => (
        <Columns count={4}>
            {RATIOS.map(([label, ratio]) => (
                <Stack key={label} gap="sm">
                    <AspectRatio ratio={ratio} className="rounded-lg border bg-muted">
                        <Row as="span" gap="none" justify="center" className="absolute inset-0 font-mono text-xs text-muted-foreground">
                            {label}
                        </Row>
                    </AspectRatio>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </Stack>
            ))}
        </Columns>
    ),
}

const DAILY_ORDERS = [42, 55, 38, 61, 70, 48, 52, 66, 74, 59, 63, 80, 71, 68]

export const FilePreview: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-xl">
            <p className="text-sm font-medium">
                Preview of <span className="font-mono">orders-2026-10.csv</span>
            </p>
            <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border bg-card">
                <Row gap="2xs" align="end" className="absolute inset-0 p-4">
                    {DAILY_ORDERS.map((count, day) => (
                        <div key={day} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${count}%` }} />
                    ))}
                </Row>
            </AspectRatio>
            <p className="text-xs text-muted-foreground">Orders a day, 2026-10-01 to 2026-10-14.</p>
        </Stack>
    ),
}
