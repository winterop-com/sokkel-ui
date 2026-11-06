import type { Meta, StoryObj } from '@storybook/react-vite'

import { PersonAvatar, type Presence } from '../../components/PersonAvatar'

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
        <div className="flex flex-col gap-4 p-6">
            {SIZES.map((size) => (
                <div key={size} className="flex flex-wrap items-center gap-2">
                    {PEOPLE.map((name) => (
                        <PersonAvatar key={name} name={name} size={size} />
                    ))}
                    <PersonAvatar name="scheduler" initials="S" color="teal" size={size} />
                </div>
            ))}
        </div>
    ),
}

/** Whether each person is around at every size: a filled dot while active, a hollow ring while away or offline, sat outside the letters and ringed in the ground. */
export const Presences: StoryObj = {
    name: 'Presence',
    render: () => (
        <div className="flex flex-col gap-4 p-6">
            {SIZES.map((size) => (
                <div key={size} className="flex items-center gap-3">
                    {PRESENCE.map((person) => (
                        <PersonAvatar key={person.name} name={person.name} size={size} presence={person.presence} />
                    ))}
                </div>
            ))}
        </div>
    ),
}

/** The rounded square a message list's authors wear, at every size, the largest also with the dot. */
export const Square: StoryObj = {
    render: () => (
        <div className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-2">
                {SIZES.map((size) => (
                    <PersonAvatar key={size} name="Grace Hopper" size={size} shape="square" />
                ))}
            </div>
            <div className="flex items-center gap-3">
                {PRESENCE.map((person) => (
                    <PersonAvatar key={person.name} name={person.name} size="lg" shape="square" presence={person.presence} />
                ))}
            </div>
        </div>
    ),
}
