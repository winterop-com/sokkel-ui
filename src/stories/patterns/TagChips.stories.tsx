import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'

/** A row of tags as mono chips that shows as many as fit the room left and a +N for the rest, named by the tags it stands for. */
const meta: Meta = { title: 'Patterns/Tag chips', parameters: { frame: 'column' } }
export default meta

const TAGS = ['nightly', 'export', 'harbor', 'warehouse', 'csv', 'retry-on-failure', 'owner: grace', 'europe', 'archived-input']

/** Few enough to fit: every tag shows and no count. */
export const Fits: StoryObj = {
    render: () => <TagChips tags={['nightly', 'export', 'harbor']} />,
}

/** Beside a job's name in rows of narrowing width: each row shows what fits and counts the rest, named on hover. */
export const Room: StoryObj = {
    render: () => (
        <Stack gap="md">
            {(['max-w-full', 'max-w-xl', 'max-w-sm', 'max-w-xs'] as const).map((width) => (
                <Surface key={width} className={width}>
                    <Row gap="md" className="px-3 py-2">
                        <span className="shrink-0 font-mono text-sm">nightly-export</span>
                        <TagChips tags={TAGS} />
                    </Row>
                </Surface>
            ))}
        </Stack>
    ),
}

/** Held to three even where more would fit, in the outline look, the +N named by the tags left out. */
export const Capped: StoryObj = {
    render: () => <TagChips tags={TAGS} max={3} variant="outline" />,
}

/**
 * Tags a press filters by: each shown tag is a button, and the +N chip opens a menu of the rest,
 * drawn as chips, each filtering the same way.
 */
export const Selectable: StoryObj = {
    render: function Render() {
        const [filter, setFilter] = useState<string | undefined>(undefined)
        return (
            <Stack gap="md">
                <Surface className="max-w-sm">
                    <Row gap="md" className="px-3 py-2">
                        <span className="shrink-0 font-mono text-sm">nightly-export</span>
                        <TagChips tags={TAGS} onSelect={setFilter} words={{ select: (tag) => `Filter by ${tag}` }} />
                    </Row>
                </Surface>
                <span className="text-sm text-muted-foreground">{filter === undefined ? 'No filter' : `Filtered by ${filter}`}</span>
            </Stack>
        )
    },
}

interface Job {
    job: string
    owner: string
    tags: readonly string[]
}

const JOBS: Job[] = [
    { job: 'nightly-export', owner: 'ada', tags: ['nightly', 'harbor', 'csv', 'europe', 'retry-on-failure'] },
    { job: 'sync-inventory', owner: 'grace', tags: ['hourly', 'juniper', 'critical-path'] },
    { job: 'rebuild-index', owner: 'linus', tags: ['search', 'larkspur'] },
    { job: 'import-orders', owner: 'margaret', tags: ['hourly', 'larkspur', 'orders', 'archived-input', 'warehouse', 'api'] },
]

const COLUMNS: DataColumn<Job>[] = [
    { id: 'job', header: 'Job', width: 'content', cell: (job) => <span className="font-mono">{job.job}</span> },
    { id: 'tags', header: 'Tags', width: 'minmax(8rem,1fr)', cell: (job) => <TagChips tags={job.tags} /> },
    { id: 'owner', header: 'Owner', width: '7rem', cell: (job) => job.owner },
]

/**
 * Tags in a table's column: each row shows as many as its column's room holds and a +N for the
 * rest, folding as the column narrows; once the rows stack as cards, every tag shows, wrapping.
 */
export const InATable: StoryObj = {
    name: 'In a table',
    parameters: { frame: 'padded' },
    render: () => <DataTable variant="list" columns={COLUMNS} rows={JOBS} rowKey={(job) => job.job} stackBelow="36rem" />,
}
