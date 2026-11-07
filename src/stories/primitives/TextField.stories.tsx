import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TextField } from '@winterop-com/sokkel-ui/TextField'

const meta: Meta = { title: 'Primitives/Inputs/Text field', parameters: { frame: 'column' } }
export default meta

/** A label over its input: one with a value, one with a placeholder, and one read only. */
export const Plain: StoryObj = {
    render: function Render() {
        const [name, setName] = useState('Nightly export')
        return (
            <Stack gap="lg" className="max-w-md">
                <TextField id="plain-name" label="Name" value={name} onChange={setName} />
                <TextField id="plain-owner" label="Owner" placeholder="ada" />
                <TextField id="plain-id" label="Job id" mono readOnly defaultValue="nightly-export" />
            </Stack>
        )
    },
}

/** A hint beside the label, a key in the code face, and a help line under the input. */
export const Help: StoryObj = {
    name: 'With help',
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <TextField
                id="help-timeout"
                label="Timeout"
                hint="minutes"
                help="A run still going after this long is cancelled."
                inputMode="numeric"
                defaultValue="30"
                numeric
            />
            <TextField
                id="help-url"
                label="Base URL"
                hint="base_url"
                keyHint
                help="Where the upload step sends its files, without /v1."
                mono
                defaultValue="https://api.example.org"
            />
            <TextField id="help-schedule" label="Schedule" hint="cron" required mono defaultValue="0 2 * * *" />
        </Stack>
    ),
}

/** A refused value marked at the input's end, and a warning beside a value that is allowed. */
export const WithError: StoryObj = {
    name: 'Error',
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <TextField id="error-code" label="Code" error="Use lowercase letters, digits and dashes." defaultValue="Nightly Export" mono />
            <TextField
                id="error-retries"
                label="Retries"
                hint="per step"
                issues={[{ tone: 'warning', text: 'More than 5 retries can hold a failed run for an hour.' }]}
                inputMode="numeric"
                defaultValue="8"
                numeric
            />
        </Stack>
    ),
}

/** A text area for a few lines of prose, with its help line. */
export const Multiline: StoryObj = {
    render: () => (
        <TextField
            id="multiline-description"
            label="Description"
            help="Shown on the job's page and in the run list."
            multiline
            rows={4}
            className="max-w-lg"
            defaultValue="Fetches the day's orders, validates each row, and uploads the rows that pass. Grace is told when a run fails."
        />
    ),
}
