import type { Meta, StoryObj } from '@storybook/react-vite'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'

/**
 * A link inside text or among a record's facts: a place, a form, a household's identifier, a way
 * onward in a sentence. Plain values stay plain beside it; the link is in the primary ink and
 * underlined on hover.
 */
const meta: Meta = { title: 'Patterns/Text link', parameters: { frame: 'padded' } }
export default meta

/** In a sentence, as a help line's way onward. */
export const InText: StoryObj = {
    name: 'In text',
    render: () => (
        <p className="max-w-md text-help text-muted-foreground">
            No household is registered yet. <TextLink href="#">Register one first</TextLink>, then record its visits.
        </p>
    ),
}

/** Among a record's facts: the place and the form lead to their own pages, the id in the code face. */
export const InFacts: StoryObj = {
    name: 'In facts',
    render: () => (
        <Stack className="max-w-lg">
            <DescriptionList
                columns={2}
                layout="stacked"
                items={[
                    { term: 'Place', value: <TextLink href="#">Baomahun</TextLink> },
                    { term: 'Form', value: <TextLink href="#">Site visit</TextLink> },
                    {
                        term: 'Household',
                        value: (
                            <TextLink href="#" code>
                                H-1008-7109
                            </TextLink>
                        ),
                    },
                    { term: 'Filed by', value: 'grace' },
                ]}
            />
        </Stack>
    ),
}

/** A link that leaves the app, opened in a new tab. */
export const External: StoryObj = {
    render: () => (
        <p className="text-sm">
            The register keeps its own copy at{' '}
            <TextLink href="https://register.example.org" external>
                register.example.org
            </TextLink>
            .
        </p>
    ),
}
