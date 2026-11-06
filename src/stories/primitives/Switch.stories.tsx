import type { Meta, StoryObj } from '@storybook/react-vite'

import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '../../components/ui/field'
import { Switch } from '../../components/ui/switch'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Inputs/Switch', parameters: { frame: 'column' } }
export default meta

/** Every prop of a switch, to try live. */
export const Playground: StoryObj<{ checked: boolean; size: 'sm' | 'default'; disabled: boolean }> = {
    parameters: { frame: 'padded', controls: { disable: false } },
    args: { checked: true, size: 'default', disabled: false },
    argTypes: { size: { control: 'inline-radio', options: ['sm', 'default'] } },
    render: (args) => <Switch aria-label="Weekly digest" checked={args.checked} size={args.size} disabled={args.disabled} />,
}

export const Variants: StoryObj = {
    render: () => (
        <Row gap="2xl" align="end" wrap>
            <Specimen label="default off">
                <Switch aria-label="Paused" />
            </Specimen>
            <Specimen label="default on">
                <Switch aria-label="Paused" defaultChecked />
            </Specimen>
            <Specimen label="sm off">
                <Switch aria-label="Paused" size="sm" />
            </Specimen>
            <Specimen label="sm on">
                <Switch aria-label="Paused" size="sm" defaultChecked />
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="2xl" align="end" wrap>
            <Specimen label="disabled off">
                <Switch aria-label="Paused" disabled />
            </Specimen>
            <Specimen label="disabled on">
                <Switch aria-label="Paused" disabled defaultChecked />
            </Specimen>
            <Specimen label="invalid">
                <Switch aria-label="Paused" aria-invalid />
            </Specimen>
            <Specimen label="read only on">
                <Switch aria-label="Paused" readOnly defaultChecked />
            </Specimen>
        </Row>
    ),
}

const SCHEDULES = [
    { code: 'nightly', detail: 'Cron 0 2 * * *, next at 2026-11-05 02:00', on: true },
    { code: 'on-upload', detail: 'Webhook, last called 2026-11-04 14:02', on: true },
    { code: 'backfill', detail: 'Cron 0 4 * * 0, last run 2026-10-25 04:00', on: false },
]

export const JobSchedules: StoryObj = {
    render: () => (
        <Stack className="max-w-lg">
            <p className="text-sm font-medium">Schedules and webhooks of sync-inventory</p>
            <FieldGroup className="gap-0 divide-y divide-border rounded-lg border border-border">
                {SCHEDULES.map((schedule) => (
                    <Field key={schedule.code} orientation="horizontal" className="px-3 py-3">
                        <FieldContent>
                            <FieldLabel htmlFor={`s-${schedule.code}`} className="font-mono">
                                {schedule.code}
                            </FieldLabel>
                            <FieldDescription>{schedule.detail}</FieldDescription>
                        </FieldContent>
                        <Switch id={`s-${schedule.code}`} defaultChecked={schedule.on} />
                    </Field>
                ))}
            </FieldGroup>
        </Stack>
    ),
}
