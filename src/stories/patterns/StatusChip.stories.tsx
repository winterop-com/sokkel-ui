import type { Meta, StoryObj } from '@storybook/react-vite'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip, type Status, type StatusMap } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'

/**
 * A state as a chip. The run states are known without being told; an app's own states take their
 * words and a color from a map, given to one chip or set once for the app by a `StatusProvider`,
 * which a dot and a timeline read too.
 */
const meta: Meta = { title: 'Patterns/Status chip', parameters: { frame: 'padded' } }
export default meta

const RUN_STATES: Status[] = [
    'succeeded',
    'failed',
    'running',
    'queued',
    'pending',
    'waiting',
    'cancelled',
    'skipped',
    'completed_with_errors',
]

/** Tidevann's own states for a job's definition, each with its color and, where its name is not the word, its words. */
const JOB_STATES: StatusMap = {
    draft: { color: 'neutral' },
    review: { label: 'in review', color: 'warning' },
    published: { color: 'good' },
    archived: { color: 'skipped' },
}

/** Every run state in its own color. */
export const RunStates: StoryObj = {
    name: 'Run states',
    render: () => (
        <Row gap="xs" wrap>
            {RUN_STATES.map((status) => (
                <StatusChip key={status} status={status} />
            ))}
        </Row>
    ),
}

/** Every run state with its status dot, the 8px dot a status dot beside the chip draws. */
export const WithDot: StoryObj = {
    name: 'With a dot',
    render: () => (
        <Stack gap="md">
            <Row gap="xs" wrap>
                {RUN_STATES.map((status) => (
                    <StatusChip key={status} status={status} dot />
                ))}
            </Row>
            <Row gap="xs">
                <Dot status="failed" size="md" label="failed" />
                <span className="font-mono">sync-inventory</span>
                <StatusChip status="failed" dot />
            </Row>
        </Stack>
    ),
}

/** An app's own states given to each chip, a state no map knows drawn neutral by its name, and a label that says more. */
export const AppStates: StoryObj = {
    name: 'App states',
    render: () => (
        <Stack gap="md">
            <Row gap="xs" wrap>
                {Object.keys(JOB_STATES).map((status) => (
                    <StatusChip key={status} status={status} statuses={JOB_STATES} />
                ))}
                <StatusChip status="on_hold" statuses={JOB_STATES} />
            </Row>
            <Row gap="xs" wrap>
                <StatusChip status="published" statuses={JOB_STATES} label="3 published" />
                <StatusChip status="review" statuses={JOB_STATES} label="1 waiting on grace" />
            </Row>
        </Stack>
    ),
}

interface Job {
    job: string
    state: string
    by: string
    changed: string
}

const JOBS: Job[] = [
    { job: 'nightly-export', state: 'published', by: 'ada', changed: '2026-11-04 09:14' },
    { job: 'sync-inventory', state: 'review', by: 'grace', changed: '2026-11-04 08:52' },
    { job: 'rebuild-index', state: 'published', by: 'linus', changed: '2026-11-03 16:40' },
    { job: 'send-digest', state: 'draft', by: 'margaret', changed: '2026-11-03 11:02' },
    { job: 'import-orders', state: 'archived', by: 'ada', changed: '2026-10-28 14:20' },
]

const COLUMNS: DataColumn<Job>[] = [
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (job) => <span className="font-mono">{job.job}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (job) => <StatusChip status={job.state} /> },
    { id: 'by', header: 'By', width: '7rem', cell: (job) => job.by },
    { id: 'changed', header: 'Changed', width: '10rem', cell: (job) => <span className="tabular-nums">{job.changed}</span> },
]

/**
 * The states set once for the whole app: the chips in a table and a legend of dots read the
 * provider, and the run states stay known beside them.
 */
export const WithProvider: StoryObj = {
    name: 'With a provider',
    render: () => (
        <StatusProvider statuses={JOB_STATES}>
            <Stack gap="lg">
                <DataTable variant="list" columns={COLUMNS} rows={JOBS} rowKey={(job) => job.job} />
                <Section title="States">
                    <Row gap="lg" wrap>
                        {[...Object.keys(JOB_STATES), 'running', 'failed'].map((state) => (
                            <Row key={state} gap="xs">
                                <Dot status={state} />
                                <StatusChip status={state} />
                            </Row>
                        ))}
                    </Row>
                </Section>
            </Stack>
        </StatusProvider>
    ),
}
