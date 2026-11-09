import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { useEffect, useState } from 'react'

import { handovers, incidents, momentOf, onCall, PEOPLE, type Person } from '../data'
import { useRows } from '../rows'
import { PersonSelect } from './PersonSelect'

/** The person after `person` in the team's order, for the next shift. */
export function nextPerson(person: Person): Person {
    return PEOPLE[(PEOPLE.indexOf(person) + 1) % PEOPLE.length] ?? 'ada'
}

/**
 * Hands the pager to someone else: who takes it, what they need to know, and whether the open
 * incidents go with it. The handover is kept in the log.
 */
export function HandOverDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const rows = useRows()
    const from = rows.onCall?.person ?? 'grace'
    const [to, setTo] = useState<Person>(nextPerson(from))
    const [note, setNote] = useState('')
    const [move, setMove] = useState(true)
    const [busy, setBusy] = useState(false)
    const held = (rows.incidents ?? []).filter((incident) => incident.state !== 'resolved' && incident.assignee === from)

    useEffect(() => {
        if (!open) return
        setTo(nextPerson(from))
        setNote('')
        setMove(true)
        setBusy(false)
    }, [open, from])

    const submit = () => {
        setBusy(true)
        const now = new Date()
        void Promise.all([
            onCall.update('now', { person: to, since: momentOf(now), note: note.trim() }),
            handovers.create({ at: now.toISOString(), from, to, note: note.trim() }),
            ...(move ? held.map((incident) => incidents.update(incident.id, { assignee: to })) : []),
        ])
            .then(() => onOpenChange(false))
            .finally(() => setBusy(false))
    }

    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title="Hand over on call"
            description={`${from} is on call now.`}
            confirm={{
                label: 'Hand over',
                onConfirm: submit,
                busy,
                busyLabel: 'Handing over',
                why: to === from ? `${from} is on call already.` : undefined,
            }}
        >
            <Stack gap="lg">
                <Field id="handover-to" label="To">
                    <PersonSelect
                        id="handover-to"
                        value={to}
                        onValueChange={setTo}
                        people={PEOPLE.filter((person) => person !== from)}
                        className="w-full"
                    />
                </Field>
                <TextField
                    id="handover-note"
                    label="Note"
                    description="What they need to know: what is open, what to watch."
                    multiline
                    rows={3}
                    value={note}
                    onChange={setNote}
                />
                <SwitchField
                    id="handover-move"
                    label={held.length === 1 ? `Give ${to} the open incident` : `Give ${to} the ${String(held.length)} open incidents`}
                    explain={held.length === 0 ? `${from} has no open incident.` : held.map((incident) => incident.code).join(', ')}
                    checked={move && held.length > 0}
                    disabled={held.length === 0}
                    onCheckedChange={setMove}
                />
            </Stack>
        </DialogShell>
    )
}
