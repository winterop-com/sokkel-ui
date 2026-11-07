import { PageHeader } from '../../components/PageHeader'
import type { ReactNode } from 'react'

import { type DataColumn, DataTable } from '../../components/DataTable'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'
import { TidevannMark } from '../fixtures/TidevannMark'
import { AppBar } from '../../components/AppBar'
import { Stack } from '../../components/Layout'

interface Run {
    id: number
    job: string
    status: Status
    at: string
    took: string
}

const RUNS: Run[] = [
    { id: 4812, job: 'import-orders', status: 'succeeded', at: '2026-11-05 02:00', took: '1m 12s' },
    { id: 4811, job: 'import-orders', status: 'failed', at: '2026-11-04 02:00', took: '0m 41s' },
    { id: 4810, job: 'import-orders', status: 'succeeded', at: '2026-11-03 02:00', took: '1m 09s' },
    { id: 4809, job: 'import-orders', status: 'succeeded', at: '2026-11-02 02:00', took: '1m 15s' },
    { id: 4808, job: 'import-orders', status: 'cancelled', at: '2026-11-01 02:00', took: '0m 03s' },
    { id: 4807, job: 'import-orders', status: 'succeeded', at: '2026-10-31 02:00', took: '1m 11s' },
]

const RUN_COLUMNS: DataColumn<Run>[] = [
    { id: 'run', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono text-xs">#{run.id}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.status} /> },
    {
        id: 'started',
        header: 'Started',
        width: 'minmax(0,1fr)',
        cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.at}</span>,
    },
    {
        id: 'took',
        header: 'Took',
        width: '5rem',
        align: 'end',
        cell: (run) => <span className="font-mono text-xs text-muted-foreground">{run.took}</span>,
    },
]

/**
 * The page a dialog opens over: a job in the harbor project with its latest runs. Its one button
 * opens the dialog again once it has been closed.
 */
export function Behind({ action, onAction, children }: { action?: string; onAction?: () => void; children?: ReactNode }) {
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <AppBar
                mark={<TidevannMark />}
                trail={[
                    { label: 'Tidevann', href: '#' },
                    { label: 'harbor', href: '#' },
                    { label: 'import-orders', code: true },
                ]}
                actions={
                    action === undefined ? undefined : (
                        <Button size="sm" variant="outline" onClick={onAction}>
                            {action}
                        </Button>
                    )
                }
            />
            {children ?? (
                <Stack as="main" gap="lg" className="min-h-0 flex-1 overflow-auto p-6">
                    <PageHeader
                        title="Import orders"
                        description="Loads the monthly orders file into the warehouse, every night at 02:00 UTC."
                    />
                    <DataTable variant="list" columns={RUN_COLUMNS} rows={RUNS} rowKey={(run) => String(run.id)} className="max-w-3xl" />
                </Stack>
            )}
        </Stack>
    )
}

/** Waits, as a request to the server would. */
export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
