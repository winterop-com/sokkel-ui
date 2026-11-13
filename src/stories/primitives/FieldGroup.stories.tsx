import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DateTimeField } from '@winterop-com/sokkel-ui/DateTimeField'
import { FieldGroup } from '@winterop-com/sokkel-ui/FieldGroup'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'

/**
 * A named set of fields that belong together: the name over them as a field's label, a hint beside
 * it, a sentence under it, and controls at the end of its row.
 */
const meta: Meta = { title: 'Primitives/Inputs/Field group', parameters: { frame: 'column' } }
export default meta

/** The day these stories call today. */
const TODAY = '2026-11-09'

/** A window's start and end under one name, the zone they are read in beside it in the code face. */
export const Window: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-2xl">
            <FieldGroup label="Window" hint="Europe/Oslo" keyHint description="The nightly-export runs only between these times.">
                <Columns fields>
                    <DateTimeField id="window-start" label="Start" required defaultValue="2026-11-10T01:00" today={TODAY} />
                    <DateTimeField id="window-end" label="End" defaultValue="2026-11-10T05:00" today={TODAY} />
                </Columns>
            </FieldGroup>
        </Stack>
    ),
}

const RETRY = { attempts: 3, backoff: 'exponential', notify: 'grace' }

/** A Segmented beside the name switches the group between its fields and the same settings as JSON. */
export const Actions: StoryObj = {
    name: 'With actions',
    render: function Render() {
        const [mode, setMode] = useState<'form' | 'json'>('form')
        return (
            <Stack gap="lg" className="max-w-2xl">
                <FieldGroup
                    label="Retries"
                    description="What sync-inventory does when a step fails."
                    actions={
                        <Segmented
                            label="Edit as"
                            value={mode}
                            onValueChange={setMode}
                            options={[
                                { value: 'form', label: 'Form' },
                                { value: 'json', label: 'JSON' },
                            ]}
                        />
                    }
                >
                    {mode === 'form' ? (
                        <Columns fields>
                            <NumberField id="retries-attempts" label="Attempts" integer min={0} max={10} defaultValue={RETRY.attempts} />
                            <SelectField
                                id="retries-backoff"
                                label="Backoff"
                                options={[
                                    { value: 'fixed', label: 'Fixed' },
                                    { value: 'linear', label: 'Linear' },
                                    { value: 'exponential', label: 'Exponential' },
                                ]}
                                defaultValue={RETRY.backoff}
                            />
                            <SelectField
                                id="retries-notify"
                                label="Notify"
                                options={[
                                    { value: 'ada', label: 'ada' },
                                    { value: 'grace', label: 'grace' },
                                    { value: 'linus', label: 'linus' },
                                    { value: 'margaret', label: 'margaret' },
                                ]}
                                defaultValue={RETRY.notify}
                            />
                        </Columns>
                    ) : (
                        <TextField
                            id="retries-json"
                            label="Settings"
                            mono
                            multiline
                            rows={5}
                            defaultValue={JSON.stringify(RETRY, null, 4)}
                        />
                    )}
                </FieldGroup>
            </Stack>
        )
    },
}
