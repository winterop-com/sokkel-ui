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

/** The options: still bars in another ink, flow lines as dots with no rings, a wider graph that holds still, and one with nothing lit. */
export const Options: StoryObj = {
    render: () => (
        <Columns count={2} min="xs" gap="lg">
            <Surface className="h-72 p-6">
                <LevelBars seed={12} breathe={false} color="var(--kind-teal-ink)" />
            </Surface>
            <Surface className="h-72 p-6">
                <FlowLines seed={8} nodes="dot" rings={0} />
            </Surface>
            <Surface className="h-72 p-6">
                <FlowLines seed={15} columns={8} rows={[3, 5]} flow={false} color="var(--kind-violet-ink)" />
            </Surface>
            <Surface className="h-72 p-6">
                <FlowLines seed={3} lit={false} glow={false} rings={3} />
            </Surface>
        </Columns>
    ),
}
