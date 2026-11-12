import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { MiniGraph } from '@winterop-com/sokkel-ui-graph/MiniGraph'
import { FAILED, IMPORT_ORDERS, JOB_RUNS, NIGHTLY_EXPORT, RUNNING, SHORT, type JobRun } from './data'

const COLUMNS: DataColumn<JobRun>[] = [
    { id: 'run', header: 'Run', width: '6rem', cell: (run) => <span className="font-mono">{run.id}</span> },
    { id: 'job', header: 'Job', width: 'minmax(9rem,1fr)', cell: (run) => run.job, sortValue: (run) => run.job },
    {
        id: 'steps',
        header: 'Steps',
        width: 'minmax(8rem,12rem)',
        cell: (run) => <MiniGraph steps={run.steps} scale="natural" align="start" label={`${run.job} steps`} />,
        stack: 'primary',
    },
    { id: 'status', header: 'Status', width: '8rem', cell: (run) => <StatusChip status={run.status} />, stack: 'secondary' },
    { id: 'project', header: 'Project', width: '7rem', cell: (run) => run.project, stack: 'secondary' },
    { id: 'started', header: 'Started', width: '9rem', cell: (run) => run.started, stack: 'secondary' },
    { id: 'by', header: 'By', width: '7rem', cell: (run) => run.by, stack: 'secondary' },
]

function Runs() {
    return (
        <Stack className="h-svh bg-background p-4 text-foreground md:p-6">
            <PageHeader title="Runs" description="Every job in Tidevann, the newest first" />
            <DataTable columns={COLUMNS} rows={JOB_RUNS} rowKey={(run) => run.id} />
        </Stack>
    )
}

function Cards() {
    return (
        <Stack className="min-h-svh bg-background p-4 text-foreground md:p-6">
            <PageHeader title="Runs" description="The latest run of each job" />
            <Columns count="fill" min="md">
                {JOB_RUNS.map((run) => (
                    <ItemCard
                        key={run.id}
                        title={run.job}
                        code={run.id}
                        media={<MiniGraph steps={run.steps} label={`${run.job} steps`} className="p-4" />}
                        status={<StatusChip status={run.status} />}
                        facts={[
                            { label: 'Project', value: run.project },
                            { label: 'Started', value: run.started },
                        ]}
                    />
                ))}
            </Columns>
        </Stack>
    )
}

/** A box the size of a list cell, which the mini graph fits itself to. */
function Cell({ children }: { children: ReactNode }) {
    return <div className="w-48 p-6">{children}</div>
}

const meta: Meta = { title: 'Graphs/Mini graph' }
export default meta

type Story = StoryObj

/** A pipeline with no run: plain boxes and the edges between them, scaled to a 12rem cell. */
export const Pipeline: Story = {
    render: () => (
        <Cell>
            <MiniGraph steps={NIGHTLY_EXPORT} label="nightly-export steps" />
        </Cell>
    ),
}

/** A run partway through: the steps done and running filled in their colors, the queued ones outlined. Pointing at a step names it and its state. */
export const Running: Story = {
    render: () => (
        <Cell>
            <MiniGraph steps={RUNNING} label="nightly-export run" />
        </Cell>
    ),
}

/** A run that failed at validate: the skipped steps after it outlined and dashed. */
export const Failed: Story = {
    render: () => (
        <Cell>
            <MiniGraph steps={FAILED} label="nightly-export run" />
        </Cell>
    ),
}

/** The same run drawn down and as splines, in a taller box. */
export const DownInSplines: Story = {
    name: 'Down in splines',
    render: () => (
        <Cell>
            <MiniGraph steps={FAILED} direction="down" routing="splines" label="nightly-export run" className="h-40" />
        </Cell>
    ),
}

/** Three pipelines at their natural scale from the start of 12rem cells: one step, three, and seven, so a longer strip is a longer pipeline. */
export const Natural: Story = {
    render: () => (
        <Cell>
            <Stack>
                <MiniGraph steps={SHORT.slice(0, 1)} scale="natural" align="start" label="one step" />
                <MiniGraph steps={SHORT} scale="natural" align="start" label="three steps" />
                <MiniGraph steps={NIGHTLY_EXPORT} scale="natural" align="start" label="nightly-export steps" />
            </Stack>
        </Cell>
    ),
}

/** A source drawn dashed and unfilled, a step that fans out with a box behind it, and the edges notify would draw from every step before it reduced to one; pointing at a step says its code and what it runs. */
export const Marks: Story = {
    render: () => (
        <Cell>
            <MiniGraph steps={IMPORT_ORDERS} scale="natural" align="start" reduce label="import-orders steps" />
        </Cell>
    ),
}

/** Runs of five jobs in a list, each row with its steps drawn small in a column; on a phone each stacks as a card with the graph on a line of its own. */
export const InAList: Story = { name: 'In a list', render: () => <Runs /> }

/** The same runs as cards, each with its graph as the card's picture. */
export const InCards: Story = { name: 'In cards', render: () => <Cards /> }
