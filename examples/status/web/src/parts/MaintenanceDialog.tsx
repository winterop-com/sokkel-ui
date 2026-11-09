import { DateTimeField } from '@winterop-com/sokkel-ui/DateTimeField'
import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { useEffect, useState } from 'react'

import { dateOfMoment, dayOf, maintenance, momentOf, type Person, type ServiceId } from '../data'

/** Tomorrow at two in the night, and an hour after, as wall-clock moments. */
function tomorrowNight(): [string, string] {
    const starts = new Date()
    starts.setDate(starts.getDate() + 1)
    starts.setHours(2, 0, 0, 0)
    const ends = new Date(starts)
    ends.setHours(3)
    return [momentOf(starts), momentOf(ends)]
}

/**
 * Schedules a window a service is taken down for work, its start and end typed or picked on the
 * date and time fields. While the window runs the service is in maintenance, here and on the
 * status page.
 */
export function MaintenanceDialog({
    open,
    onOpenChange,
    service,
    me,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    service: ServiceId
    me: Person
}) {
    const [title, setTitle] = useState('')
    const [starts, setStarts] = useState<string | null>(null)
    const [ends, setEnds] = useState<string | null>(null)
    const [issues, setIssues] = useState<Record<string, Issue | null>>({})
    const [busy, setBusy] = useState(false)
    const now = momentOf(new Date())

    useEffect(() => {
        if (!open) return
        const [from, to] = tomorrowNight()
        setTitle('')
        setStarts(from)
        setEnds(to)
        setIssues({})
        setBusy(false)
    }, [open])

    const why =
        title.trim() === ''
            ? 'Say what the work is.'
            : starts === null || ends === null
              ? 'Pick when it starts and ends.'
              : Object.values(issues).some((issue) => issue !== null)
                ? 'Put the times right first.'
                : dateOfMoment(ends).getTime() <= dateOfMoment(starts).getTime()
                  ? 'It has to end after it starts.'
                  : undefined

    const submit = () => {
        if (starts === null || ends === null) return
        setBusy(true)
        void maintenance
            .create({ service, title: title.trim(), starts, ends, by: me, cancelled: false })
            .then(() => onOpenChange(false))
            .finally(() => setBusy(false))
    }

    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={`Schedule maintenance of ${service}`}
            description="The status page lists it ahead, and shows it while it runs."
            confirm={{ label: 'Schedule', onConfirm: submit, why, busy, busyLabel: 'Scheduling' }}
        >
            <Stack gap="lg">
                <TextField
                    id="maintenance-title"
                    label="What the work is"
                    value={title}
                    onChange={setTitle}
                    placeholder="Moving to larger disks"
                    autoFocus
                />
                <Columns count={2} min="md" gap="lg">
                    <DateTimeField
                        id="maintenance-starts"
                        label="Starts"
                        value={starts}
                        onValueChange={setStarts}
                        onIssueChange={(issue) => setIssues((current) => ({ ...current, starts: issue }))}
                        min={now}
                        today={dayOf(new Date())}
                        step={15}
                        required
                    />
                    <DateTimeField
                        id="maintenance-ends"
                        label="Ends"
                        value={ends}
                        onValueChange={setEnds}
                        onIssueChange={(issue) => setIssues((current) => ({ ...current, ends: issue }))}
                        min={starts ?? now}
                        today={dayOf(new Date())}
                        step={15}
                        required
                    />
                </Columns>
            </Stack>
        </DialogShell>
    )
}
