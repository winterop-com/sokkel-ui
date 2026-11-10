import type { Meta, StoryObj } from '@storybook/react-vite'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { InlineCode } from '@winterop-com/sokkel-ui/InlineCode'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A one-line value in the code face: a run id, a host, a path, a command. It never wraps; a value
 * wider than its room is cut short, and its title holds the whole of it. A tone colors a value that
 * is itself a state.
 */
const meta: Meta = { title: 'Patterns/Inline code', parameters: { frame: 'padded' } }
export default meta

/** A value inside a sentence. */
export const InText: StoryObj = {
    name: 'In text',
    render: () => (
        <p className="max-w-md text-sm">
            nightly-export uploads to <InlineCode value="files.example.org" /> as <InlineCode value="run-4812" /> finishes its validate
            step.
        </p>
    ),
}

/** Neutral, muted and each status tone. */
export const Tones: StoryObj = {
    render: () => (
        <Row gap="md" wrap className="text-sm">
            <InlineCode value="run-4812" />
            <InlineCode value="harbor" tone="muted" />
            <InlineCode value="exit 1" tone="critical" />
            <InlineCode value="retry 2 of 3" tone="warning" />
            <InlineCode value="queued" tone="info" />
            <InlineCode value="exit 0" tone="good" />
        </Row>
    ),
}

/** Bare, with no wash: a job's code in muted ink at the small face beside its name, and each tone's ink alone. */
export const Bare: StoryObj = {
    render: () => (
        <Stack gap="md">
            <Row gap="sm" className="items-baseline">
                <span className="text-base font-semibold">Sync inventory</span>
                <InlineCode value="sync-inventory" tone="muted" bare size="xs" />
            </Row>
            <Row gap="md" wrap className="text-sm">
                <InlineCode value="run-4812" bare />
                <InlineCode value="exit 1" tone="critical" bare />
                <InlineCode value="exit 0" tone="good" bare />
            </Row>
        </Stack>
    ),
}

/** Among a run's facts, where a long command is cut short in its column and its title holds the rest. */
export const InFacts: StoryObj = {
    name: 'In facts',
    render: () => (
        <Stack className="max-w-lg">
            <DescriptionList
                columns={2}
                layout="stacked"
                items={[
                    { term: 'Run', value: <InlineCode value="run-4812" /> },
                    { term: 'Host', value: <InlineCode value="worker-1.example.org" /> },
                    {
                        term: 'Command',
                        value: (
                            <InlineCode value="tidevann jobs run nightly-export --project harbor --target https://files.example.org/exports/harbor" />
                        ),
                    },
                    { term: 'Exit', value: <InlineCode value="exit 1" tone="critical" /> },
                ]}
            />
        </Stack>
    ),
}
