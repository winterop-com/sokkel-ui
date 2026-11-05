import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ListTable, type Column } from '../../components/ListTable'
import { StatusChip } from '../../components/StatusChip'

/**
 * A listing in its box. The row under the pointer is tinted by default, more strongly when rows
 * can be selected; `hover={false}` keeps the rows still.
 */
const meta: Meta = { title: 'Patterns/List table' }
export default meta

interface Run {
    id: string
    job: string
    state: 'succeeded' | 'failed' | 'running' | 'queued'
    by: string
    took: string
}

const RUNS: Run[] = [
    { id: 'r1', job: 'import-orders', state: 'running', by: 'schedule', took: '1m 12s' },
    { id: 'r2', job: 'nightly-export', state: 'failed', by: 'schedule', took: '4.2s' },
    { id: 'r3', job: 'rebuild-index', state: 'succeeded', by: 'ada', took: '6m 03s' },
    { id: 'r4', job: 'send-digest', state: 'succeeded', by: 'schedule', took: '12.8s' },
    { id: 'r5', job: 'sync-inventory', state: 'queued', by: 'grace', took: '-' },
]

const COLUMNS: Column<Run>[] = [
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => <span className="font-mono">{run.job}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.state} /> },
    { id: 'by', header: 'Started by', width: '8rem', cell: (run) => <span className="text-muted-foreground">{run.by}</span> },
    { id: 'took', header: 'Took', width: '6rem', align: 'end', cell: (run) => <span className="tabular-nums">{run.took}</span> },
]

function Ground({ children }: { children: React.ReactNode }) {
    return <div className="min-h-svh bg-background p-6 text-foreground">{children}</div>
}

/** Rows that only show: the row under the pointer is tinted lightly. */
export const Plain: StoryObj = {
    render: () => (
        <Ground>
            <ListTable columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} foot={`${String(RUNS.length)} of 248`} />
        </Ground>
    ),
}

function Choosing() {
    const [chosen, setChosen] = useState('r2')
    return (
        <ListTable
            columns={COLUMNS}
            rows={RUNS}
            rowKey={(run) => run.id}
            selected={(run) => run.id === chosen}
            onSelect={(run) => setChosen(run.id)}
            foot={`${String(RUNS.length)} of 248`}
        />
    )
}

/** Rows that open something: a stronger tint under the pointer, the pointer itself, and the chosen row filled. */
export const Selectable: StoryObj = {
    render: () => (
        <Ground>
            <Choosing />
        </Ground>
    ),
}

/** The tint turned off, for a listing that should stay still. */
export const NoHover: StoryObj = {
    name: 'No hover',
    render: () => (
        <Ground>
            <ListTable columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} hover={false} />
        </Ground>
    ),
}

/** Nothing to list: one line in the box. */
export const Empty: StoryObj = {
    render: () => (
        <Ground>
            <ListTable columns={COLUMNS} rows={[]} rowKey={(run) => run.id} empty="No runs today." />
        </Ground>
    ),
}
