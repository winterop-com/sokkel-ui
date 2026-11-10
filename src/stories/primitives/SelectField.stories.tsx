import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'

const meta: Meta = { title: 'Primitives/Inputs/Select field', parameters: { frame: 'column' } }
export default meta

const SERVICES = [
    { value: 'api', label: 'API' },
    { value: 'worker', label: 'Worker' },
    { value: 'scheduler', label: 'Scheduler' },
]

const PROJECTS = [
    { value: 'harbor', label: 'Harbor' },
    { value: 'juniper', label: 'Juniper' },
    { value: 'larkspur', label: 'Larkspur' },
]

const STEPS = [
    { value: 'fetch', label: 'fetch' },
    { value: 'transform', label: 'transform' },
    { value: 'validate', label: 'validate' },
    { value: 'upload', label: 'upload' },
    { value: 'notify', label: 'notify' },
]

/** A label over its select: one with a value, one with a placeholder, and one read only. */
export const Plain: StoryObj = {
    render: function Render() {
        const [service, setService] = useState('worker')
        const [project, setProject] = useState('')
        return (
            <Stack gap="lg" className="max-w-md">
                <SelectField id="plain-service" label="Service" options={SERVICES} value={service} onChange={setService} />
                <SelectField
                    id="plain-project"
                    label="Project"
                    options={PROJECTS}
                    value={project}
                    onChange={setProject}
                    placeholder="Choose a project"
                />
                <SelectField id="plain-step" label="First step" options={STEPS} mono readOnly defaultValue="fetch" />
            </Stack>
        )
    },
}

/** A hint beside the label, a key in the code face, a help line, and what applies when nothing is chosen. */
export const Help: StoryObj = {
    name: 'With help',
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <SelectField
                id="help-service"
                label="Runs on"
                hint="service"
                keyHint
                help="The service that picks up the job's runs."
                options={SERVICES}
                defaultValue="scheduler"
            />
            <SelectField
                id="help-project"
                label="Project"
                description="Runs are counted against the project's quota."
                fallback="Default is harbor"
                options={PROJECTS}
                placeholder="Choose a project"
            />
            <SelectField id="help-step" label="Retry from" required requiredMark="word" mono options={STEPS} defaultValue="validate" />
        </Stack>
    ),
}

/** Options that cannot be chosen, a refused value marked at the select's end, and a whole field turned off. */
export const States: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <SelectField
                id="states-service"
                label="Service"
                help="The scheduler is paused for maintenance."
                options={SERVICES.map((option) => ({ ...option, disabled: option.value === 'scheduler' }))}
                defaultValue="api"
            />
            <SelectField
                id="states-step"
                label="Retry from"
                error="A run cannot retry from notify; pick a step before it."
                mono
                options={STEPS}
                defaultValue="notify"
            />
            <SelectField id="states-project" label="Project" disabled options={PROJECTS} defaultValue="juniper" />
        </Stack>
    ),
}
