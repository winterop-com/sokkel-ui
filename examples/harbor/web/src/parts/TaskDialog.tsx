import { DialogShell } from '@winterop-com/sokkel-ui/DialogShell'
import { Field } from '@winterop-com/sokkel-ui/Field'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { SelectField } from '@winterop-com/sokkel-ui/SelectField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import type { Track } from '@winterop-com/sokkel-ui-tracking/track'
import { useEffect, useState } from 'react'

import { ME, nextCode, PRIORITY_LABEL, TASK_KINDS, tasks, type Priority, type Task, type TaskEndRow, type TaskKind } from '../data'
import { logTask } from './TaskList'

/** What a task's end is, as a select lists it: the track's name, and its MMSI or address. */
function endRow(track: Track): TaskEndRow {
    return { track: track.id, name: track.label ?? track.id, kind: track.kind }
}

const options = (rows: readonly TaskEndRow[]) =>
    rows.map((row) => ({ value: row.track, label: row.name, detail: row.name === row.track ? undefined : row.track }))

/** A list of ends with the one already chosen kept, though its track has left the picture. */
function withChosen(rows: TaskEndRow[], chosen: TaskEndRow | undefined): TaskEndRow[] {
    return chosen === undefined || rows.some((row) => row.track === chosen.track) ? rows : [chosen, ...rows]
}

/**
 * Sets a task, or edits one: what it asks, which of the watch's own units does it, what it is done
 * to, how pressing it is and a note. A new task waits until it is started.
 */
export function TaskDialog({
    open,
    onOpenChange,
    task,
    target,
    tracks,
    all,
    now,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** The task edited; a new one when left out. */
    task?: Task
    /** The track a new task starts aimed at, as from a track's card. */
    target?: string
    /** The tracks in the picture now, the units and targets offered. */
    tracks: readonly Track[]
    /** Every task, for the next code. */
    all: readonly Task[]
    now: number
}) {
    const units = tracks.filter((track) => track.affiliation === 'friend').map(endRow)
    const targets = tracks.map(endRow)
    const [kind, setKind] = useState<TaskKind>('investigate')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [priority, setPriority] = useState<Priority>('normal')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)

    // Each opening starts from the task edited, or afresh aimed at the target.
    useEffect(() => {
        if (!open) return
        setKind(task?.kind ?? 'investigate')
        setFrom(task?.from.track ?? '')
        setTo(task?.to.track ?? target ?? '')
        setPriority(task?.priority ?? 'normal')
        setNote(task?.note ?? '')
        setBusy(false)
    }, [open, task, target])

    const unitRows = withChosen(units, task?.from)
    const targetRows = withChosen(targets, task?.to)
    const fromRow = unitRows.find((row) => row.track === from)
    const toRow = targetRows.find((row) => row.track === to)
    const why =
        fromRow === undefined
            ? 'Pick the unit that does it.'
            : toRow === undefined
              ? 'Pick what it is done to.'
              : fromRow.track === toRow.track
                ? 'A unit cannot be its own target.'
                : undefined

    const submit = () => {
        if (fromRow === undefined || toRow === undefined) return
        setBusy(true)
        const fields = { kind, from: fromRow, to: toRow, priority, note: note.trim() }
        const done =
            task === undefined
                ? tasks
                      .create({
                          ...fields,
                          code: nextCode(all),
                          state: 'pending',
                          by: ME,
                          createdAt: now,
                          startedAt: null,
                          endedAt: null,
                      })
                      .then((made) => logTask(made, 'Set', now))
                : tasks.update(task.id, fields).then((made) => logTask(made, 'Edited', now))
        void done.then(() => onOpenChange(false)).finally(() => setBusy(false))
    }

    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            width="lg"
            title={task === undefined ? 'New task' : `Edit ${task.code}`}
            description={task === undefined ? 'It waits until it is started.' : undefined}
            confirm={{ label: task === undefined ? 'Set task' : 'Save', onConfirm: submit, why, busy, busyLabel: 'Saving' }}
        >
            <Stack gap="lg">
                <Field id="task-kind" label="Task" description={TASK_KINDS.find((one) => one.value === kind)?.description}>
                    <Segmented
                        id="task-kind"
                        label="Task"
                        value={kind}
                        onValueChange={setKind}
                        options={TASK_KINDS.map((one) => ({ value: one.value, label: one.label }))}
                    />
                </Field>
                <Columns count={2} min="sm" gap="lg">
                    <SelectField
                        id="task-from"
                        label="Unit"
                        description="One of the watch's own."
                        options={options(unitRows)}
                        value={from}
                        onChange={setFrom}
                        placeholder="Pick a unit"
                    />
                    <SelectField
                        id="task-to"
                        label="Target"
                        description="Anything in the picture."
                        options={options(targetRows)}
                        value={to}
                        onChange={setTo}
                        placeholder="Pick a target"
                    />
                </Columns>
                <Field id="task-priority" label="Priority">
                    <Segmented
                        id="task-priority"
                        label="Priority"
                        value={priority}
                        onValueChange={setPriority}
                        options={(['low', 'normal', 'high'] as const).map((value) => ({ value, label: PRIORITY_LABEL[value] }))}
                    />
                </Field>
                <TextField id="task-note" label="Note" multiline rows={3} value={note} onChange={setNote} />
            </Stack>
        </DialogShell>
    )
}
