/** Tidevann's tasks for a list: a title, the day each is due, who has it, its project, and whether it is done. */

export interface TaskRow {
    id: string
    title: string
    /** The day it is due, `YYYY-MM-DD`, or null for none. */
    due: string | null
    assignee: 'ada' | 'grace' | 'linus' | 'margaret'
    project: 'harbor' | 'juniper' | 'larkspur'
    done: boolean
}

/** The day the stories take for today, so a due date's tone never depends on the clock. */
export const TASKS_TODAY = '2026-11-09'

export const TASK_PEOPLE = ['ada', 'grace', 'linus', 'margaret'] as const
export const TASK_PROJECTS = ['harbor', 'juniper', 'larkspur'] as const

export const TASKS: TaskRow[] = [
    { id: 't1', title: 'Rerun nightly-export for last week', due: '2026-11-08', assignee: 'ada', project: 'harbor', done: false },
    { id: 't2', title: 'Review the failed sync-inventory runs', due: '2026-11-09', assignee: 'grace', project: 'harbor', done: false },
    { id: 't3', title: 'Add a validate step to import-orders', due: '2026-11-09', assignee: 'linus', project: 'juniper', done: false },
    {
        id: 't4',
        title: 'Retry import-orders from the upload step',
        due: '2026-11-10',
        assignee: 'margaret',
        project: 'juniper',
        done: false,
    },
    { id: 't5', title: 'Speed up rebuild-index on the worker', due: '2026-11-11', assignee: 'linus', project: 'juniper', done: false },
    { id: 't6', title: 'Write the runbook for the api service', due: '2026-11-14', assignee: 'grace', project: 'harbor', done: false },
    { id: 't7', title: 'Pick a time for the weekly send-digest', due: null, assignee: 'margaret', project: 'larkspur', done: false },
    { id: 't8', title: 'Set up alerts for failed uploads', due: '2026-11-07', assignee: 'ada', project: 'harbor', done: true },
]

/** A day as a local date. */
export function taskDate(day: string): Date {
    const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
    return new Date(year, month - 1, date)
}

/** A save that takes as long as a request to Tidevann's api would. */
export async function saveTask(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 600))
}

/** An add that takes as long as a request would, refusing a title the api already has. */
export async function addTask(title: string, taken: readonly string[]): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 600))
    if (taken.some((one) => one.toLowerCase() === title.toLowerCase())) throw new Error('A task with that title is already open.')
}
