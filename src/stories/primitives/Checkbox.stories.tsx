import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Checkbox } from '../../components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../../components/ui/field'
import { Label } from '../../components/ui/label'

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

const meta: Meta = { title: 'Primitives/Inputs/Checkbox' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-8">
                <Labeled label="unchecked">
                    <Checkbox aria-label="Select run" />
                </Labeled>
                <Labeled label="checked">
                    <Checkbox aria-label="Select run" defaultChecked />
                </Labeled>
                <Labeled label="indeterminate">
                    <Checkbox aria-label="Select all runs" indeterminate />
                </Labeled>
                <Labeled label="with label">
                    <div className="flex items-center gap-2">
                        <Checkbox id="cb-notify" defaultChecked />
                        <Label htmlFor="cb-notify">Notify on failure</Label>
                    </div>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-8">
                <Labeled label="disabled">
                    <Checkbox aria-label="Select run" disabled />
                </Labeled>
                <Labeled label="disabled checked">
                    <Checkbox aria-label="Select run" disabled defaultChecked />
                </Labeled>
                <Labeled label="invalid">
                    <Checkbox aria-label="Accept" aria-invalid />
                </Labeled>
                <Labeled label="invalid checked">
                    <Checkbox aria-label="Accept" aria-invalid defaultChecked />
                </Labeled>
            </div>
        </Ground>
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
        <Ground>
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
                <FieldGroup className="gap-3 pl-6">
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
                </FieldGroup>
            </FieldSet>
        </Ground>
    )
}

export const AlertRules: StoryObj = { render: () => <AlertEvents /> }
