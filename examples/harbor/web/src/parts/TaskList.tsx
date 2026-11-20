import { TaskCard, type TaskAction } from '@winterop-com/sokkel-ui/TaskCard'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import type { TaskState } from '@winterop-com/sokkel-ui/TaskCard'
import type { Track } from '@winterop-com/sokkel-ui-tracking/track'
import { Check, Crosshair, Pause, Pencil, Play, X } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { entries, KIND_LABEL, ME, PRIORITY_LABEL, tasks, type Task, type TaskEndRow } from '../data'
import { picked } from '../watch'

/** What each move of a task says in the log. */
const SAID: Record<TaskState, string> = {
    pending: 'Reopened',
    executing: 'Started',
    paused: 'Paused',
    done: 'Completed',
    failed: 'Cancelled',
}

/** Moves a task to a state at a simulated moment, and logs it. */
export function moveTask(task: Task, state: TaskState, at: number): void {
    const ends = state === 'done' || state === 'failed'
    void tasks.update(task.id, {
        state,
        startedAt: state === 'executing' && task.startedAt === null ? at : task.startedAt,
        endedAt: ends ? at : null,
    })
    logTask(task, SAID[state], at)
}

/** Logs what was done to a task, against its target. */
export function logTask(task: Pick<Task, 'code' | 'kind' | 'to' | 'from'>, done: string, at: number): void {
    void entries.create({
        at,
        kind: 'task',
        track: task.to.track,
        trackKind: task.to.kind,
        name: task.to.name,
        detail: `${done} ${KIND_LABEL[task.kind].toLowerCase()} ${task.code}, by ${task.from.name}`,
        by: ME,
    })
}

/** A task's actions as its state allows: start, pause, resume, complete, edit and cancel. */
export function taskActions(task: Task, at: number, onEdit: (task: Task) => void): TaskAction[] {
    const edit: TaskAction = { label: 'Edit', icon: <Pencil />, onSelect: () => onEdit(task) }
    const cancel: TaskAction = {
        label: 'Cancel',
        icon: <X />,
        destructive: true,
        confirm: {
            question: `Cancel ${KIND_LABEL[task.kind]} ${task.code}?`,
            detail: 'The task stops and is marked failed.',
            label: 'Cancel task',
        },
        onSelect: () => moveTask(task, 'failed', at),
    }
    const complete: TaskAction = { label: 'Complete', icon: <Check />, onSelect: () => moveTask(task, 'done', at) }
    if (task.state === 'pending')
        return [{ label: 'Start', icon: <Play />, primary: true, onSelect: () => moveTask(task, 'executing', at) }, edit, cancel]
    if (task.state === 'executing')
        return [
            { ...complete, primary: true },
            { label: 'Pause', icon: <Pause />, onSelect: () => moveTask(task, 'paused', at) },
            edit,
            cancel,
        ]
    if (task.state === 'paused')
        return [{ label: 'Resume', icon: <Play />, primary: true, onSelect: () => moveTask(task, 'executing', at) }, complete, edit, cancel]
    return [{ label: 'Reopen', icon: <Play />, onSelect: () => moveTask(task, 'pending', at) }]
}

/** One end of a task with its glyph, in the affiliation the picture gives it now. */
function endOf(end: TaskEndRow, tracks: readonly Track[]) {
    const track = tracks.find((each) => each.id === end.track)
    return {
        name: track?.label ?? end.name,
        glyph: <TrackGlyph kind={end.kind} affiliation={track?.affiliation} heading={track?.heading} />,
    }
}

/** The tasks as cards, each with its actions and a way to its target on the map. */
export function TaskList({
    rows,
    tracks,
    now,
    selected,
    onEdit,
}: {
    rows: readonly Task[]
    tracks: readonly Track[]
    now: number
    /** The picked track: a task about it or done by it is drawn as chosen. */
    selected?: string | null
    onEdit: (task: Task) => void
}) {
    return rows.map((task) => (
        <TaskCard
            key={task.id}
            title={KIND_LABEL[task.kind]}
            code={task.code}
            state={task.state}
            startedAt={task.startedAt ?? undefined}
            endedAt={task.endedAt ?? undefined}
            now={now}
            from={endOf(task.from, tracks)}
            to={endOf(task.to, tracks)}
            selected={selected !== undefined && selected !== null && (task.from.track === selected || task.to.track === selected)}
            facts={[
                { term: 'Priority', value: PRIORITY_LABEL[task.priority] },
                { term: 'Set by', value: task.by },
                ...(task.note === '' ? [] : [{ term: 'Note', value: task.note }]),
            ]}
            actions={[
                ...taskActions(task, now, onEdit),
                {
                    label: 'Show on map',
                    icon: <Crosshair />,
                    reason: tracks.some((each) => each.id === task.to.track) ? undefined : `${task.to.name} is not in the picture now.`,
                    onSelect: () => {
                        picked.set(task.to.track)
                        go('/watch')
                    },
                },
            ]}
        />
    ))
}
