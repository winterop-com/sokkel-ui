import type { Meta, StoryObj } from '@storybook/react-vite'

import { Highlight } from '@winterop-com/sokkel-ui/Highlight'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/** A text with spans of it marked by their character offsets, in the accent's tint and ink. */
const meta: Meta = { title: 'Patterns/Highlight', parameters: { frame: 'padded' } }
export default meta

const FAILED = 'nightly-export failed at the upload step: the bucket on files.example.org refused the token.'

/** One span, given as `start` and `end`. */
export const One: StoryObj = {
    name: 'One span',
    render: () => <Highlight className="text-sm" text={FAILED} start={15} end={21} />,
}

const NOTE =
    'The worker fetched 1,204 orders, transformed them, and stopped in validate: 3 orders had no site, and 1 had a price below zero. Upload and notify were skipped, so nothing reached the harbor project.'

/** Several spans in a paragraph that wraps, one of them across a line's end, as a model picks out the phrases that matter. */
export const Several: StoryObj = {
    name: 'Several spans',
    render: () => (
        <Stack gap="md" className="max-w-md">
            <Highlight
                className="text-sm"
                text={NOTE}
                ranges={[
                    { start: 66, end: 74 },
                    { start: 76, end: 96 },
                    { start: 102, end: 126 },
                    { start: 128, end: 158 },
                ]}
            />
            <Highlight className="font-mono text-xs text-muted-foreground" text="run_8f3a02 import-orders validate" start={25} end={33} />
        </Stack>
    ),
}
