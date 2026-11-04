import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ConfirmDialog, DialogShell } from '../components/DialogShell'
import { CodeField } from '../components/CodeField'
import { Field } from '../components/Field'
import { SwitchField } from '../components/SwitchField'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'

/**
 * The dialog shell open over a page: a form that creates something, with a shut Create that says
 * why; and a confirm whose title is the question. On a phone both are full-screen sheets.
 */
function CreateSchema() {
    const [open, setOpen] = useState(true)
    const [code, setCode] = useState('')
    return (
        <div className="h-svh bg-background">
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="New schema"
                description="The body is written on the schema's own page."
                confirm={{
                    label: 'Create',
                    onConfirm: () => setOpen(false),
                    why: code === '' ? 'Give the schema a code.' : undefined,
                }}
            >
                <CodeField id="code" value={code} onChange={setCode} />
                <Field id="name" label="Name">
                    <Input id="name" defaultValue="A batch of readings" />
                </Field>
                <Field id="description" label="Description">
                    <Textarea id="description" defaultValue="Readings a station sent in one upload." />
                </Field>
                <SwitchField
                    id="strict"
                    label="Refuse unknown fields"
                    explain="A value with a field the schema does not name fails the check."
                />
            </DialogShell>
        </div>
    )
}

function ConfirmDelete() {
    const [open, setOpen] = useState(true)
    return (
        <div className="h-svh bg-background">
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                question="Delete weather-gate?"
                detail="Its runs stay in the history; the pipeline stops running."
                confirm={{ label: 'Delete', destructive: true, onConfirm: () => setOpen(false) }}
            />
        </div>
    )
}

const meta: Meta = { title: 'Patterns/Dialogs' }
export default meta

export const Create: StoryObj = { render: () => <CreateSchema /> }
export const Confirm: StoryObj = { render: () => <ConfirmDelete /> }
