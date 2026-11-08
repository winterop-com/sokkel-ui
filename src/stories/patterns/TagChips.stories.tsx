import type { Meta, StoryObj } from '@storybook/react-vite'

import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { TagChips } from '@winterop-com/sokkel-ui/TagChips'

/** A row of tags that shows as many as fit the room left and a +N for the rest. */
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

/** Held to three even where more would fit, in the outline look. */
export const Capped: StoryObj = {
    render: () => <TagChips tags={TAGS} max={3} variant="outline" />,
}
