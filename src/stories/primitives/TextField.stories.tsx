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

/** Questions a long form explains: what each asks between its label and its input, and what a right answer looks like under it. */
export const Described: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <TextField
                id="described-level"
                label="Water level"
                hint="m"
                required
                description="Read off the gauge board at the station, before the sample is taken."
                help="Between 0 and 10."
                inputMode="decimal"
                defaultValue="1.42"
                numeric
            />
            <TextField
                id="described-visitor"
                label="Collected by"
                description="Whoever read the gauge, which may not be who files the record."
                defaultValue="grace"
            />
        </Stack>
    ),
}

/**
 * Required fields marked by the word after the label rather than a star in it, so a screen reader
 * names the input by its label alone and hears that it is required from the input itself.
 */
export const RequiredWord: StoryObj = {
    name: 'Required word',
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <TextField id="word-name" label="Name" required requiredMark="word" defaultValue="Sync inventory" />
            <TextField id="word-code" label="Code" required requiredMark="word" mono defaultValue="sync-inventory" />
            <TextField id="word-owner" label="Owner" requiredMark="word" placeholder="grace" />
        </Stack>
    ),
}

/** What applies when a field is left empty, said under the input after its help. */
export const Fallback: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <TextField
                id="fallback-timeout"
                label="Timeout"
                hint="minutes"
                help="A run still going after this long is cancelled."
                fallback="Default is 30 minutes"
                inputMode="numeric"
                numeric
            />
            <TextField id="fallback-service" label="Service" fallback="Default is api" mono />
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
