import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { MediaCard } from '@winterop-com/sokkel-ui-media/MediaCard'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'

const meta: Meta = { title: 'Patterns/Meta line', parameters: { frame: 'column' } }
export default meta

/** Facts under a title, small and quiet, joined by a middle dot. */
export const Facts: StoryObj = {
    render: () => (
        <Stack gap="2xs" className="max-w-sm">
            <p className="text-sm font-medium">Coastline, morning to evening</p>
            <MetaLine items={['margaret', '1:36', '2.4k views']} />
        </Stack>
    ),
}

/** Each size and tone: the default, at the text size, and strong. A missing fact is left out. */
export const Sizes: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <MetaLine items={['harbor', undefined, 'nightly-export', '14 runs']} />
            <MetaLine size="sm" items={['harbor', 'nightly-export', '14 runs']} />
            <MetaLine size="sm" tone="strong" items={['18,402 views', '3 days ago']} />
        </Stack>
    ),
}

/** Truncated to one line in a narrow column, against the same line wrapping. */
export const Truncated: StoryObj = {
    render: () => {
        const facts = ['Fishing Villages of the Northern Coast', 'episode 1', 'margaret', '2026', '41:12']
        return (
            <Stack className="max-w-56">
                <MetaLine truncate items={facts} />
                <MetaLine items={facts} />
            </Stack>
        )
    },
}

/** Inline, as a card's subtitle: the line takes the card's own size and color. */
export const Inline: StoryObj = {
    render: () => (
        <div className="w-48">
            <MediaCard
                title="Open Water"
                subtitle={<MetaLine inline items={['Grace', '2025']} />}
                cover={<Artwork cover={{ motif: 'wave', from: 'blue', to: 'teal' }} />}
                href="#"
            />
        </div>
    ),
}
