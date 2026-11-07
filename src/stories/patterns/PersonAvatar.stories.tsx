import type { Meta, StoryObj } from '@storybook/react-vite'

import { PersonAvatar, type Presence } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PORTRAITS } from '../fixtures/portraits'

/** A person as their picture or their initials on a wash of the color their name picks, round or a rounded square, with a dot for whether they are around. */
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

/** Tidevann's people with their portraits, each with whether they are around. */
const PICTURED: { name: string; presence: Presence }[] = [
    { name: 'ada', presence: 'active' },
    { name: 'grace', presence: 'away' },
    { name: 'linus', presence: 'offline' },
    { name: 'margaret', presence: 'active' },
]

/** Pictures that fail without leaving the page: a data URI that does not decode, and an empty address. */
const BROKEN = ['data:image/png;base64,broken', '']

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

/**
 * Each person's picture at every size, round and then square with the dot for whether they are
 * around. The picture fills the badge the initials would, so a list keeps its rhythm whether a
 * person has one or not.
 */
export const Pictures: StoryObj = {
    render: () => (
        <Stack gap="lg" className="p-6">
            {SIZES.map((size) => (
                <Row key={size} gap="lg" wrap>
                    <Row gap="md">
                        {PICTURED.map((person) => (
                            <PersonAvatar key={person.name} name={person.name} image={PORTRAITS[person.name]} size={size} />
                        ))}
                    </Row>
                    <Row gap="md">
                        {PICTURED.map((person) => (
                            <PersonAvatar
                                key={person.name}
                                name={person.name}
                                image={PORTRAITS[person.name]}
                                size={size}
                                shape="square"
                                presence={person.presence}
                            />
                        ))}
                    </Row>
                </Row>
            ))}
        </Stack>
    ),
}

/**
 * A picture that fails to load at every size, round and square, with and without the dot: each
 * keeps the initials on the person's color, never a broken image, as it does while a picture is
 * still loading. Beside each, the same person with a picture that loads.
 */
export const Fallback: StoryObj = {
    render: () => (
        <Stack gap="lg" className="p-6">
            {SIZES.map((size) => (
                <Row key={size} gap="lg" wrap>
                    <Row gap="md">
                        <PersonAvatar name="linus" image={BROKEN[0]} size={size} />
                        <PersonAvatar name="margaret" image={BROKEN[1]} size={size} />
                        <PersonAvatar name="linus" image={PORTRAITS.linus} size={size} />
                    </Row>
                    <Row gap="md">
                        <PersonAvatar name="linus" image={BROKEN[0]} size={size} shape="square" presence="away" />
                        <PersonAvatar name="margaret" image={BROKEN[1]} size={size} shape="square" presence="active" />
                        <PersonAvatar name="linus" image={PORTRAITS.linus} size={size} shape="square" presence="away" />
                    </Row>
                </Row>
            ))}
        </Stack>
    ),
}
