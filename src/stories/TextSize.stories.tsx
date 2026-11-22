import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Play, Server, Workflow } from 'lucide-react'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Rail, type RailGroup } from '@winterop-com/sokkel-ui/Rail'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { StatusChip, type Status } from '@winterop-com/sokkel-ui/StatusChip'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import tokens from '@winterop-com/sokkel-ui/tokens.json'

import { TidevannMark } from './fixtures/TidevannMark'

/**
 * The four text sizes side by side, each a column scoped with `data-text-size-scope`: the same
 * page in each, with a rail, a page header and its action, a table and its column heads, a form,
 * chips and a description list, so the steps can be compared on real parts. Settings › Appearance
 * offers the same four as Text size, and the toolbar's Text size wears one on the whole page.
 */
const meta: Meta = { title: 'Foundations/Text size', parameters: { frame: 'padded' } }
export default meta

const SIZES = ['small', 'normal', 'large', 'larger'] as const
type Size = (typeof SIZES)[number]

const STEPS = ['2xs', 'xs', 'sm', 'base', 'page'] as const

/** A level's steps in px, size over line height, as tokens.json sets them; large is the theme's own. */
function stepsOf(size: Size): string {
    const level = tokens.textSize[size] as Record<string, string>
    const theme = tokens.theme as Record<string, string>
    const px = (name: string) => String(Number.parseFloat((size === 'large' ? theme : level)[name]) * 16)
    return STEPS.map((step) => `${step} ${px(`text-${step}`)}/${px(`text-${step}--line-height`)}`).join(', ')
}

const LABELS: Record<Size, string> = { small: 'Small', normal: 'Normal, the default', large: 'Large', larger: 'Larger' }

interface Run {
    id: string
    job: string
    status: Status
    took: string
}

const RUNS: Run[] = [
    { id: '01a1a5c6', job: 'nightly-export', status: 'succeeded', took: '1.4s' },
    { id: '01a1a5c2', job: 'import-orders', status: 'failed', took: '0.3s' },
    { id: '01a1a5b9', job: 'sync-inventory', status: 'running', took: '-' },
    { id: '01a1a5b1', job: 'rebuild-index', status: 'succeeded', took: '8.2s' },
]

const COLUMNS: DataColumn<Run>[] = [
    { id: 'job', header: 'Job', width: 'minmax(0,1fr)', cell: (run) => <span className="truncate">{run.job}</span> },
    { id: 'status', header: 'Status', width: '8.5rem', cell: (run) => <StatusChip status={run.status} /> },
    {
        id: 'took',
        header: 'Took',
        width: '4.5rem',
        align: 'end',
        cell: (run) => <span className="font-mono text-xs tabular-nums">{run.took}</span>,
    },
]

const GROUPS: RailGroup[] = [
    {
        id: 'operate',
        title: 'Operate',
        entries: [
            { id: 'runs', label: 'Runs', icon: Play, href: '#', active: true },
            { id: 'schedules', label: 'Schedules', icon: CalendarClock, href: '#' },
        ],
    },
    {
        id: 'build',
        title: 'Build',
        entries: [
            { id: 'jobs', label: 'Jobs', icon: Workflow, href: '#' },
            { id: 'services', label: 'Services', icon: Server, href: '#' },
        ],
    },
]

const PROJECTS = [
    { value: 'harbor', label: 'harbor' },
    { value: 'juniper', label: 'juniper' },
    { value: 'larkspur', label: 'larkspur' },
]

/** One text size's page, its steps under its name. */
function Level({ size }: { size: Size }) {
    return (
        <Stack gap="md" data-text-size-scope={size} className="min-w-0">
            <Stack gap="xs">
                <span className="text-section-title">{LABELS[size]}</span>
                <span className="text-help text-muted-foreground">{stepsOf(size)}</span>
            </Stack>
            <Row gap="none" align="stretch" className="h-80 overflow-hidden rounded-lg border">
                <Rail mark={<TidevannMark />} name="Tidevann" groups={GROUPS} resizable={false} />
                <Stack gap="md" className="min-w-0 flex-1 p-4">
                    <PageHeader title="Runs" count="8 today" actions={<Button size="sm">Run a job</Button>} />
                    <DataTable columns={COLUMNS} rows={RUNS} rowKey={(run) => run.id} />
                </Stack>
            </Row>
            <Section title="Schedule" variant="boxed">
                <Stack gap="md">
                    <TextField id={`${size}-job`} label="Job" defaultValue="nightly-export" description="Runs at 02:00 UTC." />
                    <SelectField id={`${size}-project`} label="Project" options={PROJECTS} defaultValue="harbor" />
                </Stack>
            </Section>
            <Section title="Run 01a1a5c2" variant="boxed">
                <Stack gap="md">
                    <p className="text-body">
                        The import stopped at validate: 37 rows had an amount written as n/a. Fix the rows and run it again.
                    </p>
                    <DescriptionList
                        items={[
                            { term: 'Status', value: <StatusChip status="failed" /> },
                            { term: 'Started by', value: 'ada' },
                            { term: 'Tags', value: <TagChips tags={['orders', 'hourly', 'juniper']} /> },
                        ]}
                    />
                </Stack>
            </Section>
        </Stack>
    )
}

/** Small, normal (the default), large (the theme's own sizes) and larger, side by side. */
export const Compare: StoryObj = {
    render: () => (
        <TooltipProvider>
            <Columns count={2} min="xl" rowGap="3xl">
                {SIZES.map((size) => (
                    <Level key={size} size={size} />
                ))}
            </Columns>
        </TooltipProvider>
    ),
}
