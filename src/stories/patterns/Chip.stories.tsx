import type { Meta, StoryObj } from '@storybook/react-vite'
import { Clock, GitBranch, Server, Tag } from 'lucide-react'
import { useState } from 'react'

import { Chip, type ChipTone } from '@winterop-com/sokkel-ui/Chip'
import { KIND_COLORS } from '@winterop-com/sokkel-ui/lib/kind'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'

/**
 * A short value as a chip: a tag on a job, a value with a meaning of its own, or one that is
 * absent. A run's state is a `StatusChip`; a chip says anything else.
 */
const meta: Meta = { title: 'Patterns/Chip', parameters: { frame: 'padded' } }
export default meta

const TONES: ChipTone[] = ['neutral', 'good', 'critical', 'warning', 'info', 'absent']

/** Every tone: neutral, the semantic colors in their own ink, and a dashed chip for a value that is absent. */
export const Tones: StoryObj = {
    render: () => (
        <Row gap="xs" wrap>
            <Chip>nightly</Chip>
            <Chip tone="good">healthy</Chip>
            <Chip tone="critical">over budget</Chip>
            <Chip tone="warning">slow</Chip>
            <Chip tone="info">new</Chip>
            <Chip tone="absent">no owner</Chip>
        </Row>
    ),
}

/** A category's hue from the chart palette, for chips that tell kinds apart rather than say how something is. */
export const Hues: StoryObj = {
    render: () => (
        <Row gap="xs" wrap>
            <Chip hue={1}>source</Chip>
            <Chip hue={2}>transform</Chip>
            <Chip hue={3}>check</Chip>
            <Chip hue={4}>sink</Chip>
            <Chip hue={5}>notice</Chip>
        </Row>
    ),
}

/** Every kind color by name, the one a label, a calendar or a person wears, for a chip whose category already has a kind color. */
export const KindHues: StoryObj = {
    name: 'Kind hues',
    render: () => (
        <Row gap="xs" wrap>
            {KIND_COLORS.map((color) => (
                <Chip key={color} hue={color}>
                    {color}
                </Chip>
            ))}
        </Row>
    ),
}

/** In the code face, with an icon before the words, and a long value cut short with the whole of it on hover. */
export const MonoAndIcons: StoryObj = {
    name: 'Mono and icons',
    render: () => (
        <Stack gap="md">
            <Row gap="xs" wrap>
                <Chip mono>nightly-export</Chip>
                <Chip mono icon={<GitBranch aria-hidden />}>
                    main
                </Chip>
                <Chip icon={<Server aria-hidden />}>worker</Chip>
                <Chip tone="warning" icon={<Clock aria-hidden />}>
                    late 12 min
                </Chip>
                <Chip tone="absent" icon={<Tag aria-hidden />}>
                    no tags
                </Chip>
            </Row>
            <Row gap="xs" className="max-w-60">
                <Chip mono title="import-orders-from-the-harbor-warehouse-every-night">
                    import-orders-from-the-harbor-warehouse-every-night
                </Chip>
            </Row>
        </Stack>
    ),
}

/** Chips a press acts on: a tag that filters by itself, named for what the press does, and tags a job carries, each with a remove button named for its tag. */
export const Interactive: StoryObj = {
    render: function Render() {
        const [tags, setTags] = useState(['nightly', 'harbor', 'export', 'critical-path'])
        const [filter, setFilter] = useState<string | undefined>(undefined)
        return (
            <Stack gap="md">
                <Row gap="xs" wrap>
                    {tags.map((tag) => (
                        <Chip
                            key={tag}
                            mono
                            tone={tag === filter ? 'info' : 'neutral'}
                            onSelect={() => setFilter(tag === filter ? undefined : tag)}
                            selectLabel={tag === filter ? 'Clear the filter' : `Filter by ${tag}`}
                            onRemove={() => setTags(tags.filter((other) => other !== tag))}
                            words={{ remove: (text) => `Remove ${text}` }}
                        >
                            {tag}
                        </Chip>
                    ))}
                    {tags.length === 0 && <Chip tone="absent">no tags</Chip>}
                </Row>
                <Row gap="xs" wrap>
                    {TONES.map((tone) => (
                        <Chip key={tone} tone={tone} onSelect={() => setFilter(tone)}>
                            {tone}
                        </Chip>
                    ))}
                </Row>
                <span className="text-sm text-muted-foreground">{filter === undefined ? 'No filter' : `Filtered by ${filter}`}</span>
            </Stack>
        )
    },
}

interface Job {
    job: string
    state: string
    owner?: string
    tags: string[]
}

const JOBS: Job[] = [
    { job: 'nightly-export', state: 'succeeded', owner: 'ada', tags: ['nightly', 'harbor'] },
    { job: 'sync-inventory', state: 'failed', owner: 'grace', tags: ['juniper', 'critical-path'] },
    { job: 'rebuild-index', state: 'running', owner: 'linus', tags: ['search'] },
    { job: 'send-digest', state: 'queued', tags: [] },
    { job: 'import-orders', state: 'skipped', owner: 'margaret', tags: ['larkspur', 'orders', 'hourly'] },
]

const COLUMNS: DataColumn<Job>[] = [
    { id: 'job', header: 'Job', width: 'minmax(10rem,1fr)', cell: (job) => <span className="font-mono">{job.job}</span> },
    { id: 'state', header: 'State', width: '8rem', cell: (job) => <StatusChip status={job.state} dot /> },
    {
        id: 'owner',
        header: 'Owner',
        width: '8rem',
        cell: (job) => (job.owner === undefined ? <Chip tone="absent">no owner</Chip> : job.owner),
    },
    {
        id: 'tags',
        header: 'Tags',
        width: 'minmax(12rem,1fr)',
        cell: (job) => (
            <Row gap="xs">
                {job.tags.length === 0 ? (
                    <Chip tone="absent">no tags</Chip>
                ) : (
                    job.tags.map((tag) => (
                        <Chip key={tag} mono>
                            {tag}
                        </Chip>
                    ))
                )}
            </Row>
        ),
    },
]

/** A table of jobs: each run's state as a status chip, its tags as chips, and an absent owner or tag list dashed. */
export const InATable: StoryObj = {
    name: 'In a table',
    render: () => <DataTable variant="list" columns={COLUMNS} rows={JOBS} rowKey={(job) => job.job} />,
}
