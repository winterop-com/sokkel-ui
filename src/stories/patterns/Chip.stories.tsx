import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, Clock, Copy, Filter, GitBranch, Radio, Server, SquareArrowOutUpRight, Tag } from 'lucide-react'
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

const TONES: ChipTone[] = ['neutral', 'good', 'critical', 'warning', 'info', 'outline', 'absent']

/** Every tone: neutral, the semantic colors in their own ink, a hairline outline, and a dashed chip for a value that is absent. */
export const Tones: StoryObj = {
    render: () => (
        <Row gap="xs" wrap>
            <Chip>nightly</Chip>
            <Chip tone="good">healthy</Chip>
            <Chip tone="critical">over budget</Chip>
            <Chip tone="warning">slow</Chip>
            <Chip tone="info">new</Chip>
            <Chip tone="outline">draft</Chip>
            <Chip tone="absent">no owner</Chip>
        </Row>
    ),
}

/** A category's hue from the chart palette, edged faintly in it, for chips that tell kinds apart rather than say how something is. */
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

/** Every kind color by name, the one a label, a calendar or a person wears, drawn as a kind badge is, for a chip whose category already has a kind color. */
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

/**
 * Chips that stand alone as controls, as tall as a field or a button beside them and a finger tall
 * on a phone: the service a page talks to, a channel picked from a strip.
 */
export const ControlSize: StoryObj = {
    name: 'Control size',
    render: function Render() {
        const [channel, setChannel] = useState('nightly')
        return (
            <Stack gap="md">
                <Row gap="xs" wrap>
                    <Chip size="control" mono icon={<Server aria-hidden />} href="#/services/api">
                        api.example.org
                    </Chip>
                    <Chip size="control" tone="good" icon={<Radio aria-hidden />}>
                        connected
                    </Chip>
                </Row>
                <Row gap="xs" wrap>
                    {['nightly', 'hourly', 'on demand'].map((name) => (
                        <Chip key={name} size="control" selected={name === channel} onSelect={() => setChannel(name)}>
                            {name}
                        </Chip>
                    ))}
                </Row>
            </Stack>
        )
    },
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

/**
 * Chips that are links: a project opened through the app's router, and the service's guide on
 * another site, opened in a new tab with a trailing mark.
 */
export const Links: StoryObj = {
    render: () => (
        <Row gap="xs" wrap>
            <Chip mono href="#/projects/harbor" selectLabel="Open harbor">
                harbor
            </Chip>
            <Chip mono hue="teal" href="#/projects/juniper">
                juniper
            </Chip>
            <Chip icon={<BookOpen aria-hidden />} href="https://docs.example.org/api" external>
                api guide
            </Chip>
        </Row>
    ),
}

/** Many toggles, each turned on and off by itself: the projects a list shows, each edged in its ink on a stronger wash while on. */
export const Toggles: StoryObj = {
    render: function Render() {
        const [on, setOn] = useState<readonly string[]>(['harbor', 'larkspur'])
        return (
            <Stack gap="md">
                <Row gap="xs" wrap>
                    {['harbor', 'juniper', 'larkspur', 'nightly', 'hourly', 'critical-path'].map((tag) => (
                        <Chip
                            key={tag}
                            mono
                            selected={on.includes(tag)}
                            onSelect={() => setOn(on.includes(tag) ? on.filter((other) => other !== tag) : [...on, tag])}
                        >
                            {tag}
                        </Chip>
                    ))}
                </Row>
                <Row gap="xs" wrap>
                    {TONES.filter((tone) => tone !== 'absent').map((tone) => (
                        <Chip
                            key={tone}
                            tone={tone}
                            selected={tone === 'critical' || tone === 'info' || tone === 'outline'}
                            onSelect={() => undefined}
                        >
                            {tone}
                        </Chip>
                    ))}
                </Row>
                <Row gap="xs" wrap>
                    {KIND_COLORS.map((color, index) => (
                        <Chip key={color} hue={color} selected={index % 2 === 0} onSelect={() => undefined}>
                            {color}
                        </Chip>
                    ))}
                </Row>
                <span className="text-sm text-muted-foreground">Showing {on.length === 0 ? 'every project' : on.join(', ')}</span>
            </Stack>
        )
    },
}

/** A chip that opens a menu of what to do with its value: filter by the project, copy it, or open it; the second lines its menu up at its end. */
export const Menu: StoryObj = {
    render: () => (
        <Row gap="xs" wrap>
            <Chip
                mono
                defaultOpen
                selectLabel="harbor, more"
                menu={[
                    { label: 'Filter by harbor', icon: <Filter aria-hidden />, onSelect: () => undefined },
                    { label: 'Copy the name', icon: <Copy aria-hidden />, onSelect: () => undefined },
                    { label: 'Open the project', icon: <SquareArrowOutUpRight aria-hidden />, onSelect: () => undefined },
                ]}
            >
                harbor
            </Chip>
            <Chip mono menuAlign="end" menu={[{ label: 'Filter by juniper', onSelect: () => undefined }]}>
                juniper
            </Chip>
        </Row>
    ),
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
