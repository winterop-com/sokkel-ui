import { collection } from 'tidevann-shared/backend'

export const PEOPLE = ['ada', 'grace', 'linus', 'margaret'] as const
export type Person = (typeof PEOPLE)[number]

export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export type Project = (typeof PROJECTS)[number]

export interface Task {
    id: string
    title: string
    /** The day it is due, `YYYY-MM-DD`, or null for none. */
    due: string | null
    assignee: Person
    project: Project
    done: boolean
}

/** The local day `offset` days from today, as `YYYY-MM-DD`. */
export function day(offset = 0): string {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A `YYYY-MM-DD` day as a local date. */
export function dateOf(text: string): Date {
    const [year = 0, month = 1, date = 1] = text.split('-').map(Number)
    return new Date(year, month - 1, date)
}

const SEED: [string, number | null, Person, Project, boolean][] = [
    ['Rerun nightly-export for last week', -1, 'ada', 'harbor', false],
    ['Review the failed sync-inventory runs', 0, 'grace', 'harbor', false],
    ['Add a validate step to import-orders', 0, 'linus', 'juniper', false],
    ['Draft the wording of send-digest', 0, 'margaret', 'larkspur', false],
    ['Speed up rebuild-index on the worker', 2, 'linus', 'juniper', false],
    ['Move notify to the new scheduler', 3, 'ada', 'larkspur', false],
    ['Write the runbook for the api service', 5, 'grace', 'harbor', false],
    ['Retry import-orders from the upload step', 1, 'margaret', 'juniper', false],
    ['Archive the cancelled runs from last month', 9, 'ada', 'harbor', false],
    ['Pick a time for the weekly send-digest', null, 'margaret', 'larkspur', false],
    ['Split transform into two steps', null, 'linus', 'juniper', false],
    ['Clean up skipped runs in larkspur', -3, 'grace', 'larkspur', true],
    ['Set up alerts for failed uploads', -2, 'ada', 'harbor', true],
    ['Rename the fetch step in sync-inventory', -1, 'linus', 'juniper', true],
]

function seed(): Task[] {
    return SEED.map(([title, offset, assignee, project, done], index) => ({
        id: `task-${String(index + 1)}`,
        title,
        due: offset === null ? null : day(offset),
        assignee,
        project,
        done,
    }))
}

export const tasks = collection<Task>('tasks', seed)

/** What the person chose in Settings, kept by the backend as one row. */
export interface Prefs {
    id: string
    /** The list the app opens on. */
    startList: string
    /** Whether lists show the tasks already done. */
    showDone: boolean
    /** Who a task added from the quick add is given to. */
    assignee: Person
    /** The project a task added outside a project's list goes into. */
    project: Project
}

export const DEFAULT_PREFS: Prefs = { id: 'me', startList: 'inbox', showDone: false, assignee: 'ada', project: 'harbor' }

export const prefs = collection<Prefs>('prefs', () => [{ ...DEFAULT_PREFS }])
