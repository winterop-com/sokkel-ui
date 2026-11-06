import type { Meta, StoryObj } from '@storybook/react-vite'
import { Play, RotateCcw } from 'lucide-react'

import { DescriptionList } from '../../components/DescriptionList'
import { Columns, Fill, Row, Split, Stack } from '../../components/Layout'
import { PageHeader } from '../../components/PageHeader'
import { Section } from '../../components/Section'
import { Page } from '../../components/Shell'
import { Stat } from '../../components/Stat'
import { StatusChip, type Status } from '../../components/StatusChip'
import { Button } from '../../components/ui/button'

/**
 * The parts that arrange other parts: `Stack` one under the other, `Row` side by side, `Columns`
 * in a grid that drops columns as its container narrows, `Split` the main content with an aside,
 * and `Fill` the cell that takes the room left. Their cells always shrink, so a long label
 * truncates or wraps inside its cell instead of widening the page.
 */
const meta: Meta = { title: 'Patterns/Layout', parameters: { frame: 'padded' } }
export default meta

const RUNS: { job: string; status: Status; when: string }[] = [
    { job: 'nightly-export', status: 'failed', when: '02:00' },
    { job: 'sync-inventory', status: 'succeeded', when: '02:15' },
    { job: 'rebuild-index', status: 'running', when: '02:30' },
    { job: 'send-digest', status: 'queued', when: '03:00' },
]

const FACTS = [
    { term: 'Project', value: 'harbor' },
    { term: 'Service', value: 'scheduler' },
    { term: 'Owner', value: 'grace' },
    { term: 'Schedule', value: 'Every night at 02:00' },
]

function RunLine({ job, status, when }: { job: string; status: Status; when: string }) {
    return (
        <Row gap="md" justify="between">
            <span className="truncate font-mono text-sm">{job}</span>
            <Row gap="md">
                <span className="text-xs text-muted-foreground tabular-nums">{when}</span>
                <StatusChip status={status} />
            </Row>
        </Row>
    )
}

/** A stack of runs, one under the other, each a row with the job at its start and its time and state at its end. */
export const StackOfRows: StoryObj = {
    name: 'Stack',
    render: () => (
        <Stack gap="sm">
            {RUNS.map((run) => (
                <RunLine key={run.job} {...run} />
            ))}
        </Stack>
    ),
}

/** Rows: actions at the end of a line, and a wrapping row of chips that flows onto a second line when it runs out of room. */
export const Rows: StoryObj = {
    name: 'Row',
    render: () => (
        <Stack gap="xl">
            <Row justify="between">
                <span className="text-sm font-medium">nightly-export</span>
                <Row>
                    <Button variant="outline" size="sm">
                        <RotateCcw /> Retry
                    </Button>
                    <Button size="sm">
                        <Play /> Run
                    </Button>
                </Row>
            </Row>
            <Row wrap>
                {[...RUNS, ...RUNS].map((run, at) => (
                    <StatusChip key={`${run.job}-${String(at)}`} status={run.status} />
                ))}
            </Row>
        </Stack>
    ),
}

/** Four stats in columns: four across on a wide page, fewer as the room narrows, two on a phone. */
export const FourColumns: StoryObj = {
    name: 'Columns',
    render: () => (
        <Columns count={4} min="sm" gap="lg">
            <Stat label="Runs today" value="128" change="+12%" good />
            <Stat label="Failed" value="3" change="+2" good={false} />
            <Stat label="Median duration" value="4.2" unit="min" />
            <Stat label="Queued" value="7" />
        </Columns>
    ),
}

/** The runs beside the job's facts; the facts go under the runs when the container is too narrow for both. */
export const MainAndAside: StoryObj = {
    name: 'Split',
    render: () => (
        <Split
            aside={
                <Section title="Details">
                    <DescriptionList items={FACTS} />
                </Section>
            }
        >
            <Section title="Recent runs">
                <Stack gap="sm">
                    {RUNS.map((run) => (
                        <RunLine key={run.job} {...run} />
                    ))}
                </Stack>
            </Section>
        </Split>
    ),
}

/** A job's page from these parts: the header, the stats in columns, and the runs split with the details, the runs filling the height and scrolling. */
export const JobPage: StoryObj = {
    name: 'Page',
    parameters: { frame: 'none' },
    render: () => (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <Fill scroll>
                <Page>
                    <PageHeader
                        title="nightly-export"
                        actions={
                            <Button size="sm">
                                <Play /> Run
                            </Button>
                        }
                    />
                    <Columns count={4} min="sm" gap="lg">
                        <Stat label="Runs today" value="128" change="+12%" good />
                        <Stat label="Failed" value="3" change="+2" good={false} />
                        <Stat label="Median duration" value="4.2" unit="min" />
                        <Stat label="Queued" value="7" />
                    </Columns>
                    <Split
                        aside={
                            <Section title="Details">
                                <DescriptionList items={FACTS} />
                            </Section>
                        }
                    >
                        <Section title="Recent runs">
                            <Stack gap="sm">
                                {[...RUNS, ...RUNS, ...RUNS].map((run, at) => (
                                    <RunLine key={`${run.job}-${String(at)}`} {...run} />
                                ))}
                            </Stack>
                        </Section>
                    </Split>
                </Page>
            </Fill>
        </Stack>
    ),
}
