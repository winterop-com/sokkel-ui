import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '../../components/ui/field'
import { Switch } from '../../components/ui/switch'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/Switch' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-8">
                <Labeled label="default off">
                    <Switch aria-label="Paused" />
                </Labeled>
                <Labeled label="default on">
                    <Switch aria-label="Paused" defaultChecked />
                </Labeled>
                <Labeled label="sm off">
                    <Switch aria-label="Paused" size="sm" />
                </Labeled>
                <Labeled label="sm on">
                    <Switch aria-label="Paused" size="sm" defaultChecked />
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-8">
                <Labeled label="disabled off">
                    <Switch aria-label="Paused" disabled />
                </Labeled>
                <Labeled label="disabled on">
                    <Switch aria-label="Paused" disabled defaultChecked />
                </Labeled>
                <Labeled label="invalid">
                    <Switch aria-label="Paused" aria-invalid />
                </Labeled>
                <Labeled label="read only on">
                    <Switch aria-label="Paused" readOnly defaultChecked />
                </Labeled>
            </div>
        </Ground>
    ),
}

const SCHEDULES = [
    { code: 'nightly', detail: 'Cron 0 2 * * *, next at 2026-11-05 02:00', on: true },
    { code: 'on-upload', detail: 'Webhook, last called 2026-11-04 14:02', on: true },
    { code: 'backfill', detail: 'Cron 0 4 * * 0, last run 2026-10-25 04:00', on: false },
]

export const JobSchedules: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-lg flex-col gap-3">
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
            </div>
        </Ground>
    ),
}
