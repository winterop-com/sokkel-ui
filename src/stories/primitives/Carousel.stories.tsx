import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { StatusChip, type Status } from '../../components/StatusChip'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../../components/ui/carousel'

/** A row of slides that scrolls one or several at a time, with buttons either side. */
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

const JOBS: { code: string; name: string; status: Status; at: string; took: string }[] = [
    { code: 'import-orders', name: 'Import orders', status: 'failed', at: '2026-11-04 14:02', took: '0.3s' },
    { code: 'nightly-export', name: 'Nightly export', status: 'succeeded', at: '2026-11-04 14:00', took: '1.2s' },
    { code: 'rebuild-index', name: 'Rebuild index', status: 'succeeded', at: '2026-11-04 09:21', took: '3.8s' },
    { code: 'sync-inventory', name: 'Sync inventory', status: 'running', at: '2026-11-04 14:04', took: '-' },
    { code: 'send-digest', name: 'Send digest', status: 'queued', at: '2026-11-04 14:05', took: '-' },
]

function JobCard({ job }: { job: (typeof JOBS)[number] }) {
    return (
        <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{job.code}</p>
                </div>
                <StatusChip status={job.status} />
            </div>
            <p className="mt-auto text-xs text-muted-foreground tabular-nums">
                {job.at}, {job.took}
            </p>
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Layout/Carousel' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-2 px-12">
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
            </div>
            <div className="flex flex-col gap-2 px-12">
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
            </div>
        </Ground>
    ),
}

export const RecentJobs: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-3 px-12">
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
            </div>
        </Ground>
    ),
}
