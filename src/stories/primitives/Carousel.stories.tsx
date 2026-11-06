import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { StatusChip, type Status } from '../../components/StatusChip'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../../components/ui/carousel'
import { Row, Stack } from '../../components/Layout'

/** A row of slides that scrolls one or several at a time, with buttons either side. */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const JOBS: { code: string; name: string; status: Status; at: string; took: string }[] = [
    { code: 'import-orders', name: 'Import orders', status: 'failed', at: '2026-11-04 14:02', took: '0.3s' },
    { code: 'nightly-export', name: 'Nightly export', status: 'succeeded', at: '2026-11-04 14:00', took: '1.2s' },
    { code: 'rebuild-index', name: 'Rebuild index', status: 'succeeded', at: '2026-11-04 09:21', took: '3.8s' },
    { code: 'sync-inventory', name: 'Sync inventory', status: 'running', at: '2026-11-04 14:04', took: '-' },
    { code: 'send-digest', name: 'Send digest', status: 'queued', at: '2026-11-04 14:05', took: '-' },
]

function JobCard({ job }: { job: (typeof JOBS)[number] }) {
    return (
        <Stack gap="sm" className="h-full rounded-lg border border-border bg-card p-4 text-card-foreground">
            <Row align="start" justify="between">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{job.code}</p>
                </div>
                <StatusChip status={job.status} />
            </Row>
            <p className="mt-auto text-xs text-muted-foreground tabular-nums">
                {job.at}, {job.took}
            </p>
        </Stack>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Carousel', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <>
            <Stack gap="sm" className="px-12">
                <Caption>horizontal, one slide at a time</Caption>
                <Carousel className="w-full max-w-sm">
                    <CarouselContent>
                        {JOBS.map((job) => (
                            <CarouselItem key={job.code}>
                                <JobCard job={job} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </Stack>
            <Stack gap="sm" className="px-12">
                <Caption>vertical</Caption>
                <Carousel orientation="vertical" opts={{ align: 'start' }} className="my-12 w-full max-w-sm">
                    <CarouselContent className="h-48">
                        {JOBS.map((job) => (
                            <CarouselItem key={job.code} className="basis-1/2">
                                <JobCard job={job} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </Stack>
        </>
    ),
}

export const RecentJobs: StoryObj = {
    render: () => (
        <Stack className="px-12">
            <h2 className="text-sm font-medium">Recently run</h2>
            <Carousel opts={{ align: 'start' }} className="w-full">
                <CarouselContent>
                    {JOBS.map((job) => (
                        <CarouselItem key={job.code} className="sm:basis-1/2 lg:basis-1/3">
                            <JobCard job={job} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </Stack>
    ),
}
