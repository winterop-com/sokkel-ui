import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileUp, Play, Upload } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'

const meta: Meta = { title: 'Primitives/Display/Empty' }
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
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
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
                </div>
                <div className="flex flex-col gap-2">
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
                </div>
                <div className="flex flex-col gap-2">
                    <Caption>no border, title only</Caption>
                    <Empty>
                        <EmptyHeader>
                            <EmptyTitle>Nothing matches the filter</EmptyTitle>
                        </EmptyHeader>
                    </Empty>
                </div>
            </div>
        </Ground>
    ),
}

export const NoFiles: StoryObj = {
    render: () => (
        <Ground>
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
        </Ground>
    ),
}
