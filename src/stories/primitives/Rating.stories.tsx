import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Rating } from '@winterop-com/sokkel-ui/Rating'

/** A rating in stars: chosen with a press or the arrow keys, or shown, filled to the fraction an average has. */
const meta: Meta = { title: 'Primitives/Inputs/Rating', parameters: { frame: 'column' } }
export default meta

/** A choice at both sizes, one turned off, and one with ten stars. Press the stars given to take the rating back to none. */
export const Choice: StoryObj = {
    render: function Render() {
        const [stars, setStars] = useState(3)
        return (
            <Stack gap="lg">
                <Row gap="md">
                    <Rating label="How was the export" value={stars} onValueChange={setStars} />
                    <span className="text-sm text-muted-foreground tabular-nums">{stars} of 5</span>
                </Row>
                <Rating label="How was the sync" defaultValue={4} onValueChange={() => undefined} size="sm" />
                <Rating label="How was the digest" defaultValue={2} onValueChange={() => undefined} disabled />
                <Rating label="How was the index" defaultValue={7} max={10} onValueChange={() => undefined} />
            </Stack>
        )
    },
}

/** Ratings shown, not chosen: averages filled to their fraction, as a list of reviews shows them. */
export const Shown: StoryObj = {
    render: () => (
        <Stack gap="sm">
            {[4.6, 3.5, 2.2, 0].map((average) => (
                <Row key={average} gap="sm">
                    <Rating label="Average" value={average} size="sm" />
                    <span className="text-xs text-muted-foreground tabular-nums">{average.toFixed(1)}</span>
                </Row>
            ))}
        </Stack>
    ),
}
