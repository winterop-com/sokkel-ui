import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { ScrollArea, ScrollBar } from '@winterop-com/sokkel-ui/primitives/scroll-area'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** A region that scrolls with a thin drawn scrollbar, vertically, sideways, or both. */
function Caption({ children }: { children: ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

const STATES: Status[] = ['succeeded', 'succeeded', 'failed', 'succeeded', 'running', 'succeeded', 'cancelled', 'succeeded']

const RUNS = Array.from({ length: 24 }, (_, at) => ({
    id: `01a1a5${(0xc6 - at).toString(16)}`,
    status: STATES[at % STATES.length],
    at: `2026-11-04 ${String(23 - at).padStart(2, '0')}:02`,
    took: `${(1 + ((at * 7) % 10) / 10).toFixed(1)}s`,
}))

type Run = (typeof RUNS)[number]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'id', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'status', header: 'Status', width: '7rem', cell: (run) => <StatusChip status={run.status} /> },
    { id: 'at', header: 'Started', width: 'minmax(0,1fr)', cell: (run) => <span className="tabular-nums">{run.at}</span> },
    { id: 'took', header: 'Took', width: '4rem', align: 'end', cell: (run) => <span className="tabular-nums">{run.took}</span> },
]

const ACTIONS = ['http.get', 'rows.check', 'rows.map', 'rows.filter', 'csv.read', 'json.parse', 'parquet.write', 'bucket.put', 'chat.post']

const meta: Meta = { title: 'Primitives/Layout/ScrollArea', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="start" wrap>
            <Stack gap="sm" className="w-full max-w-xs">
                <Caption>vertical</Caption>
                <ScrollArea className="h-64 rounded-lg border border-border">
                    <Stack as="ul" gap="none" className="p-2 text-sm">
                        {RUNS.map((run) => (
                            <Row key={run.id} as="li" className="px-2 py-1.5">
                                <span className="font-mono">{run.id}</span>
                                <span className="ml-auto text-muted-foreground tabular-nums">{run.took}</span>
                            </Row>
                        ))}
                    </Stack>
                </ScrollArea>
            </Stack>
            <Stack gap="sm" className="w-full max-w-xs">
                <Caption>horizontal</Caption>
                <ScrollArea className="w-full rounded-lg border border-border">
                    <Row align="stretch" className="w-max p-3">
                        {ACTIONS.map((action) => (
                            <span key={action} className="rounded-md border border-border px-2 py-1 font-mono text-xs">
                                {action}
                            </span>
                        ))}
                    </Row>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </Stack>
            <Stack gap="sm" className="w-full max-w-xs">
                <Caption>short content, no scrollbar</Caption>
                <ScrollArea className="h-64 rounded-lg border border-border">
                    <p className="p-3 text-sm text-muted-foreground">No runs of rebuild-index today.</p>
                </ScrollArea>
            </Stack>
        </Row>
    ),
}

export const RunHistory: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-2xl">
            <h2 className="text-sm font-medium">Runs of import-orders today</h2>
            <ScrollArea className="h-80">
                <DataTable variant="list" columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} />
            </ScrollArea>
        </Stack>
    ),
}
