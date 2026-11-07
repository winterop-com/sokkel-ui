import type { Meta, StoryObj } from '@storybook/react-vite'

import { Skeleton } from '@winterop-com/sokkel-ui/primitives/skeleton'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Display/Skeleton', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            <Specimen below label="line">
                <Skeleton className="h-4 w-48" />
            </Specimen>
            <Specimen below label="short line">
                <Skeleton className="h-3 w-20" />
            </Specimen>
            <Specimen below label="circle">
                <Skeleton className="size-8 rounded-full" />
            </Specimen>
            <Specimen below label="rectangle">
                <Skeleton className="h-20 w-40 rounded-lg" />
            </Specimen>
        </Row>
    ),
}

export const LoadingRuns: StoryObj = {
    render: () => (
        <Stack gap="none" className="max-w-3xl rounded-lg border">
            <Row gap="lg" align="stretch" className="border-b px-3 py-2.5 text-sm font-medium">
                <span className="flex-1">Job</span>
                <span className="w-20">State</span>
                <span className="hidden w-32 sm:block">Started</span>
                <span className="w-14 text-right">Duration</span>
            </Row>
            {[0, 1, 2, 3, 4].map((row) => (
                <Row key={row} gap="lg" className="border-b px-3 py-3 last:border-0">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                    <Skeleton className="hidden h-4 w-32 sm:block" />
                    <Skeleton className="h-4 w-14" />
                </Row>
            ))}
        </Stack>
    ),
}
