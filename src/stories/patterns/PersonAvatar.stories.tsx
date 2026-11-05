import type { Meta, StoryObj } from '@storybook/react-vite'

import { PersonAvatar } from '../../components/PersonAvatar'

/** A person as their initials on a wash of the color their name picks. */
const meta: Meta = { title: 'Patterns/Person avatar' }
export default meta

const PEOPLE = ['ada', 'grace', 'linus', 'margaret', 'Ada Lovelace', 'Grace Hopper']

/** The three sizes, each person in the color their name picks, and one with a color given. */
export const Sizes: StoryObj = {
    name: 'Sizes',
    render: () => (
        <div className="flex flex-col gap-4 p-6">
            {(['xs', 'sm', 'md'] as const).map((size) => (
                <div key={size} className="flex items-center gap-2">
                    {PEOPLE.map((name) => (
                        <PersonAvatar key={name} name={name} size={size} />
                    ))}
                    <PersonAvatar name="scheduler" initials="S" color="teal" size={size} />
                </div>
            ))}
        </div>
    ),
}
