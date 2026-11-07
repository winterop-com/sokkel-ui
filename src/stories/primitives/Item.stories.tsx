import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronRight, FileText, ListChecks } from 'lucide-react'

import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
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
} from '@winterop-com/sokkel-ui/primitives/item'

const meta: Meta = { title: 'Primitives/Display/Item', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

export const Variants: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-xl">
            {(['default', 'outline', 'muted'] as const).map((variant) => (
                <Stack key={variant} gap="sm">
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
                </Stack>
            ))}
            {(['default', 'sm', 'xs'] as const).map((size) => (
                <Stack key={size} gap="sm">
                    <Caption>size: {size}</Caption>
                    <Item variant="outline" size={size}>
                        <ItemContent>
                            <ItemTitle>
                                <span className="font-mono">nightly-export</span>
                            </ItemTitle>
                            <ItemDescription>Last run succeeded at 2026-11-04 14:02.</ItemDescription>
                        </ItemContent>
                    </Item>
                </Stack>
            ))}
        </Stack>
    ),
}

export const WithHeaderAndFooter: StoryObj = {
    name: 'Header and footer',
    render: () => (
        <Stack gap="sm" className="max-w-xl">
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
        </Stack>
    ),
}

const JOBS = [
    { code: 'nightly-export', name: 'Nightly export', last: 'succeeded', when: '2026-11-04 14:02' },
    { code: 'sync-inventory', name: undefined, last: 'failed', when: '2026-11-04 13:45' },
    { code: 'rebuild-index', name: 'Rebuild search index', last: 'running', when: '2026-11-04 14:05' },
    { code: 'send-digest', name: 'Weekly digest', last: 'cancelled', when: '2026-11-03 08:00' },
] as const

export const JobList: StoryObj = {
    render: () => (
        <ItemGroup flush className="max-w-2xl">
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
                            <StatusChip status={job.last} />
                            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">{job.when}</span>
                        </ItemActions>
                    </Item>
                </div>
            ))}
        </ItemGroup>
    ),
}
