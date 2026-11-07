import { PersonRow } from '../../components/PersonRow'
import { ChoiceList } from '../../components/ChoiceList'
import { CheckboxField } from '../../components/CheckboxField'
import { Bell, CalendarClock, History, KeyRound, Workflow } from 'lucide-react'
import { useState } from 'react'

import { ConsequenceList } from '../../components/ConsequenceList'
import { ConfirmDialog, DialogShell } from '../../components/DialogShell'
import { TypedConfirmDialog } from '../../components/TypedConfirmDialog'
import { Behind, wait } from './parts'

export function ConfirmDelete() {
    const [open, setOpen] = useState(true)
    return (
        <Behind action="Delete" onAction={() => setOpen(true)}>
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                question="Delete import-orders?"
                detail="Its runs stay in the history; the job stops running."
                confirm={{ label: 'Delete', destructive: true, onConfirm: () => setOpen(false) }}
            />
        </Behind>
    )
}

export function TypeToDelete() {
    const [open, setOpen] = useState(true)
    const [busy, setBusy] = useState(false)
    return (
        <Behind action="Delete pipeline" onAction={() => setOpen(true)}>
            <TypedConfirmDialog
                open={open}
                onOpenChange={setOpen}
                question="Delete the harbor-orders pipeline?"
                detail="This cannot be undone. Jobs that read its output start failing at their next run."
                code="harbor-orders"
                confirm={{
                    label: 'Delete pipeline',
                    busy,
                    busyLabel: 'Deleting',
                    onConfirm: () => {
                        setBusy(true)
                        void wait(1200).then(() => {
                            setBusy(false)
                            setOpen(false)
                        })
                    },
                }}
            />
        </Behind>
    )
}

const GOES = [
    { label: 'Runs', count: 12, detail: 'With their logs and outputs.', icon: <History /> },
    { label: 'Schedules', count: 3, detail: 'Nightly, hourly on weekdays, and the month-end run.', icon: <CalendarClock /> },
    { label: 'Alerts', count: 2, detail: 'margaret and the #harbor channel stop hearing about it.', icon: <Bell /> },
]

export function DeleteWithConsequences() {
    const [open, setOpen] = useState(true)
    return (
        <Behind action="Delete job" onAction={() => setOpen(true)}>
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                question="Delete import-orders?"
                detail="The job is deleted with everything that belongs to it."
                confirm={{ label: 'Delete job and 17 more', destructive: true, onConfirm: () => setOpen(false) }}
            >
                <ConsequenceList items={GOES} />
            </ConfirmDialog>
        </Behind>
    )
}

const PEOPLE = [
    { username: 'grace', email: 'grace@example.org', role: 'Admin' },
    { username: 'linus', email: 'linus@example.org', role: 'Editor' },
    { username: 'margaret', email: 'margaret@example.org', role: 'Editor' },
]

const OWNED = [
    { label: 'Jobs', count: 14, icon: <Workflow /> },
    { label: 'Secrets', count: 6, detail: 'Only the owner can read and rotate them.', icon: <KeyRound /> },
]

/** Two steps: choose the new owner, then confirm what moves to them and what you keep. */
export function TransferOwnership({ step: first = 1 }: { step?: 0 | 1 }) {
    const [open, setOpen] = useState(true)
    const [step, setStep] = useState<0 | 1>(first)
    const [to, setTo] = useState('grace')
    const [understood, setUnderstood] = useState(false)
    const [busy, setBusy] = useState(false)
    const close = (next: boolean) => {
        setOpen(next)
        if (!next) {
            setStep(0)
            setUnderstood(false)
        }
    }
    return (
        <Behind action="Transfer ownership" onAction={() => setOpen(true)}>
            <DialogShell
                open={open}
                onOpenChange={close}
                title={step === 0 ? 'Transfer ownership of harbor' : `Make ${to} the owner of harbor?`}
                description={
                    step === 0
                        ? 'The owner holds the project’s secrets and is the only one who can delete it.'
                        : 'You stay in the project as an admin. Only the new owner can give it back.'
                }
                back={step === 1 ? () => setStep(0) : undefined}
                footer={<span className="font-mono">{step + 1} of 2</span>}
                confirm={
                    step === 0
                        ? { label: 'Next', onConfirm: () => setStep(1) }
                        : {
                              label: `Transfer to ${to}`,
                              destructive: true,
                              busy,
                              busyLabel: 'Transferring',
                              why: understood ? undefined : 'Tick the box to say you understand.',
                              onConfirm: () => {
                                  setBusy(true)
                                  void wait(1200).then(() => {
                                      setBusy(false)
                                      close(false)
                                  })
                              },
                          }
                }
            >
                {step === 0 ? (
                    <ChoiceList
                        label="New owner"
                        value={to}
                        onValueChange={setTo}
                        choices={PEOPLE.map((person) => ({
                            value: person.username,
                            label: <PersonRow name={person.username} detail={person.email} aside={person.role} />,
                        }))}
                    />
                ) : (
                    <>
                        <ConsequenceList items={OWNED} tone="neutral" words={{ heading: `Moves to ${to}` }} />
                        <CheckboxField
                            tone="critical"
                            label={
                                <>
                                    I understand that I lose the owner’s rights at once, and that only{' '}
                                    <span className="font-mono">{to}</span> can give them back.
                                </>
                            }
                            checked={understood}
                            onCheckedChange={setUnderstood}
                        />
                    </>
                )}
            </DialogShell>
        </Behind>
    )
}
