import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PERIOD_TYPES, recentPeriods, type PeriodType } from '@winterop-com/sokkel-ui/lib/periods'
import { PeriodPicker } from '@winterop-com/sokkel-ui/PeriodPicker'

/**
 * The period a report is made for, as a records app's monthly or weekly form asks it: the recent
 * periods of the form's type, newest first, each with its id in the code face, and Other period
 * last for any id typed in. Every story counts back from November 8, 2026.
 */
const meta: Meta = { title: 'Patterns/Period picker', parameters: { frame: 'padded' } }
export default meta

const TODAY = '2026-11-08'

function Picker({ type, initial, description }: { type: PeriodType; initial: string | null; description?: string }) {
    const [value, setValue] = useState(initial)
    const [issue, setIssue] = useState<string | null>(null)
    return (
        <Field
            id={`period-${type}`}
            label="Reporting period"
            required
            hint={PERIOD_TYPES[type].label}
            description={description}
            help={issue === null ? `Chosen: ${value ?? 'none'}` : undefined}
        >
            <PeriodPicker id={`period-${type}`} type={type} value={value} onValueChange={setValue} onIssueChange={setIssue} today={TODAY} />
        </Field>
    )
}

/** Nothing chosen yet: the trigger asks for a period. */
export const Empty: StoryObj = {
    render: () => (
        <Stack className="max-w-md">
            <Picker type="weekly" initial={null} />
        </Stack>
    ),
}

/** A monthly report, opening on the last whole month. */
export const Monthly: StoryObj = {
    render: () => (
        <Stack className="max-w-md">
            <Picker type="monthly" initial="202610" description="The month the counts are for. The report is filed under it." />
        </Stack>
    ),
}

/** A period older than the list holds, opened on the typed field with its id. */
export const OtherPeriod: StoryObj = {
    name: 'Other period',
    render: () => (
        <Stack className="max-w-md">
            <Picker type="monthly" initial="202403" />
        </Stack>
    ),
}

/** A typed id of another type, refused with the issue mark, saying what a month looks like, until it names one. */
export const Refused: StoryObj = {
    render: () => (
        <Stack className="max-w-md">
            <Picker type="monthly" initial="2026Q4" />
        </Stack>
    ),
}

/** Every type it lists, each on its newest period: days, ISO weeks, months, two months, quarters, half years and years. */
export const EveryType: StoryObj = {
    name: 'Every type',
    render: () => (
        <Columns count={3} min="lg" gap="lg">
            {(Object.keys(PERIOD_TYPES) as PeriodType[]).map((type) => (
                <Picker key={type} type={type} initial={recentPeriods(type, TODAY, 1)[0]?.id ?? null} />
            ))}
        </Columns>
    ),
}
