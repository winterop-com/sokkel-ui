import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TimeField } from '@winterop-com/sokkel-ui/TimeField'

/**
 * A time of day typed on a 24 or a 12-hour clock, with a list of times beside it. The value is
 * always `HH:mm` (or `HH:mm:ss`); `930`, `9.30` and `9:30 pm` all read, and text that is not a time
 * is said with the issue mark once the field is left.
 */
const meta: Meta = { title: 'Primitives/Inputs/Time field', parameters: { frame: 'column' } }
export default meta

/** A time with a value, an empty optional one, one on a 12-hour clock, one with seconds and one naming its zone. */
export const Plain: StoryObj = {
    render: function Render() {
        const [at, setAt] = useState<string | null>('02:00')
        return (
            <Stack gap="lg" className="max-w-sm">
                <TimeField id="plain-at" label="Runs at" value={at} onValueChange={setAt} />
                <TimeField id="plain-quiet" label="Quiet from" help="No digest is sent after this time." />
                <TimeField id="plain-twelve" label="Digest at" clock={12} defaultValue="17:30" />
                <TimeField id="plain-seconds" label="Cut-off" seconds defaultValue="23:59:30" required />
                <TimeField id="plain-zone" label="Window opens" zone="UTC" defaultValue="22:00" />
            </Stack>
        )
    },
}

/** Bounds: a time after `max` is kept and said at once, its mark offering the bound. */
export const Bounds: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <TimeField id="bounds-at" label="Runs at" description="Within the night window." min="22:00" max="23:30" defaultValue="23:45" />
            <TimeField id="bounds-ok" label="Retries until" min="22:00" max="23:30" defaultValue="23:00" />
        </Stack>
    ),
}

/** The list open every 15 minutes between the bounds, scrolled to the chosen time. */
export const Open: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm pb-72">
            <TimeField id="open-at" label="Runs at" min="06:00" max="22:00" step={15} defaultValue="09:30" defaultOpen />
        </Stack>
    ),
}
