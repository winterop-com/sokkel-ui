import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { AddressInput, type Address } from '../../components/AddressInput'
import { InlineField } from '../../components/InlineField'
import { Stack } from '../../components/Layout'
import { Input } from '../../components/ui/input'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'

const meta: Meta = { title: 'Primitives/Inputs/Inline field', parameters: { frame: 'column' } }
export default meta

/** A subject under the recipients of a message being written, each row divided by a rule. */
export const Compose: StoryObj = {
    render: function Render() {
        const [to, setTo] = useState<Address[]>([{ address: 'grace@example.org', name: 'Grace' }])
        const [subject, setSubject] = useState('nightly-export failed at validate')
        return (
            <Stack gap="none" className="max-w-lg">
                <AddressInput label="To" bare value={to} onChange={setTo} className="border-b border-border" />
                <InlineField id="compose-subject" label="Subject" className="border-b border-border">
                    <Input bare id="compose-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
                </InlineField>
            </Stack>
        )
    },
}

/** Small, beside a select, as in a section's head. */
export const Small: StoryObj = {
    render: function Render() {
        const [project, setProject] = useState('harbor')
        return (
            <InlineField id="small-project" label="Project" size="sm">
                <NativeSelect id="small-project" size="sm" value={project} onChange={(event) => setProject(event.target.value)}>
                    <NativeSelectOption value="harbor">harbor</NativeSelectOption>
                    <NativeSelectOption value="juniper">juniper</NativeSelectOption>
                    <NativeSelectOption value="larkspur">larkspur</NativeSelectOption>
                </NativeSelect>
            </InlineField>
        )
    },
}
