import type { Meta, StoryObj } from '@storybook/react-vite'

import { BarList, type BarListItem } from '@winterop-com/sokkel-ui/BarList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@winterop-com/sokkel-ui/primitives/card'

/**
 * Labeled bars, each a share from 0 to 1, the chosen one in the accent and the rest quiet, with
 * the value written beside each bar as a percent unless a format says otherwise.
 */
const meta: Meta = { title: 'Patterns/Bar list', parameters: { frame: 'padded' } }
export default meta

const STATES: BarListItem[] = [
    { label: 'succeeded', value: 0.81, chosen: true },
    { label: 'failed', value: 0.14 },
    { label: 'cancelled', value: 0.05 },
]

/** Three bars, the likeliest chosen. */
export const Short: StoryObj = {
    render: () => <BarList label="How the next run will end" items={STATES} className="max-w-sm" />,
}

const STEPS: BarListItem[] = [
    { label: 'upload', value: 0.62, chosen: true },
    { label: 'validate', value: 0.21 },
    { label: 'transform', value: 0.09 },
    { label: 'fetch', value: 0.05 },
    { label: 'notify', value: 0.024 },
    { label: 'scheduler', value: 0.004 },
    { label: 'a worker lost before it reported any step at all', value: 0.002 },
    { label: 'unknown', value: 0 },
]

/** Where a failure most likely came from, in a card: eight classes, a share too small to round written as under 1%, and a long label cut short. */
export const Probabilities: StoryObj = {
    render: () => (
        <Card className="max-w-sm">
            <CardHeader>
                <CardTitle>Likely cause</CardTitle>
                <CardDescription>nightly-export, run_8f3a02</CardDescription>
            </CardHeader>
            <CardContent>
                <BarList label="Likely cause" items={STEPS} />
            </CardContent>
        </Card>
    ),
}

/** The same bars with the values written as shares to two places. */
export const Format: StoryObj = {
    render: () => <BarList label="Likely cause" items={STEPS.slice(0, 5)} format={(value) => value.toFixed(2)} className="max-w-sm" />,
}

const LANGUAGES = [
    { language: 'en', name: 'English', translated: 2866 },
    { language: 'fr', name: 'French', translated: 2611 },
    { language: 'es', name: 'Spanish', translated: 1740 },
    { language: 'pt', name: 'Portuguese', translated: 902 },
    { language: 'sw', name: 'Swahili', translated: 118 },
]
const STRINGS = 2866

/** Each bar with its own note after the share: the counts the share was taken from. */
export const Counts: StoryObj = {
    render: () => (
        <BarList
            label="Strings translated, by language"
            items={LANGUAGES.map((language) => ({
                id: language.language,
                label: `${language.name} (${language.language})`,
                value: language.translated / STRINGS,
                note: `${language.translated.toLocaleString('en-US')} of ${STRINGS.toLocaleString('en-US')} strings`,
            }))}
            className="max-w-xl"
        />
    ),
}
