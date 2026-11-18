import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PromptDialog } from '@winterop-com/sokkel-ui/PromptDialog'
import { Behind, wait } from '../dialogs/parts'

/**
 * A dialog that asks for one value, open over a job's page in the harbor project: a name for a new
 * project, or a token for the api service. Enter in the field submits; each story's button opens it
 * again once it is closed.
 */
const meta: Meta = { title: 'Patterns/Prompt dialog' }
export default meta

const PROJECTS = ['harbor', 'juniper', 'larkspur']

/** Why a project name is refused: the shape a code takes, and the names already taken. */
function projectIssue(name: string): string | null {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) return 'Use lowercase letters, digits and dashes, starting with a letter.'
    if (PROJECTS.includes(name)) return `${name} is taken.`
    return null
}

/** A name for a new project: Submit is shut while the field is empty, and Enter creates. */
export const Open: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState(true)
        return (
            <Behind action="New project" onAction={() => setOpen(true)}>
                <PromptDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="New project"
                    description="Jobs, runs and schedules live in a project."
                    label="Name"
                    placeholder="tidewater-reports"
                    mono
                    onSubmit={() => undefined}
                    words={{ submit: 'Create' }}
                />
            </Behind>
        )
    },
}

/** `secret`: a token for the api service in the library's `SecretField`, masked, with Show. */
export const Secret: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState(true)
        return (
            <Behind action="Set token" onAction={() => setOpen(true)}>
                <PromptDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="API token for api"
                    description="The scheduler signs its calls to the api service with it."
                    label="API token"
                    help="Make one under api › Settings › Tokens."
                    secret
                    onSubmit={() => wait(800)}
                    words={{ submit: 'Save', submitting: 'Saving' }}
                />
            </Behind>
        )
    },
}

/** `validate`: the name is refused with its issue under the field, and Submit is shut with it as the reason. */
export const Validation: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState(true)
        return (
            <Behind action="New project" onAction={() => setOpen(true)}>
                <PromptDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="New project"
                    description="Jobs, runs and schedules live in a project."
                    label="Name"
                    hint="a-z, 0-9 and -"
                    defaultValue="Harbor Reports"
                    mono
                    validate={projectIssue}
                    onSubmit={() => undefined}
                    words={{ submit: 'Create' }}
                />
            </Behind>
        )
    },
}

/** The app's request for the value is running: Submit spins, the field is held, and Cancel waits. */
export const Busy: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState(true)
        return (
            <Behind action="New project" onAction={() => setOpen(true)}>
                <PromptDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="New project"
                    description="Jobs, runs and schedules live in a project."
                    label="Name"
                    defaultValue="tidewater-reports"
                    mono
                    busy
                    onSubmit={() => undefined}
                    words={{ submit: 'Create', submitting: 'Creating' }}
                />
            </Behind>
        )
    },
}

/**
 * The api service refused the token: the dialog stays open and says why above the verbs. Save
 * again fails the same way after a moment, a rejected `onSubmit` said by the dialog itself.
 */
export const Failed: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState(true)
        const [refused, setRefused] = useState(true)
        return (
            <Behind
                action="Set token"
                onAction={() => {
                    setRefused(false)
                    setOpen(true)
                }}
            >
                <PromptDialog
                    open={open}
                    onOpenChange={setOpen}
                    title="API token for api"
                    description="The scheduler signs its calls to the api service with it."
                    label="API token"
                    help="Make one under api › Settings › Tokens."
                    secret
                    defaultValue="tdv_live_9f3c2a71e4"
                    error={refused ? 'The api service refused the token: it expired on 2026-11-01.' : undefined}
                    onSubmit={async () => {
                        setRefused(false)
                        await wait(800)
                        throw new Error('The api service refused the token: it expired on 2026-11-01.')
                    }}
                    words={{ submit: 'Save', submitting: 'Saving' }}
                />
            </Behind>
        )
    },
}
