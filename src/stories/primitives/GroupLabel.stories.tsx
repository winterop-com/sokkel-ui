import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpen, FolderTree, LayoutDashboard, Play, Settings, Workflow } from 'lucide-react'

import { GroupLabel } from '@winterop-com/sokkel-ui/GroupLabel'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@winterop-com/sokkel-ui/primitives/item'
import { Surface } from '@winterop-com/sokkel-ui/Section'

const meta: Meta = { title: 'Primitives/Display/Group label', parameters: { frame: 'column' } }
export default meta

const GROUPS = [
    {
        label: 'Operate',
        entries: [
            { label: 'Overview', icon: LayoutDashboard },
            { label: 'Runs', icon: Play },
        ],
    },
    {
        label: 'Build',
        entries: [
            { label: 'Pipelines', icon: Workflow },
            { label: 'Files', icon: FolderTree },
        ],
    },
    {
        label: 'Reference',
        entries: [
            { label: 'Docs', icon: BookOpen },
            { label: 'Settings', icon: Settings },
        ],
    },
]

/** Each group's entries under its label. */
function Groups() {
    return (
        <Stack gap="lg">
            {GROUPS.map((group) => (
                <Stack key={group.label} gap="2xs">
                    <GroupLabel as="h3">{group.label}</GroupLabel>
                    <ItemGroup>
                        {group.entries.map((entry) => (
                            <Item key={entry.label} size="xs">
                                <ItemMedia variant="icon">
                                    <entry.icon />
                                </ItemMedia>
                                <ItemContent>
                                    <ItemTitle>{entry.label}</ItemTitle>
                                </ItemContent>
                            </Item>
                        ))}
                    </ItemGroup>
                </Stack>
            ))}
        </Stack>
    )
}

/** Labels over a page's groups of entries, as a rail and a panel set them. */
export const Over: StoryObj = { name: 'Over groups', render: () => <Groups /> }

/** The same labels on each surface they stand on: the page, a card, a well and an inset. */
export const Surfaces: StoryObj = {
    name: 'On surfaces',
    render: () => (
        <Row gap="lg" align="stretch" wrap>
            <Stack gap="2xs" className="border border-transparent p-(--density-panel-pad)">
                <GroupLabel>Page</GroupLabel>
                <span className="text-sm">nightly-export</span>
            </Stack>
            {(['card', 'well', 'inset'] as const).map((tone) => (
                <Surface key={tone} tone={tone} pad>
                    <Stack gap="2xs">
                        <GroupLabel>{tone}</GroupLabel>
                        <span className="text-sm">nightly-export</span>
                    </Stack>
                </Surface>
            ))}
        </Row>
    ),
}
