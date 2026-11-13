/** What the fake server keeps: the dashboards and their widgets, the to-do lists, and the person's preferences. */

import { collection } from 'tidevann-shared/backend'

import { DEFAULT_PREFS, PRESETS, SEED_TODOS, type Dashboard, type Prefs, type Todo } from './model'

export const dashboards = collection<Dashboard>('dashboards', () =>
    PRESETS.map((preset, index) => ({
        id: preset.id,
        name: preset.name,
        widgets: preset.widgets,
        base: preset.widgets,
        created: Date.now() - (PRESETS.length - index) * 86_400_000,
    })),
)

export const todos = collection<Todo>('todos', () =>
    SEED_TODOS.map((todo, index) => ({ ...todo, created: Date.now() - (SEED_TODOS.length - index) * 3_600_000 })),
)

export const prefs = collection<Prefs>('prefs', () => [{ id: 'prefs', order: PRESETS.map((preset) => preset.id), ...DEFAULT_PREFS }])
