import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, Pencil, X } from 'lucide-react'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TaskCard, type TaskState } from '@winterop-com/sokkel-ui/TaskCard'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import { WATCH_NOW, WATCH_TASKS, WATCH_TRACKS, type WatchTask } from '../fixtures/watch'

const meta: Meta = { title: 'Patterns/Task card', parameters: { frame: 'padded' } }
export default meta

const MINUTE = 60_000

/** A track of the watch as one end of a task's line: its glyph and its name. */
function end(id: string) {
    const track = WATCH_TRACKS.find((each) => each.id === id)
    if (track === undefined) return { name: id }
    return { name: track.name, glyph: <TrackGlyph kind={track.kind} affiliation={track.affiliation} heading={track.heading} /> }
}

function Task({ task, state: given }: { task: WatchTask; state?: TaskState }) {
    const [state, setState] = useState<TaskState>(given ?? task.state)
    const open = state === 'pending' || state === 'executing' || state === 'paused'
    return (
        <TaskCard
            title={task.title}
            code={task.id}
            state={state}
            startedAt={task.started === undefined ? undefined : WATCH_NOW - task.started * MINUTE}
            endedAt={task.started === undefined || task.ran === undefined ? undefined : WATCH_NOW - (task.started - task.ran) * MINUTE}
            now={WATCH_NOW}
            from={end(task.from)}
            to={end(task.to)}
            facts={[
                { term: 'Priority', value: task.priority },
                { term: 'Set by', value: task.by },
            ]}
            actions={
                open
                    ? [
                          { label: 'Edit', icon: <Pencil />, onSelect: () => undefined },
                          { label: 'Complete', icon: <Check />, primary: true, onSelect: () => setState('done') },
                          {
                              label: 'Cancel',
                              icon: <X />,
                              destructive: true,
                              confirm: { question: `Cancel ${task.title} ${task.id}?`, detail: 'The task stops and is marked failed.' },
                              onSelect: () => setState('failed'),
                          },
                      ]
                    : undefined
            }
        />
    )
}

/** A task under way: following a contact for eighteen minutes, its actions at its foot; Cancel asks first. */
export const Executing: StoryObj = { render: () => <Task task={WATCH_TASKS[0]} /> }

/** Every state in its tone: executing, pending, paused, done and failed, the ended ones with the time they ran and no actions. */
export const States: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-md">
            {WATCH_TASKS.map((task) => (
                <Task key={task.id} task={task} />
            ))}
        </Stack>
    ),
}
