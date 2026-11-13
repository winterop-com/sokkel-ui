import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DateTimeField } from '@winterop-com/sokkel-ui/DateTimeField'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A date and a time typed as one, with a calendar and a list of times beside it. The value is a
 * moment on the wall clock with no zone, `YYYY-MM-DDTHH:mm`, as a `datetime-local` input holds it;
 * the field names the zone it is read in with `zone`.
 */
const meta: Meta = { title: 'Primitives/Inputs/Date and time field', parameters: { frame: 'column' } }
export default meta

/** The day these stories call today. */
const TODAY = '2026-11-09'

/** A moment with its zone, an empty optional one, and one set in the code face (`mono`). */
export const Plain: StoryObj = {
    render: function Render() {
        const [at, setAt] = useState<string | null>('2026-11-10T02:00')
        return (
            <Stack gap="lg" className="max-w-sm">
                <DateTimeField id="plain-next" label="Next run" zone="UTC" value={at} onValueChange={setAt} today={TODAY} />
                <DateTimeField id="plain-until" label="Paused until" help="Runs start again at this time." today={TODAY} />
                <DateTimeField id="plain-stamp" label="Started at" zone="UTC" mono defaultValue="2026-11-09T02:00" today={TODAY} />
            </Stack>
        )
    },
}

/** The same moment with the day first on a 24-hour clock, and the month first on a 12-hour one. */
export const Formats: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <DateTimeField id="formats-dots" label="Day first" format="DD.MM.YYYY" defaultValue="2026-11-10T14:30" today={TODAY} />
            <DateTimeField
                id="formats-us"
                label="Month first"
                format="MM/DD/YYYY"
                clock={12}
                defaultValue="2026-11-10T14:30"
                today={TODAY}
            />
        </Stack>
    ),
}

/** Bounds: a moment before `min` is kept and said at once, its mark offering the bound. */
export const Bounds: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <DateTimeField
                id="bounds-next"
                label="Next run"
                description="No earlier than the end of the current run."
                zone="UTC"
                min="2026-11-09T18:00"
                defaultValue="2026-11-09T09:00"
                today={TODAY}
            />
        </Stack>
    ),
}

/** The calendar and the times open, the times before the bound shut on its day. */
export const Open: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm pb-80">
            <DateTimeField
                id="open-next"
                label="Next run"
                zone="UTC"
                min="2026-11-09T18:00"
                defaultValue="2026-11-09T20:00"
                today={TODAY}
                defaultOpen
            />
        </Stack>
    ),
}
