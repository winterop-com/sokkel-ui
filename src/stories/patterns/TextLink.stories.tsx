import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { InlineCode } from '@winterop-com/sokkel-ui/InlineCode'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'

/**
 * A link inside text or among a record's facts: a job, a run, a host, a way onward in a sentence.
 * Plain values stay plain beside it. `inline` is underlined in the body ink for running text,
 * `data` dotted for a value in a table or a list, `aside` muted, and the default in the primary
 * ink, underlined on hover. With `onPress` it is a button that opens something in place.
 */
const meta: Meta = { title: 'Patterns/Text link', parameters: { frame: 'padded' } }
export default meta

/** Inside running text, underlined in the body ink so it reads as a link without a color of its own. */
export const InText: StoryObj = {
    name: 'In text',
    render: () => (
        <p className="max-w-md text-sm">
            The last run of nightly-export failed at the upload step.{' '}
            <TextLink href="#" variant="inline">
                Read its log
            </TextLink>
            , or{' '}
            <TextLink href="#" variant="inline">
                open the job
            </TextLink>{' '}
            to change where it uploads.
        </p>
    ),
}

/** The four variants side by side: default, inline, data and aside. */
export const Variants: StoryObj = {
    render: () => (
        <Stack gap="sm" className="text-sm">
            <span>
                Default: <TextLink href="#">sync-inventory</TextLink>
            </span>
            <span>
                Inline:{' '}
                <TextLink href="#" variant="inline">
                    sync-inventory
                </TextLink>
            </span>
            <span>
                Data:{' '}
                <TextLink href="#" variant="data">
                    sync-inventory
                </TextLink>
            </span>
            <span>
                Aside:{' '}
                <TextLink href="#" variant="aside">
                    All jobs
                </TextLink>
            </span>
        </Stack>
    ),
}

/** Among a run's facts: the job and the project lead to their own pages, the run id in the code face. */
export const InFacts: StoryObj = {
    name: 'In facts',
    render: () => (
        <Stack className="max-w-lg">
            <DescriptionList
                columns={2}
                layout="stacked"
                items={[
                    { term: 'Job', value: <TextLink href="#">nightly-export</TextLink> },
                    { term: 'Project', value: <TextLink href="#">harbor</TextLink> },
                    {
                        term: 'Run',
                        value: (
                            <TextLink href="#" code>
                                run-4812
                            </TextLink>
                        ),
                    },
                    { term: 'Started by', value: 'grace' },
                ]}
            />
            <TextLink href="#" variant="aside" className="self-start text-sm">
                Earlier runs
            </TextLink>
        </Stack>
    ),
}

interface Run {
    id: string
    job: string
    host: string
    state: 'succeeded' | 'failed' | 'running' | 'queued'
}

const RUNS: Run[] = [
    { id: 'run-4812', job: 'nightly-export', host: 'worker-1.example.org', state: 'failed' },
    { id: 'run-4811', job: 'sync-inventory', host: 'worker-2.example.org', state: 'succeeded' },
    { id: 'run-4810', job: 'rebuild-index', host: 'worker-1.example.org', state: 'running' },
    { id: 'run-4809', job: 'send-digest', host: 'scheduler.example.org', state: 'queued' },
    { id: 'run-4808', job: 'import-orders', host: 'worker-3.example.org', state: 'succeeded' },
]

const COLUMNS: DataColumn<Run>[] = [
    {
        id: 'id',
        header: 'Run',
        width: '8rem',
        cell: (run) => (
            <TextLink href="#" variant="data" code>
                {run.id}
            </TextLink>
        ),
    },
    {
        id: 'job',
        header: 'Job',
        width: '10rem',
        cell: (run) => (
            <TextLink href="#" variant="data">
                {run.job}
            </TextLink>
        ),
    },
    { id: 'host', header: 'Host', width: '12rem', cell: (run) => <InlineCode value={run.host} /> },
    { id: 'state', header: 'State', width: '8rem', cell: (run) => <StatusChip status={run.state} /> },
]

/** Values that lead somewhere in a table: the run and the job, dotted until hovered. */
export const InATable: StoryObj = {
    name: 'In a table',
    render: () => <DataTable columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} />,
}

/** A link that opens the run's steps in place rather than going anywhere: a button drawn as a link, with `aria-expanded`. */
export const OpensInPlace: StoryObj = {
    name: 'Opens in place',
    render: function OpensInPlace() {
        const [open, setOpen] = useState(true)
        return (
            <Stack gap="sm" className="max-w-md text-sm">
                <p>
                    run-4812 stopped at upload.{' '}
                    <TextLink variant="inline" aria-expanded={open} aria-controls="run-4812-steps" onPress={() => setOpen(!open)}>
                        {open ? 'Hide the steps' : 'Show the steps'}
                    </TextLink>
                </p>
                {open && (
                    <p id="run-4812-steps" className="text-muted-foreground">
                        fetch, transform and validate succeeded; upload failed; notify was skipped.
                    </p>
                )}
            </Stack>
        )
    },
}

/** A link that leaves the app: opened in a new tab, with a trailing mark and words a screen reader reads. */
export const External: StoryObj = {
    render: () => (
        <p className="text-sm">
            The scheduler keeps its own status page at{' '}
            <TextLink href="https://status.example.org" variant="inline" external>
                status.example.org
            </TextLink>
            .
        </p>
    ),
}
