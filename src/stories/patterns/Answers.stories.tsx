import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ComputedField } from '@winterop-com/sokkel-ui/ComputedField'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { YesNoField } from '@winterop-com/sokkel-ui/YesNoField'

/**
 * Answers a records form draws besides typed ones: an answer the form works out itself, read only
 * with why it is what it is, and a yes or no question that may be left unanswered, with Clear to
 * take an answer back.
 */
const meta: Meta = { title: 'Patterns/Answers', parameters: { frame: 'padded' } }
export default meta

const WHY = 'The bank height at this site less the water level read off the gauge.'

/** A worked-out answer: the value read only, and under it the rule that works it out. */
export const Computed: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <ComputedField
                id="clearance"
                label="Clearance below the bank"
                value="2.18"
                unit="m"
                why={WHY}
                formula="bank_height - water_level"
                numeric
            />
        </Stack>
    ),
}

/** Not yet worked out: the answers it reads are not given, and its place says so. */
export const ComputedPending: StoryObj = {
    name: 'Computed, pending',
    render: () => (
        <Stack className="max-w-sm">
            <ComputedField
                id="clearance-pending"
                label="Clearance below the bank"
                value={null}
                unit="m"
                why={WHY}
                formula="bank_height - water_level"
            />
        </Stack>
    ),
}

function YesNo({ initial, required = false, yesOnly = false }: { initial: boolean | null; required?: boolean; yesOnly?: boolean }) {
    const [value, setValue] = useState(initial)
    return (
        <Stack className="max-w-sm">
            <YesNoField
                id={`cleaned-${String(initial)}-${String(required)}-${String(yesOnly)}`}
                label="Gauge board cleaned"
                description="Before the reading was taken."
                value={value}
                onValueChange={setValue}
                required={required}
                yesOnly={yesOnly}
                help={yesOnly ? 'Yes or not answered: this question keeps no No.' : undefined}
            />
        </Stack>
    )
}

/** An optional question left unanswered: neither Yes nor No chosen, and it says so. */
export const Unanswered: StoryObj = { render: () => <YesNo initial={null} /> }

/** Answered: Clear beside the choice takes the answer back to unanswered. */
export const Answered: StoryObj = { render: () => <YesNo initial={false} /> }

/** A required question, which has no Clear once answered. */
export const Required: StoryObj = { render: () => <YesNo initial required /> }

/** Yes alone, for a question that keeps no No: unanswered stands for it. */
export const YesOnly: StoryObj = { name: 'Yes only', render: () => <YesNo initial={null} yesOnly /> }

function Reading() {
    const [level, setLevel] = useState('1.42')
    const [cleaned, setCleaned] = useState<boolean | null>(null)
    const read = Number.parseFloat(level)
    const clearance = Number.isFinite(read) ? (3.6 - read).toFixed(2) : null
    return (
        <Section title="Measurements" description="Read at the gauge, in the units beside each label." className="max-w-4xl">
            <Columns count={3} min="sm" gap="lg" fields>
                <TextField
                    id="reading-level"
                    label="Water level"
                    hint="m"
                    required
                    description="Read off the gauge board before the sample is taken."
                    value={level}
                    onChange={setLevel}
                    inputMode="decimal"
                    numeric
                />
                <ComputedField
                    id="reading-clearance"
                    label="Clearance below the bank"
                    value={clearance}
                    unit="m"
                    why="The bank height at this site, 3.60 m, less the water level."
                    formula="3.60 - water_level"
                    numeric
                />
                <YesNoField id="reading-cleaned" label="Gauge board cleaned" value={cleaned} onValueChange={setCleaned} />
            </Columns>
        </Section>
    )
}

/** In a form: the clearance worked out as the level is typed, beside an optional yes or no, the three controls lined up. */
export const InAForm: StoryObj = { name: 'In a form', render: () => <Reading /> }
