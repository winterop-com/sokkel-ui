/**
 * What the dashboards hold: each dashboard is a list of widgets in their order, each widget its
 * kind, its width, its own title when given one, and its options. The dashboards Tidevann starts
 * with, and what each kind of widget starts as when added from the palette.
 */

import type { DashboardLayoutItem } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import type { PanelSpan } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'

export const JOBS = ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest', 'import-orders'] as const
export type Job = (typeof JOBS)[number]
export const PROJECTS = ['harbor', 'juniper', 'larkspur'] as const
export type Project = (typeof PROJECTS)[number]
export const PEOPLE = ['ada', 'grace', 'linus', 'margaret'] as const
export type Person = (typeof PEOPLE)[number]
export const SERVICES = ['api', 'worker', 'scheduler'] as const
export type Service = (typeof SERVICES)[number]
export const STEPS = ['fetch', 'transform', 'validate', 'upload', 'notify'] as const

/** A figure the live source reads every tick. */
export type Metric = 'runs' | 'failures' | 'success' | 'queue' | 'latency' | 'cpu' | 'memory'

export const METRICS: Record<Metric, { label: string; unit?: string; decimals?: number; color: string }> = {
    runs: { label: 'Runs', unit: '/min', color: 'chart-1' },
    failures: { label: 'Failures', unit: '/min', color: 'status-failed' },
    success: { label: 'Success rate', unit: '%', decimals: 1, color: 'chart-3' },
    queue: { label: 'Queue depth', color: 'chart-4' },
    latency: { label: 'api latency p95', unit: 'ms', color: 'chart-2' },
    cpu: { label: 'Worker CPU', unit: '%', color: 'chart-5' },
    memory: { label: 'Worker memory', unit: '%', color: 'chart-1' },
}

export const METRIC_IDS = Object.keys(METRICS) as Metric[]

export type WidgetKind =
    | 'stat'
    | 'trend'
    | 'bars'
    | 'gauge'
    | 'runs'
    | 'activity'
    | 'log'
    | 'map'
    | 'note'
    | 'todo'
    | 'upcoming'
    | 'uptime'
    | 'oncall'
    | 'projects'

/** What a widget can be set to, each kind reading its own. */
export interface WidgetOptions {
    /** The figure a stat, a trend or a gauge reads. */
    metric?: Metric
    /** A second figure a trend draws beside the first. */
    compare?: Metric | 'none'
    /** A trend drawn as a line or a filled area. */
    style?: 'line' | 'area'
    /** What the bars count runs by. */
    group?: 'job' | 'project' | 'person'
    /** The service whose log is followed. */
    service?: Service
    /** How many rows a list shows. */
    rows?: number
    /** Only failed runs in the runs table. */
    failedOnly?: boolean
    /** The note's text, in markdown. */
    text?: string
    /** Hides the to-dos already done. */
    hideDone?: boolean
    /** Shows who is on call next. */
    showNext?: boolean
}

export interface Widget extends DashboardLayoutItem {
    kind: WidgetKind
    span: PanelSpan
    /** Its own title, in place of the one its kind and options give it. */
    title?: string
    options: WidgetOptions
}

export interface Dashboard {
    id: string
    name: string
    widgets: Widget[]
    /** What Reset puts back: the widgets it started with. */
    base: Widget[]
    created: number
}

export interface Todo {
    id: string
    /** The to-do widget it belongs to. */
    widget: string
    text: string
    done: boolean
    created: number
}

export type Pace = 'fast' | 'normal' | 'slow'

export const PACES: Record<Pace, { label: string; every: number }> = {
    fast: { label: 'Every second', every: 1000 },
    normal: { label: 'Every 3 seconds', every: 3000 },
    slow: { label: 'Every 10 seconds', every: 10_000 },
}

export interface Prefs {
    id: string
    /** The dashboards in the order the rail lists them. */
    order: string[]
    live: boolean
    pace: Pace
    clock: '24h' | '12h'
    /** Whether leaving edit mode with changes asks first. */
    confirmCancel: boolean
}

export const DEFAULT_PREFS: Omit<Prefs, 'id' | 'order'> = { live: true, pace: 'normal', clock: '24h', confirmCancel: true }

let made = 0

/** A fresh widget id. */
export function widgetId(kind: WidgetKind): string {
    made += 1
    return `${kind}-${Date.now().toString(36)}-${String(made)}`
}

/** A widget of a kind with its options, under a fixed id for the seeded dashboards. */
const w = (id: string, kind: WidgetKind, span: PanelSpan, options: WidgetOptions = {}, title?: string): Widget => ({
    id,
    kind,
    span,
    options,
    ...(title === undefined ? {} : { title }),
})

const WELCOME = `**Welcome to Tidevann.** This is the team's home: the runs, the services and who is on call, live.

- Press **Edit** to move, resize, configure or remove widgets
- Drag a widget in from the palette to add it
- **Cancel** throws the edits away, **Reset** puts the dashboard back`

export const PRESETS: { id: string; name: string; widgets: Widget[] }[] = [
    {
        id: 'overview',
        name: 'Overview',
        widgets: [
            w('o-runs', 'stat', 'sixth', { metric: 'runs' }),
            w('o-success', 'stat', 'sixth', { metric: 'success' }),
            w('o-failures', 'stat', 'sixth', { metric: 'failures' }),
            w('o-queue', 'stat', 'sixth', { metric: 'queue' }),
            w('o-latency', 'stat', 'sixth', { metric: 'latency' }),
            w('o-cpu', 'gauge', 'sixth', { metric: 'cpu' }),
            w('o-trend', 'trend', 'two-thirds', { metric: 'runs', compare: 'failures', style: 'area' }),
            w('o-note', 'note', 'third', { text: WELCOME }, 'Read me'),
            w('o-runs-table', 'runs', 'half', { rows: 6 }),
            w('o-activity', 'activity', 'half', { rows: 8 }),
            w('o-bars', 'bars', 'third', { group: 'job' }),
            w('o-upcoming', 'upcoming', 'third', { rows: 6 }),
            w('o-oncall', 'oncall', 'third', { showNext: true }),
        ],
    },
    {
        id: 'operations',
        name: 'Operations',
        widgets: [
            w('p-latency', 'stat', 'quarter', { metric: 'latency' }),
            w('p-cpu', 'gauge', 'quarter', { metric: 'cpu' }),
            w('p-memory', 'gauge', 'quarter', { metric: 'memory' }),
            w('p-queue', 'stat', 'quarter', { metric: 'queue' }),
            w('p-map', 'map', 'two-thirds'),
            w('p-uptime', 'uptime', 'third'),
            w('p-trend', 'trend', 'half', { metric: 'latency', compare: 'none', style: 'line' }),
            w('p-queue-trend', 'trend', 'half', { metric: 'queue', compare: 'none', style: 'area' }),
            w('p-log', 'log', 'two-thirds', { service: 'worker' }),
            w('p-failed', 'runs', 'third', { rows: 6, failedOnly: true }, 'Recent failures'),
        ],
    },
    {
        id: 'team',
        name: 'Team',
        widgets: [
            w('t-oncall', 'oncall', 'third', { showNext: true }),
            w('t-todo', 'todo', 'third', { hideDone: false }, 'This week'),
            w('t-upcoming', 'upcoming', 'third', { rows: 6 }),
            w('t-people', 'bars', 'half', { group: 'person' }, 'Runs started by person'),
            w('t-projects', 'projects', 'half'),
            w('t-activity', 'activity', 'two-thirds', { rows: 10 }),
            w(
                't-note',
                'note',
                'third',
                {
                    text: `### Hand-over

The person on call keeps an eye on **Recent failures** and hands over at 09:00.

1. Read the log of the worker
2. Retry what failed overnight
3. Write down what is left here`,
                },
                'On-call notes',
            ),
        ],
    },
]

/** The to-dos the team dashboard starts with. */
export const SEED_TODOS: Omit<Todo, 'created'>[] = [
    { id: 'todo-1', widget: 't-todo', text: 'Move nightly-export to the new worker', done: false },
    { id: 'todo-2', widget: 't-todo', text: 'Review the larkspur sync schedule with grace', done: false },
    { id: 'todo-3', widget: 't-todo', text: 'Rotate the api keys for harbor', done: true },
    { id: 'todo-4', widget: 't-todo', text: 'Write up why rebuild-index was slow on Monday', done: false },
]

/** What each palette entry adds: its kind, its width and its options. */
export interface PaletteEntry {
    id: string
    label: string
    kind: WidgetKind
    span: PanelSpan
    options: WidgetOptions
}

export const PALETTE: PaletteEntry[] = [
    { id: 'stat', label: 'Stat', kind: 'stat', span: 'sixth', options: { metric: 'runs' } },
    { id: 'line', label: 'Line chart', kind: 'trend', span: 'half', options: { metric: 'latency', compare: 'none', style: 'line' } },
    { id: 'area', label: 'Area chart', kind: 'trend', span: 'half', options: { metric: 'runs', compare: 'failures', style: 'area' } },
    { id: 'bar', label: 'Bar chart', kind: 'bars', span: 'third', options: { group: 'job' } },
    { id: 'gauge', label: 'Gauge', kind: 'gauge', span: 'sixth', options: { metric: 'cpu' } },
    { id: 'runs', label: 'Recent runs', kind: 'runs', span: 'half', options: { rows: 6 } },
    { id: 'activity', label: 'Activity', kind: 'activity', span: 'third', options: { rows: 8 } },
    { id: 'log', label: 'Log', kind: 'log', span: 'half', options: { service: 'api' } },
    { id: 'map', label: 'Sites map', kind: 'map', span: 'half', options: {} },
    { id: 'note', label: 'Note', kind: 'note', span: 'third', options: { text: 'A note for the team, in **markdown**.' } },
    { id: 'todo', label: 'To-do list', kind: 'todo', span: 'third', options: { hideDone: false } },
    { id: 'upcoming', label: 'Upcoming', kind: 'upcoming', span: 'third', options: { rows: 6 } },
    { id: 'uptime', label: 'Uptime', kind: 'uptime', span: 'third', options: {} },
    { id: 'oncall', label: 'On call', kind: 'oncall', span: 'third', options: { showNext: true } },
    { id: 'projects', label: 'Projects', kind: 'projects', span: 'third', options: {} },
]

/** Whether two widgets are the same in every way a person can edit. */
export const sameWidget = (left: Widget, right: Widget) => JSON.stringify(left) === JSON.stringify(right)

/** A copy of widgets under fresh ids, and which new id each old one took. */
export function copyWidgets(widgets: readonly Widget[]): { widgets: Widget[]; ids: Map<string, string> } {
    const ids = new Map<string, string>()
    const copied = widgets.map((widget) => {
        const id = widgetId(widget.kind)
        ids.set(widget.id, id)
        return { ...widget, id, options: { ...widget.options } }
    })
    return { widgets: copied, ids }
}
