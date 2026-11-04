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

const PIPELINES: { code: string; name: string; status: Status; at: string; took: string }[] = [
    { code: 'weather-gate', name: 'Weather gate', status: 'failed', at: '2026-11-04 14:02', took: '0.3s' },
    { code: 'dhis2-play', name: 'DHIS2 play sync', status: 'succeeded', at: '2026-11-04 14:00', took: '1.2s' },
    { code: 'fhir-tour', name: 'FHIR tour', status: 'succeeded', at: '2026-11-04 09:21', took: '3.8s' },
    { code: 'connections-tour', name: 'Connections tour', status: 'running', at: '2026-11-04 14:04', took: '-' },
    { code: 'climate-monthly', name: 'Climate, monthly', status: 'queued', at: '2026-11-04 14:05', took: '-' },
]

function PipelineCard({ pipeline }: { pipeline: (typeof PIPELINES)[number] }) {
    return (
        <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{pipeline.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{pipeline.code}</p>
                </div>
                <StatusChip status={pipeline.status} />
            </div>
            <p className="mt-auto text-xs text-muted-foreground tabular-nums">
                {pipeline.at}, {pipeline.took}
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
                        {PIPELINES.map((pipeline) => (
                            <CarouselItem key={pipeline.code}>
                                <PipelineCard pipeline={pipeline} />
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
                        {PIPELINES.map((pipeline) => (
                            <CarouselItem key={pipeline.code} className="basis-1/2">
                                <PipelineCard pipeline={pipeline} />
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

export const RecentPipelines: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-col gap-3 px-12">
                <h2 className="text-sm font-medium">Recently run</h2>
                <Carousel opts={{ align: 'start' }} className="w-full">
                    <CarouselContent>
                        {PIPELINES.map((pipeline) => (
                            <CarouselItem key={pipeline.code} className="sm:basis-1/2 lg:basis-1/3">
                                <PipelineCard pipeline={pipeline} />
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
