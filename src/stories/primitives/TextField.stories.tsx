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

/** A hint beside the label, a key in the code face, a label that is itself a key (`monoLabel`), and a help line under the input. */
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
            <TextField
                id="help-key"
                label="EXPORT_BUCKET"
                monoLabel
                mono
                help="Read by the upload step at start."
                defaultValue="harbor-exports"
            />
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
 * names the input by its label alone and hears that it is required from the input itself. The
 * word is the field's to translate: the last says it in Norwegian.
 */
export const RequiredWord: StoryObj = {
    name: 'Required word',
    render: () => (
        <Stack gap="lg" className="max-w-md">
            <TextField id="word-name" label="Name" required requiredMark="word" defaultValue="Sync inventory" />
            <TextField id="word-code" label="Code" required requiredMark="word" mono defaultValue="sync-inventory" />
            <TextField id="word-owner" label="Owner" requiredMark="word" placeholder="grace" />
            <TextField
                id="word-host"
                label="Vert"
                required
                requiredMark="word"
                mono
                defaultValue="api.example.org"
                words={{ required: 'påkrevd' }}
            />
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

/**
 * A refused value marked at the input's end, and a warning beside a value that is allowed. The mark
 * says "Error: " or "Warning: " before each message to a screen reader, words the field translates:
 * the last says them in Norwegian (`words.issueCritical`, `words.issueWarning`).
 */
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
            <TextField
                id="error-host"
                label="Vert"
                error="Bruk et vertsnavn, som api.example.org."
                defaultValue="api example"
                mono
                words={{ issueCritical: 'Feil: ', issueWarning: 'Advarsel: ' }}
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

/** A text area that grows with its text from two lines to six (`maxRows`), then scrolls. */
export const Growing: StoryObj = {
    render: function Render() {
        const [notes, setNotes] = useState(
            [
                'fetch: reads the orders from api.example.org since the last run that succeeded.',
                'transform: turns each order into the export row.',
                'validate: sets aside the rows that do not read.',
                'upload: writes the file to the bucket.',
                'notify: tells the owners of harbor.',
                'A failed step stops the run; the steps after it are skipped.',
                'Retries start again from the step that failed.',
                'Grace is told when a run fails twice in a row.',
            ].join('\n'),
        )
        return (
            <TextField
                id="growing-notes"
                label="Run notes"
                help="Grows to six lines, then scrolls."
                multiline
                rows={2}
                maxRows={6}
                value={notes}
                onChange={setNotes}
                className="max-w-lg"
            />
        )
    },
}
