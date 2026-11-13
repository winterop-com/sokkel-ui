import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Group } from '@winterop-com/sokkel-ui/Group'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/** A run of entries under a small title, with a count of what it holds and small actions. */
const meta: Meta = { title: 'Patterns/Group', parameters: { frame: 'padded' } }
export default meta

/** A title over its entries, nothing more. */
export const Plain: StoryObj = {
    render: () => (
        <Group title="Inputs">
            <DescriptionList
                items={[
                    { term: 'Source', value: 'https://api.example.org/orders', code: true },
                    { term: 'Since', value: '2026-11-04 00:00', numeric: true },
                ]}
            />
        </Group>
    ),
}

/** Counts beside the titles: quiet for how many steps there are, critical for what failed, none for zero skipped. */
export const Counts: StoryObj = {
    render: () => (
        <Stack gap="xl">
            <Group title="Steps" count={5}>
                <DescriptionList
                    items={[
                        { term: 'fetch', value: <StatusChip status="succeeded" /> },
                        { term: 'transform', value: <StatusChip status="succeeded" /> },
                        { term: 'validate', value: <StatusChip status="failed" /> },
                        { term: 'upload', value: <StatusChip status="skipped" /> },
                        { term: 'notify', value: <StatusChip status="skipped" /> },
                    ]}
                />
            </Group>
            <Group title="Failed checks" count={2} countTone="critical" countLabel={(count) => `${String(count)} failed`}>
                <DescriptionList
                    items={[
                        { term: 'orders.total', value: 'is negative on 3 rows' },
                        { term: 'orders.site', value: 'names a site that does not exist' },
                    ]}
                />
            </Group>
            <Group title="Skipped" count={0}>
                <DescriptionList items={[{ term: 'Steps', value: null }]} />
            </Group>
        </Stack>
    ),
}

/** Groups inside a boxed section, each with an icon button at the end of its title's line. */
export const InSection: StoryObj = {
    name: 'In a section',
    render: () => (
        <Section title="import-orders">
            <Stack gap="xl">
                <Group
                    title="Watchers"
                    count={3}
                    actions={
                        <IconButton label="Add a watcher" size="icon-xs">
                            <Plus aria-hidden />
                        </IconButton>
                    }
                >
                    <DescriptionList
                        items={[
                            { term: 'ada', value: 'every failure' },
                            { term: 'grace', value: 'every run' },
                            { term: 'linus', value: 'daily digest' },
                        ]}
                    />
                </Group>
                <Group
                    title="Schedules"
                    count={1}
                    actions={
                        <IconButton label="Add a schedule" size="icon-xs">
                            <Plus aria-hidden />
                        </IconButton>
                    }
                >
                    <DescriptionList items={[{ term: 'Hourly', value: '0 * * * *', code: true }]} />
                </Group>
            </Stack>
        </Section>
    ),
}
