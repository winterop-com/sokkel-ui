import { Bell, CalendarClock, History, KeyRound, Workflow } from 'lucide-react'
import { useState } from 'react'

import { ConsequenceList } from '../../components/ConsequenceList'
import { ConfirmDialog, DialogShell } from '../../components/DialogShell'
import { PersonAvatar } from '../../components/PersonAvatar'
import { TypedConfirmDialog } from '../../components/TypedConfirmDialog'
import { Checkbox } from '../../components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { cn } from '../../lib/cn'
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
                    <RadioGroup value={to} onValueChange={(value) => setTo(String(value))} aria-label="New owner" className="gap-0">
                        {PEOPLE.map((person) => (
                            <label
                                key={person.username}
                                className={cn(
                                    'flex cursor-pointer items-center gap-3 rounded-control border border-transparent px-3 py-2.5 hover:bg-muted',
                                    to === person.username && 'border-primary/40 bg-primary/6',
                                )}
                            >
                                <RadioGroupItem value={person.username} />
                                <PersonAvatar name={person.username} />
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="font-mono text-[0.8125rem]">{person.username}</span>
                                    <span className="truncate text-xs text-muted-foreground">{person.email}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">{person.role}</span>
                            </label>
                        ))}
                    </RadioGroup>
                ) : (
                    <>
                        <ConsequenceList items={OWNED} tone="neutral" words={{ heading: `Moves to ${to}` }} />
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-critical/30 bg-critical/4 px-3 py-2.5">
                            <Checkbox checked={understood} onCheckedChange={(checked) => setUnderstood(checked)} className="mt-0.5" />
                            <span className="text-sm">
                                I understand that I lose the owner’s rights at once, and that only <span className="font-mono">{to}</span>{' '}
                                can give them back.
                            </span>
                        </label>
                    </>
                )}
            </DialogShell>
        </Behind>
    )
}
