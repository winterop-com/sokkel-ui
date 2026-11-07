import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stack } from '../../components/Layout'
import { PersonRow } from '../../components/PersonRow'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'

const meta: Meta = { title: 'Patterns/Person row', parameters: { frame: 'column' } }
export default meta

/** A person by their username and email, with their role at the end. */
export const People: StoryObj = {
    render: () => (
        <Stack gap="md" className="max-w-md">
            <PersonRow name="ada" note="(you)" detail="ada@example.org" aside="Owner" />
            <PersonRow name="grace" detail="grace@example.org" aside="Admin" />
            <PersonRow name="margaret" detail="margaret@example.org" />
        </Stack>
    ),
}

/** The end holding a control, as a share dialog changes each person's access. */
export const WithControl: StoryObj = {
    name: 'With control',
    render: () => (
        <Stack gap="md" className="max-w-md">
            {(['grace', 'linus'] as const).map((name) => (
                <PersonRow
                    key={name}
                    name={name}
                    detail={`${name}@example.org`}
                    aside={
                        <NativeSelect size="sm" aria-label={`Access for ${name}`} defaultValue="view" className="w-32">
                            <NativeSelectOption value="edit">Can edit</NativeSelectOption>
                            <NativeSelectOption value="view">Can view</NativeSelectOption>
                        </NativeSelect>
                    }
                />
            ))}
        </Stack>
    ),
}
