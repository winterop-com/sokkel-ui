import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronRight, FileText, ListChecks } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemFooter,
    ItemGroup,
    ItemHeader,
    ItemMedia,
    ItemSeparator,
    ItemTitle,
} from '../../components/ui/item'

const meta: Meta = { title: 'Primitives/Display/Item' }
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
            <div className="flex max-w-xl flex-col gap-6">
                {(['default', 'outline', 'muted'] as const).map((variant) => (
                    <div key={variant} className="flex flex-col gap-2">
                        <Caption>variant: {variant}</Caption>
                        <Item variant={variant}>
                            <ItemMedia variant="icon">
                                <ListChecks />
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle>Nightly export</ItemTitle>
                                <ItemDescription>Exports the day's orders every night at 02:00.</ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <Button variant="outline" size="sm">
                                    Open
                                </Button>
                            </ItemActions>
                        </Item>
                    </div>
                ))}
                {(['default', 'sm', 'xs'] as const).map((size) => (
                    <div key={size} className="flex flex-col gap-2">
                        <Caption>size: {size}</Caption>
                        <Item variant="outline" size={size}>
                            <ItemContent>
                                <ItemTitle>
                                    <span className="font-mono">nightly-export</span>
                                </ItemTitle>
                                <ItemDescription>Last run succeeded at 2026-11-04 14:02.</ItemDescription>
                            </ItemContent>
                        </Item>
                    </div>
                ))}
            </div>
        </Ground>
    ),
}

export const WithHeaderAndFooter: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-xl flex-col gap-2">
                <Caption>header and footer, as a link</Caption>
                <Item variant="outline" render={<a href="#" />}>
                    <ItemHeader>
                        <span className="font-mono text-xs text-muted-foreground">file</span>
                        <Badge variant="outline">csv</Badge>
                    </ItemHeader>
                    <ItemMedia variant="icon">
                        <FileText />
                    </ItemMedia>
                    <ItemContent>
                        <ItemTitle>October orders</ItemTitle>
                        <ItemDescription>Every order placed in October, one row each.</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                        <ChevronRight className="size-4 text-muted-foreground" />
                    </ItemActions>
                    <ItemFooter>
                        <span className="font-mono text-xs text-muted-foreground">orders-2026-10.csv</span>
                        <span className="text-xs text-muted-foreground tabular-nums">2.4 MB</span>
                    </ItemFooter>
                </Item>
            </div>
        </Ground>
    ),
}

const JOBS = [
    { code: 'nightly-export', name: 'Nightly export', last: 'succeeded', when: '2026-11-04 14:02' },
    { code: 'sync-inventory', name: undefined, last: 'failed', when: '2026-11-04 13:45' },
    { code: 'rebuild-index', name: 'Rebuild search index', last: 'running', when: '2026-11-04 14:05' },
    { code: 'send-digest', name: 'Weekly digest', last: 'cancelled', when: '2026-11-03 08:00' },
] as const

const TONE: Record<string, string> = {
    succeeded: 'bg-status-succeeded/15 text-status-succeeded-ink',
    failed: 'bg-status-failed/15 text-status-failed-ink',
    running: 'bg-status-running/15 text-status-running-ink',
    cancelled: 'bg-status-cancelled/15 text-status-cancelled-ink',
}

export const JobList: StoryObj = {
    render: () => (
        <Ground>
            <ItemGroup className="max-w-2xl gap-0">
                {JOBS.map((job, at) => (
                    <div key={job.code} role="listitem">
                        {at > 0 && <ItemSeparator className="my-0" />}
                        <Item render={<a href="#" />}>
                            <ItemMedia variant="icon">
                                <ListChecks />
                            </ItemMedia>
                            <ItemContent>
                                <ItemTitle>{job.name ?? <span className="font-mono">{job.code}</span>}</ItemTitle>
                                {job.name !== undefined && <ItemDescription className="font-mono text-xs">{job.code}</ItemDescription>}
                            </ItemContent>
                            <ItemActions>
                                <Badge className={TONE[job.last]}>{job.last}</Badge>
                                <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">{job.when}</span>
                            </ItemActions>
                        </Item>
                    </div>
                ))}
            </ItemGroup>
        </Ground>
    ),
}
