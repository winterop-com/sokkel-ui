import type { Meta, StoryObj } from '@storybook/react-vite'

import { PersonAvatar, type Presence } from '../../components/PersonAvatar'
import { Row, Stack } from '../../components/Layout'

/** A person as their initials on a wash of the color their name picks, round or a rounded square, with a dot for whether they are around. */
const meta: Meta = { title: 'Patterns/Person avatar' }
export default meta

const PEOPLE = ['ada', 'grace', 'linus', 'margaret', 'Ada Lovelace', 'Grace Hopper']

const SIZES = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const

const PRESENCE: { name: string; presence: Presence }[] = [
    { name: 'ada', presence: 'active' },
    { name: 'grace', presence: 'away' },
    { name: 'linus', presence: 'offline' },
    { name: 'Margaret Hamilton', presence: 'active' },
]

/** The six sizes, each person in the color their name picks, and one with a color given. The two smallest show one initial, since two do not fit. */
export const Sizes: StoryObj = {
    render: () => (
        <Stack gap="lg" className="p-6">
            {SIZES.map((size) => (
                <Row key={size} wrap>
                    {PEOPLE.map((name) => (
                        <PersonAvatar key={name} name={name} size={size} />
                    ))}
                    <PersonAvatar name="scheduler" initials="S" color="teal" size={size} />
                </Row>
            ))}
        </Stack>
    ),
}

/** Whether each person is around at every size: a filled dot while active, a hollow ring while away or offline, sat outside the letters and ringed in the ground. */
export const Presences: StoryObj = {
    name: 'Presence',
    render: () => (
        <Stack gap="lg" className="p-6">
            {SIZES.map((size) => (
                <Row key={size} gap="md">
                    {PRESENCE.map((person) => (
                        <PersonAvatar key={person.name} name={person.name} size={size} presence={person.presence} />
                    ))}
                </Row>
            ))}
        </Stack>
    ),
}

/** The rounded square a message list's authors wear, at every size, the largest also with the dot. */
export const Square: StoryObj = {
    render: () => (
        <Stack gap="lg" className="p-6">
            <Row>
                {SIZES.map((size) => (
                    <PersonAvatar key={size} name="Grace Hopper" size={size} shape="square" />
                ))}
            </Row>
            <Row gap="md">
                {PRESENCE.map((person) => (
                    <PersonAvatar key={person.name} name={person.name} size="lg" shape="square" presence={person.presence} />
                ))}
            </Row>
        </Stack>
    ),
}
