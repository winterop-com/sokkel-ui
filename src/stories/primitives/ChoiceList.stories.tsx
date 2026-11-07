import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ChoiceList } from '../../components/ChoiceList'
import { PersonRow } from '../../components/PersonRow'

const meta: Meta = { title: 'Primitives/Inputs/Choice list', parameters: { frame: 'column' } }
export default meta

const ON_FAILURE = [
    { value: 'stop', label: 'Stop the run', description: 'Later steps are skipped and the run ends failed.' },
    { value: 'continue', label: 'Continue', description: 'Later steps run; the run ends completed with errors.' },
    { value: 'retry', label: 'Retry the step', description: 'Up to 3 times, 10s apart, then stop.' },
] as const

/** A few choices, each saying what it means; the chosen one is filled. */
export const Described: StoryObj = {
    render: function Render() {
        const [value, setValue] = useState<(typeof ON_FAILURE)[number]['value']>('retry')
        return <ChoiceList label="When a step fails" choices={ON_FAILURE} value={value} onValueChange={setValue} className="max-w-md" />
    },
}

const PEOPLE = [
    { username: 'grace', email: 'grace@example.org', role: 'admin' },
    { username: 'linus', email: 'linus@example.org', role: 'editor' },
    { username: 'margaret', email: 'margaret@example.org', role: 'operator' },
] as const

/** Choosing a person: each choice is a person row. */
export const People: StoryObj = {
    render: function Render() {
        const [to, setTo] = useState<(typeof PEOPLE)[number]['username']>('grace')
        return (
            <ChoiceList
                label="New owner"
                value={to}
                onValueChange={setTo}
                className="max-w-md"
                choices={PEOPLE.map((person) => ({
                    value: person.username,
                    label: <PersonRow name={person.username} detail={person.email} aside={person.role} />,
                }))}
            />
        )
    },
}
