import { CheckSquare, Play } from 'lucide-react'

import type { Demo } from '../frame'
import { RunsDemo } from './runs/RunsDemo'
import { TasksDemo } from './tasks/TasksDemo'

/** Every demo, in the launcher's order. */
export const DEMOS: readonly Demo[] = [
    { id: 'tasks', name: 'Tasks', summary: 'Lists, a quick add and tasks edited in place.', icon: CheckSquare, Component: TasksDemo },
    { id: 'runs', name: 'Runs', summary: 'Job runs in a table, with a run opened beside it.', icon: Play, Component: RunsDemo },
]
