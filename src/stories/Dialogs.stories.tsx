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
function CreateJob() {
    const [open, setOpen] = useState(true)
    const [code, setCode] = useState('')
    return (
        <div className="h-svh bg-background">
            <DialogShell
                open={open}
                onOpenChange={setOpen}
                title="New job"
                description="The steps are written on the job's own page."
                confirm={{
                    label: 'Create',
                    onConfirm: () => setOpen(false),
                    why: code === '' ? 'Give the job a code.' : undefined,
                }}
            >
                <CodeField id="code" value={code} onChange={setCode} />
                <Field id="name" label="Name">
                    <Input id="name" defaultValue="Import orders" />
                </Field>
                <Field id="description" label="Description">
                    <Textarea id="description" defaultValue="Loads the monthly orders file into the warehouse." />
                </Field>
                <SwitchField
                    id="strict"
                    label="Stop at the first failure"
                    explain="A step that fails ends the run, and the steps after it are skipped."
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
                question="Delete import-orders?"
                detail="Its runs stay in the history; the job stops running."
                confirm={{ label: 'Delete', destructive: true, onConfirm: () => setOpen(false) }}
            />
        </div>
    )
}

const meta: Meta = { title: 'Patterns/Dialogs' }
export default meta

export const Create: StoryObj = { render: () => <CreateJob /> }
export const Confirm: StoryObj = { render: () => <ConfirmDelete /> }
