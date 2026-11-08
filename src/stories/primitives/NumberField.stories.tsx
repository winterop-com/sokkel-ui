import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { localeNumber } from '@winterop-com/sokkel-ui/lib/numbers'

/**
 * A number typed in, with its unit beside it. The up and down arrows step it, ten steps with
 * Shift; text that is not a number, and a number outside the bounds, are said with the issue mark
 * once the field is left.
 */
const meta: Meta = { title: 'Primitives/Inputs/Number field', parameters: { frame: 'column' } }
export default meta

const NORWEGIAN = localeNumber('nb-NO')
const GERMAN = localeNumber('de-DE')

/** A number with a value, and an empty one with a placeholder. */
export const Plain: StoryObj = {
    render: function Render() {
        const [retries, setRetries] = useState<number | null>(3)
        return (
            <Stack gap="lg" className="max-w-sm">
                <NumberField id="plain-retries" label="Retries" integer min={0} value={retries} onValueChange={setRetries} />
                <NumberField id="plain-weight" label="Weight" placeholder="1.0" help="How much of the queue this job may take." />
            </Stack>
        )
    },
}

/** Units after the number and a currency before it. */
export const Units: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <NumberField id="units-delay" label="Retry delay" suffix="ms" integer min={0} step={100} defaultValue={1500} />
            <NumberField id="units-share" label="Sample" suffix="%" min={0} max={100} defaultValue={12.5} />
            <NumberField id="units-budget" label="Monthly budget" prefix="$" min={0} defaultValue={250} />
        </Stack>
    ),
}

/** Buttons that step the value, by 30 here, and stop at the bounds. */
export const Stepper: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <NumberField id="stepper-timeout" label="Timeout" suffix="s" integer min={30} max={3600} step={30} stepper defaultValue={900} />
            <NumberField id="stepper-retries" label="Retries" integer min={0} max={10} stepper defaultValue={0} />
        </Stack>
    ),
}

/** Bounds: a number over `max` is kept and said at once, its mark offering the bound. */
export const Bounds: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <NumberField
                id="bounds-timeout"
                label="Timeout"
                suffix="s"
                description="At most an hour."
                integer
                min={1}
                max={3600}
                defaultValue={7200}
            />
        </Stack>
    ),
}

/** A locale's decimal mark and digit groups, written and read by `localeNumber`. */
export const Locale: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <NumberField
                id="locale-nb"
                label="Budget"
                hint="nb-NO"
                suffix="kr"
                format={NORWEGIAN.format}
                parse={NORWEGIAN.parse}
                defaultValue={12500.5}
            />
            <NumberField
                id="locale-de"
                label="Rows per batch"
                hint="de-DE"
                format={GERMAN.format}
                parse={GERMAN.parse}
                defaultValue={250000}
            />
        </Stack>
    ),
}
