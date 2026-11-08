import type { Meta, StoryObj } from '@storybook/react-vite'

import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { FlowLines, LevelBars } from '@winterop-com/sokkel-ui/SignInArt'

/** The art a sign-in screen's brand pane can carry, inked from the theme and moving slowly. */
const meta: Meta = { title: 'Patterns/Sign in/Art', parameters: { frame: 'padded' } }
export default meta

/** Level bars, the run around the tallest peak lit, at three seeds. */
export const Bars: StoryObj = {
    render: () => (
        <Columns count={3} min="xs" gap="lg">
            {[7, 12, 21].map((seed) => (
                <Surface key={seed} className="h-72 p-6">
                    <LevelBars seed={seed} />
                </Surface>
            ))}
        </Columns>
    ),
}

/** Flow lines, one path lit toward the last node, at three seeds. */
export const Lines: StoryObj = {
    render: () => (
        <Columns count={3} min="xs" gap="lg">
            {[3, 8, 15].map((seed) => (
                <Surface key={seed} className="h-72 p-6">
                    <FlowLines seed={seed} />
                </Surface>
            ))}
        </Columns>
    ),
}
