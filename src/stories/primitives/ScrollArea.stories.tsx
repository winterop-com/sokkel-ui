import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { ListTable, type Column } from '../../components/ListTable'
import { StatusChip, type Status } from '../../components/StatusChip'
import { ScrollArea, ScrollBar } from '../../components/ui/scroll-area'

/** A region that scrolls with a thin drawn scrollbar, vertically, sideways, or both. */
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

const STATES: Status[] = ['succeeded', 'succeeded', 'failed', 'succeeded', 'running', 'succeeded', 'cancelled', 'succeeded']

const RUNS = Array.from({ length: 24 }, (_, at) => ({
    id: `01a1a5${(0xc6 - at).toString(16)}`,
    status: STATES[at % STATES.length],
    at: `2026-11-04 ${String(23 - at).padStart(2, '0')}:02`,
    took: `${(1 + ((at * 7) % 10) / 10).toFixed(1)}s`,
}))

type Run = (typeof RUNS)[number]

const COLUMNS: Column<Run>[] = [
    { id: 'id', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'status', header: 'Status', width: '7rem', cell: (run) => <StatusChip status={run.status} /> },
    { id: 'at', header: 'Started', width: 'minmax(0,1fr)', cell: (run) => <span className="tabular-nums">{run.at}</span> },
    { id: 'took', header: 'Took', width: '4rem', align: 'end', cell: (run) => <span className="tabular-nums">{run.took}</span> },
]

const ACTIONS = ['http.get', 'rows.check', 'rows.map', 'rows.filter', 'csv.read', 'json.parse', 'parquet.write', 'bucket.put', 'chat.post']

const meta: Meta = { title: 'Primitives/Layout/ScrollArea' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-start gap-6">
                <div className="flex w-full max-w-xs flex-col gap-2">
                    <Caption>vertical</Caption>
                    <ScrollArea className="h-64 rounded-lg border border-border">
                        <ul className="flex flex-col p-2 text-sm">
                            {RUNS.map((run) => (
                                <li key={run.id} className="flex items-center gap-2 px-2 py-1.5">
                                    <span className="font-mono">{run.id}</span>
                                    <span className="ml-auto text-muted-foreground tabular-nums">{run.took}</span>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-2">
                    <Caption>horizontal</Caption>
                    <ScrollArea className="w-full rounded-lg border border-border">
                        <div className="flex w-max gap-2 p-3">
                            {ACTIONS.map((action) => (
                                <span key={action} className="rounded-md border border-border px-2 py-1 font-mono text-xs">
                                    {action}
                                </span>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-2">
                    <Caption>short content, no scrollbar</Caption>
                    <ScrollArea className="h-64 rounded-lg border border-border">
                        <p className="p-3 text-sm text-muted-foreground">No runs of rebuild-index today.</p>
                    </ScrollArea>
                </div>
            </div>
        </Ground>
    ),
}

export const RunHistory: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-2xl flex-col gap-2">
                <h2 className="text-sm font-medium">Runs of import-orders today</h2>
                <ScrollArea className="h-80">
                    <ListTable columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} />
                </ScrollArea>
            </div>
        </Ground>
    ),
}
