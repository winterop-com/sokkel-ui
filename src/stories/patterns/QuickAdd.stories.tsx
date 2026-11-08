import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DueText } from '@winterop-com/sokkel-ui/DueText'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { QuickAdd } from '@winterop-com/sokkel-ui/QuickAdd'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Checkbox } from '@winterop-com/sokkel-ui/primitives/checkbox'
import { addTask, taskDate, type TaskRow, TASKS, TASKS_TODAY } from '../fixtures/tasks'

/**
 * The field at the top of a list that adds a row: type, press Enter, and it empties for the next
 * one. While the app adds, the text stays with a spinner; a refusal keeps it, with the reason in
 * the mark at the field's end. Tidevann's tasks are added here, a title the api already has refused.
 */
const meta: Meta = { title: 'Patterns/Quick add', parameters: { frame: 'padded' } }
export default meta

const TITLES = TASKS.map((task) => task.title)

/** The field alone: Enter adds what is typed after a short wait, and a title already open is refused. */
export const Field: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <QuickAdd placeholder="Add a task" onAdd={(title) => addTask(title, TITLES)} />
        </Stack>
    ),
}

/** An add running: the text kept, read only, with a spinner at the field's end. */
export const Adding: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <QuickAdd
                placeholder="Add a task"
                defaultValue="Rerun nightly-export for Monday"
                defaultState={{ adding: true }}
                onAdd={(title) => addTask(title, TITLES)}
            />
        </Stack>
    ),
}

/** A refused add: the text kept, the field's edge in the critical ink, and the reason open in the mark. */
export const Refused: StoryObj = {
    render: () => (
        <Stack className="max-w-sm">
            <QuickAdd
                placeholder="Add a task"
                defaultValue="Review the failed sync-inventory runs"
                defaultState={{ error: 'A task with that title is already open.' }}
                onAdd={(title) => addTask(title, TITLES)}
            />
        </Stack>
    ),
}

const TODAY = taskDate(TASKS_TODAY)

/** Tidevann's open tasks under a quick add, each new one landing at the top once the api has it. */
function TaskInbox() {
    const [tasks, setTasks] = useState(TASKS.filter((task) => !task.done))
    const put = (task: TaskRow, done: boolean) => setTasks((all) => all.map((one) => (one.id === task.id ? { ...one, done } : one)))
    const columns: DataColumn<TaskRow>[] = [
        {
            id: 'done',
            header: 'Done',
            width: '3rem',
            resizable: false,
            stack: 'lead',
            cell: (task) => (
                <Checkbox
                    aria-label={task.done ? `Reopen ${task.title}` : `Mark ${task.title} done`}
                    checked={task.done}
                    onCheckedChange={(done) => put(task, done)}
                />
            ),
        },
        { id: 'title', header: 'Title', width: 'minmax(14rem,1fr)', cell: (task) => task.title },
        {
            id: 'due',
            header: 'Due',
            width: '7rem',
            cell: (task) => <DueText date={task.due === null ? undefined : taskDate(task.due)} now={TODAY} done={task.done} />,
        },
        { id: 'assignee', header: 'Assignee', width: '7rem', cell: (task) => task.assignee },
    ]
    return (
        <Stack gap="sm">
            <Toolbar
                search={
                    <QuickAdd
                        placeholder="Add a task"
                        onAdd={(title) =>
                            addTask(
                                title,
                                tasks.map((task) => task.title),
                            ).then(() =>
                                setTasks((all) => [
                                    { id: `new-${String(all.length)}`, title, due: null, assignee: 'ada', project: 'harbor', done: false },
                                    ...all,
                                ]),
                            )
                        }
                    />
                }
            />
            <DataTable variant="list" stackLayout="compact" columns={columns} rows={tasks} rowKey={(task) => task.id} />
        </Stack>
    )
}

/** A quick add in a toolbar over a list of tasks, as an inbox has it; on a phone the list stacks compact. */
export const AboveList: StoryObj = { name: 'Above a list', render: () => <TaskInbox /> }
