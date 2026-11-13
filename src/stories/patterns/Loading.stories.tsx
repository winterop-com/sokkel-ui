import type { Meta, StoryObj } from '@storybook/react-vite'
import { Upload } from 'lucide-react'
import { useState } from 'react'

import { AppBar } from '@winterop-com/sokkel-ui/AppBar'
import { Callout } from '@winterop-com/sokkel-ui/Callout'
import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { ListRow, ListRows } from '@winterop-com/sokkel-ui/ListRow'
import { LoadingBar, LoadingOverlay, PageProgress } from '@winterop-com/sokkel-ui/Loaders'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * Waits that take a while: a bar with known or unknown progress, the bar along the top of a page
 * while it loads, and an element dimmed under a bar while it loads again. The page and element
 * loaders appear only after a short delay, so a fast answer shows nothing.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="xl" className="mx-auto max-w-3xl">
            {children}
        </Stack>
    )
}

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Bars() {
    return (
        <Ground>
            <Caption>unknown progress</Caption>
            <LoadingBar />
            <Caption>known progress, 35% and 80%</Caption>
            <LoadingBar value={35} />
            <LoadingBar value={80} />
            <Caption>quiet, on a muted track</Caption>
            <LoadingBar tone="muted" />
        </Ground>
    )
}

function InTone() {
    return (
        <Ground>
            <ListRows label="Uploads">
                <ListRow
                    icon={<Upload />}
                    title="nightly-export.csv"
                    detail={
                        <Stack gap="2xs">
                            Uploading 3 of 8 parts
                            <LoadingBar tone="current" value={38} label="Uploading nightly-export.csv" />
                        </Stack>
                    }
                    aside="harbor"
                />
                <ListRow
                    icon={<Upload />}
                    title="orders.parquet"
                    detail={
                        <Stack gap="2xs">
                            Waiting for the worker
                            <LoadingBar tone="current" label="Waiting for the worker" />
                        </Stack>
                    }
                    aside="larkspur"
                />
            </ListRows>
            <Callout tone="warning" title="Rebuilding the index">
                <Stack gap="xs">
                    Searches may miss documents until it is done.
                    <LoadingBar tone="current" label="Rebuilding the index" />
                </Stack>
            </Callout>
        </Ground>
    )
}

interface Run {
    id: string
    job: string
    state: Status
    took: string
}

const RUNS: Run[] = [
    { id: 'r1', job: 'import-orders', state: 'running', took: '1m 12s' },
    { id: 'r2', job: 'nightly-export', state: 'failed', took: '4.2s' },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', took: '6m 03s' },
    { id: 'r4', job: 'send-digest', state: 'succeeded', took: '12.8s' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => <span className="truncate font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '7rem', cell: (run) => <StatusChip status={run.state} /> },
    {
        id: 'took',
        header: 'Took',
        width: '4rem',
        align: 'end',
        cell: (run) => <span className="text-muted-foreground tabular-nums">{run.took}</span>,
    },
]

function Rows({ foot }: { foot?: string }) {
    return <DataTable variant="list" columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} foot={foot} />
}

function PageLoad() {
    return (
        <Stack gap="none" className="min-h-svh bg-background text-foreground">
            <AppBar trail={[{ label: 'Runs' }]}>
                <PageProgress loading delay={0} value={60} />
            </AppBar>
            <Stack gap="xl" className="mx-auto w-full max-w-3xl p-6">
                <Rows />
            </Stack>
        </Stack>
    )
}

function ElementReload({ interactive = false }: { interactive?: boolean }) {
    const [loading, setLoading] = useState(!interactive)
    return (
        <Ground>
            {interactive && (
                <Row gap="md">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setLoading(true)
                            setTimeout(() => setLoading(false), 2000)
                        }}
                    >
                        Refresh
                    </Button>
                    <Caption>The bar appears only if the refresh takes longer than 300ms.</Caption>
                </Row>
            )}
            <LoadingOverlay loading={loading} delay={interactive ? 300 : 0} className="rounded-surface">
                <Rows foot="4 of 248 today" />
            </LoadingOverlay>
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/Loading', parameters: { frame: 'padded' } }
export default meta

export const Bars_: StoryObj = { name: 'Bars', render: () => <Bars /> }
/** Thin lines in the ink around them, `tone="current"`: under a row's muted detail, known and unknown, and in a warning's ink. */
export const Tone: StoryObj = { name: 'In its tone', render: () => <InTone /> }
export const Page: StoryObj = { parameters: { frame: 'none' }, name: 'Page load', render: () => <PageLoad /> }
export const Element: StoryObj = { name: 'Element reload', render: () => <ElementReload /> }
export const Try: StoryObj = { name: 'Try it', render: () => <ElementReload interactive /> }
