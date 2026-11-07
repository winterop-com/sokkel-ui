import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileUp, Play, Upload } from 'lucide-react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'

const meta: Meta = { title: 'Primitives/Display/Empty', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <Columns>
            <Stack gap="sm">
                <Caption>media: icon</Caption>
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <Play />
                        </EmptyMedia>
                        <EmptyTitle>No runs yet</EmptyTitle>
                        <EmptyDescription>Runs appear here once the job has run.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Stack>
            <Stack gap="sm">
                <Caption>media: default</Caption>
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia>
                            <Play className="size-6 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle>No runs yet</EmptyTitle>
                        <EmptyDescription>Runs appear here once the job has run.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            </Stack>
            <Stack gap="sm">
                <Caption>no border, title only</Caption>
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>Nothing matches the filter</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            </Stack>
        </Columns>
    ),
}

export const NoFiles: StoryObj = {
    render: () => (
        <Empty className="border">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FileUp />
                </EmptyMedia>
                <EmptyTitle>No files in harbor</EmptyTitle>
                <EmptyDescription>
                    Upload a file, such as orders-2026-10.csv, or let a job write one here. <a href="#">Read about file formats</a>.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button>
                    <Upload data-icon="inline-start" />
                    Upload a file
                </Button>
            </EmptyContent>
        </Empty>
    ),
}
