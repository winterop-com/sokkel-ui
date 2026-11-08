import type { Meta, StoryObj } from '@storybook/react-vite'
import { Pencil } from 'lucide-react'

import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { ShowMore } from '@winterop-com/sokkel-ui/ShowMore'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'

/** A block of text held to a few lines, with Show more to read the rest. */
const meta: Meta = { title: 'Patterns/Show more', parameters: { frame: 'column' } }
export default meta

const NOTE =
    'Write a short note to the team about why nightly-export failed last night. Say which step failed, how many rows it rejected and why, and what we changed so it does not happen again. Keep it under two hundred words, plain and without blame, and end with the one thing we are still watching.'

/** Text that fits its two lines: no control, since there is nothing more to show. */
export const Short: StoryObj = {
    render: () => <ShowMore>Rebuild the search index from the orders of the last thirty days.</ShowMore>,
}

/** A prompt folded to two lines, the settings it ran with over it and an edit button at its end. */
export const Folded: StoryObj = {
    render: () => (
        <Surface className="p-(--density-panel-pad)">
            <ShowMore
                head={<p className="font-mono text-xs text-muted-foreground">failure-note, temperature 0.7, max 1,024 tokens</p>}
                actions={
                    <Button size="sm" variant="ghost" className="text-muted-foreground">
                        <Pencil aria-hidden />
                        Edit
                    </Button>
                }
            >
                {NOTE}
            </ShowMore>
        </Surface>
    ),
}

/** The same text opened, with Show less to fold it again. */
export const Open: StoryObj = {
    render: () => <ShowMore defaultOpen>{NOTE}</ShowMore>,
}

/** A video's description on the muted ground, its views and age over it, folded to three lines. */
export const Well: StoryObj = {
    render: () => (
        <ShowMore variant="well" lines={3} head={<MetaLine size="sm" tone="strong" items={['52k views', '3 weeks ago']} />}>
            Four mornings on one headland of the northern coast, cut into one: the first light on the water, the harbor waking up, and the
            boats leaving one by one. Filmed from the same spot each day, with nothing added but the sound of the place. The next part
            follows the boats back in, and the one after that goes out with them past the breakwater to the fishing grounds, where the light
            comes an hour later.
        </ShowMore>
    ),
}
