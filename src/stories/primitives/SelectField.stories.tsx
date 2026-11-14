import type { Meta, StoryObj } from '@storybook/react-vite'
import { Clock, Cog, Globe } from 'lucide-react'
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

/**
 * Options with an icon before the label, in the list and in the select, and options with a quiet
 * fact at the end of their row: here the value the job would inherit from its project.
 */
export const Icons: StoryObj = {
    name: 'Icons and details',
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <SelectField
                id="icons-service"
                label="Runs on"
                options={[
                    { value: 'api', label: 'API', icon: <Globe /> },
                    { value: 'worker', label: 'Worker', icon: <Cog /> },
                    { value: 'scheduler', label: 'Scheduler', icon: <Clock /> },
                ]}
                defaultValue="worker"
            />
            <SelectField
                id="icons-concurrency"
                label="Concurrency"
                help="How many runs of rebuild-index go at once."
                options={[
                    { value: '1', label: 'One at a time' },
                    { value: '2', label: 'Two' },
                    { value: '4', label: 'Four', detail: "harbor's default" },
                    { value: '8', label: 'Eight' },
                ]}
                defaultValue="4"
            />
        </Stack>
    ),
}

/**
 * Options led by a theme's swatch (`swatch`), drawn in that theme as the theme picker draws it, 8
 * before the label in the list and in the select; the option with no theme of its own, here the
 * workspace's, leads with an empty dashed box so the labels line up.
 */
export const Swatches: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <SelectField
                id="swatch-theme"
                label="Theme for harbor"
                options={[
                    { value: 'workspace', label: 'As the workspace' },
                    { value: 'tidevann', label: 'Tidevann', swatch: 'tidevann' },
                    { value: 'paper', label: 'Paper', swatch: 'paper' },
                    { value: 'contrast', label: 'Contrast', swatch: 'contrast' },
                    { value: 'steel', label: 'Steel', swatch: 'steel' },
                ]}
                defaultValue="paper"
            />
        </Stack>
    ),
}

const ROLES = [
    { value: 'viewer', label: 'Viewer', detail: 'Reads runs and their logs.' },
    { value: 'operator', label: 'Operator', detail: 'Starts, retries and cancels runs.' },
    { value: 'editor', label: 'Editor', detail: 'Changes jobs, their steps and schedules.' },
    { value: 'owner', label: 'Owner', detail: 'Everything, and who else may do it.' },
]

/**
 * Each option's detail on a second line under its label (`detailPlacement="below"`), for choices
 * that need a sentence each, and the chosen option's detail in the closed select (`chosenDetail`).
 */
export const TwoLines: StoryObj = {
    name: 'Two-line options',
    render: function Render() {
        const [role, setRole] = useState('operator')
        return (
            <Stack gap="lg" className="max-w-md">
                <SelectField
                    id="lines-role"
                    label="Role in harbor"
                    options={ROLES}
                    value={role}
                    onChange={setRole}
                    detailPlacement="below"
                    chosenDetail
                />
                <SelectField
                    id="lines-concurrency"
                    label="Concurrency"
                    options={[
                        { value: '1', label: 'One at a time' },
                        { value: '4', label: 'Four', detail: "harbor's default" },
                        { value: '8', label: 'Eight' },
                    ]}
                    defaultValue="4"
                    chosenDetail
                />
            </Stack>
        )
    },
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
