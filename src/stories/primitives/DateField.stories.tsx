import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DateField } from '@winterop-com/sokkel-ui/DateField'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * A date typed in one format, with a calendar beside it. The value is always `YYYY-MM-DD`; what is
 * typed is read by the field's format, and text that is not a date is said with the issue mark
 * once the field is left. The calendar loads the first time the field is pointed at or focused.
 */
const meta: Meta = { title: 'Primitives/Inputs/Date field', parameters: { frame: 'column' } }
export default meta

/** The day these stories call today. */
const TODAY = '2026-11-09'

/** A date with a value, an empty optional one with its format as the placeholder, a required one and one read only. */
export const Plain: StoryObj = {
    render: function Render() {
        const [start, setStart] = useState<string | null>('2026-11-12')
        return (
            <Stack gap="lg" className="max-w-sm">
                <DateField id="plain-start" label="First run" value={start} onValueChange={setStart} today={TODAY} />
                <DateField id="plain-until" label="Pause until" help="Runs are skipped until this day." today={TODAY} />
                <DateField id="plain-since" label="Backfill from" required defaultValue="2026-10-01" today={TODAY} />
                <DateField id="plain-created" label="Created" readOnly defaultValue="2026-03-17" />
            </Stack>
        )
    },
}

/** The same day written in three formats; each reads what it writes, and a pasted ISO date in any of them. */
export const Formats: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <DateField id="formats-iso" label="ISO" hint="YYYY-MM-DD" defaultValue="2026-11-09" today={TODAY} />
            <DateField id="formats-dots" label="Day first" hint="DD.MM.YYYY" format="DD.MM.YYYY" defaultValue="2026-11-09" today={TODAY} />
            <DateField id="formats-us" label="Month first" hint="MM/DD/YYYY" format="MM/DD/YYYY" defaultValue="2026-11-09" today={TODAY} />
        </Stack>
    ),
}

/**
 * Bounds: a date before `min` is kept and said at once, its mark offering the bound; within the
 * bounds nothing is said.
 */
export const Bounds: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <DateField
                id="bounds-start"
                label="First run"
                description="From today, up to a month ahead."
                min={TODAY}
                max="2026-12-09"
                defaultValue="2026-11-02"
                today={TODAY}
            />
            <DateField id="bounds-ok" label="Last run" min={TODAY} max="2026-12-09" defaultValue="2026-11-30" today={TODAY} />
        </Stack>
    ),
}

/** The calendar open on the chosen day, the days outside the bounds shut. */
export const Open: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm pb-80">
            <DateField id="open-start" label="First run" min={TODAY} max="2026-12-09" defaultValue="2026-11-12" today={TODAY} defaultOpen />
        </Stack>
    ),
}
