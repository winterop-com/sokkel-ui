import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Checkbox } from '../../components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '../../components/ui/field'
import { Label } from '../../components/ui/label'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Inputs/Checkbox', parameters: { frame: 'column' } }
export default meta

/** Every prop of a checkbox, to try live. */
export const Playground: StoryObj<{ label: string; checked: boolean; indeterminate: boolean; disabled: boolean; invalid: boolean }> = {
    parameters: { frame: 'padded', controls: { disable: false } },
    args: { label: 'Email me when a job fails', checked: true, indeterminate: false, disabled: false, invalid: false },
    render: (args) => (
        <Row>
            <Checkbox
                id="playground"
                checked={args.checked}
                indeterminate={args.indeterminate}
                disabled={args.disabled}
                aria-invalid={args.invalid || undefined}
            />
            <Label htmlFor="playground">{args.label}</Label>
        </Row>
    ),
}

export const Variants: StoryObj = {
    render: () => (
        <Row gap="2xl" align="stretch" wrap>
            <Specimen label="unchecked">
                <Checkbox aria-label="Select run" />
            </Specimen>
            <Specimen label="checked">
                <Checkbox aria-label="Select run" defaultChecked />
            </Specimen>
            <Specimen label="indeterminate">
                <Checkbox aria-label="Select all runs" indeterminate />
            </Specimen>
            <Specimen label="with label">
                <Row>
                    <Checkbox id="cb-notify" defaultChecked />
                    <Label htmlFor="cb-notify">Notify on failure</Label>
                </Row>
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="2xl" align="stretch" wrap>
            <Specimen label="disabled">
                <Checkbox aria-label="Select run" disabled />
            </Specimen>
            <Specimen label="disabled checked">
                <Checkbox aria-label="Select run" disabled defaultChecked />
            </Specimen>
            <Specimen label="invalid">
                <Checkbox aria-label="Accept" aria-invalid />
            </Specimen>
            <Specimen label="invalid checked">
                <Checkbox aria-label="Accept" aria-invalid defaultChecked />
            </Specimen>
        </Row>
    ),
}

const EVENTS = [
    { id: 'failed', label: 'A run fails', detail: 'Any step ends failed and retries are spent.' },
    { id: 'recovered', label: 'A run recovers', detail: 'The first success after a failure.' },
    { id: 'slow', label: 'A run is slow', detail: 'It takes more than twice its median duration.' },
    { id: 'succeeded', label: 'Every success', detail: 'Noisy on a job that runs each minute.' },
]

function AlertEvents() {
    const [picked, setPicked] = useState<string[]>(['failed', 'recovered'])
    const all = picked.length === EVENTS.length
    const some = picked.length > 0 && !all
    return (
        <FieldSet className="max-w-md">
            <FieldLegend>Alert on import-orders when</FieldLegend>
            <Field orientation="horizontal">
                <Checkbox
                    id="ev-all"
                    checked={all}
                    indeterminate={some}
                    onCheckedChange={(checked) => setPicked(checked ? EVENTS.map((event) => event.id) : [])}
                />
                <FieldLabel htmlFor="ev-all">All events</FieldLabel>
            </Field>
            <Stack className="pl-6">
                {EVENTS.map((event) => (
                    <Field key={event.id} orientation="horizontal">
                        <Checkbox
                            id={`ev-${event.id}`}
                            checked={picked.includes(event.id)}
                            onCheckedChange={(checked) =>
                                setPicked((now) => (checked ? [...now, event.id] : now.filter((id) => id !== event.id)))
                            }
                        />
                        <FieldContent>
                            <FieldLabel htmlFor={`ev-${event.id}`}>{event.label}</FieldLabel>
                            <FieldDescription>{event.detail}</FieldDescription>
                        </FieldContent>
                    </Field>
                ))}
            </Stack>
        </FieldSet>
    )
}

export const AlertRules: StoryObj = { render: () => <AlertEvents /> }
