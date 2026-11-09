import { collection } from 'tidevann-shared/backend'

import { type Dashboard, panel } from './model'
import { readNow, type Zone } from './query'
import type { Aggregation, Label, MetricId } from './source'

const GOOD_LOW = (warning: number, critical: number) => [
    { color: 'good' },
    { value: warning, color: 'warning' },
    { value: critical, color: 'critical' },
]

/** The demo's dashboards, each panel under an id of its place, so a link to one holds before anything is saved. */
function seedDashboards(): Dashboard[] {
    return seededDashboards().map((board) => ({
        ...board,
        panels: board.panels.map((one, index) => ({ ...one, id: `${board.id}-${String(index + 1)}` })),
    }))
}

function seededDashboards(): Dashboard[] {
    return [
        {
            id: 'services',
            title: 'Services overview',
            description: 'Requests, errors and latency across the api, the workers and the scheduler.',
            panels: [
                panel({ title: 'Requests', kind: 'stat', metric: 'requests', aggregation: 'sum', decimals: 0, color: 'chart-2' }),
                panel({
                    title: 'Error rate',
                    kind: 'stat',
                    metric: 'errors',
                    aggregation: 'avg',
                    thresholds: GOOD_LOW(1, 3),
                    colorMode: 'background',
                }),
                panel({
                    title: 'api p95',
                    kind: 'stat',
                    metric: 'latency_p95',
                    filter: { service: 'api' },
                    thresholds: GOOD_LOW(200, 300),
                }),
                panel({
                    title: 'Queue depth',
                    kind: 'stat',
                    metric: 'queue_depth',
                    aggregation: 'sum',
                    thresholds: GOOD_LOW(90, 130),
                }),
                panel({ title: 'api CPU', kind: 'gauge', metric: 'cpu', filter: { service: 'api' }, thresholds: GOOD_LOW(70, 85) }),
                panel({
                    title: 'Worker CPU',
                    kind: 'gauge',
                    metric: 'cpu',
                    filter: { service: 'worker' },
                    thresholds: GOOD_LOW(70, 85),
                }),
                panel({
                    title: 'Requests by service',
                    kind: 'timeseries',
                    metric: 'requests',
                    aggregation: 'sum',
                    groupBy: 'service',
                    stacked: true,
                    span: 'half',
                }),
                panel({
                    title: 'Latency p95 by service',
                    kind: 'timeseries',
                    metric: 'latency_p95',
                    groupBy: 'service',
                    fill: 'none',
                    thresholds: [{ color: 'good' }, { value: 250, color: 'critical' }],
                    span: 'half',
                }),
                panel({
                    title: 'Error rate by service',
                    kind: 'timeseries',
                    metric: 'errors',
                    groupBy: 'service',
                    thresholds: [{ color: 'good' }, { value: 3, color: 'critical' }],
                    span: 'third',
                }),
                panel({
                    title: 'CPU by host',
                    kind: 'bargauge',
                    metric: 'cpu',
                    groupBy: 'host',
                    thresholds: GOOD_LOW(70, 85),
                    span: 'third',
                }),
                panel({
                    title: 'Requests by project',
                    kind: 'bar',
                    metric: 'requests',
                    aggregation: 'sum',
                    groupBy: 'project',
                    stacked: true,
                    span: 'third',
                }),
                panel({
                    title: 'Latency p95 by host',
                    kind: 'heatmap',
                    metric: 'latency_p95',
                    groupBy: 'host',
                    thresholds: [{ color: 'chart-2' }, { value: 150, color: 'warning' }, { value: 250, color: 'critical' }],
                    span: 'half',
                }),
                panel({
                    title: 'Hosts by p95',
                    kind: 'table',
                    metric: 'latency_p95',
                    groupBy: 'host',
                    thresholds: GOOD_LOW(200, 300),
                    span: 'half',
                }),
                panel({ title: 'Logs', kind: 'logs', metric: 'requests', span: 'full' }),
            ],
        },
        {
            id: 'workers',
            title: 'Workers',
            description: 'The workers’ queue, load and memory, and what they log.',
            panels: [
                panel({
                    title: 'Queue depth',
                    kind: 'stat',
                    metric: 'queue_depth',
                    aggregation: 'sum',
                    thresholds: GOOD_LOW(90, 130),
                    colorMode: 'background',
                }),
                panel({ title: 'Mean run', kind: 'stat', metric: 'job_duration', reduce: 'mean', color: 'chart-3' }),
                panel({ title: 'CPU', kind: 'gauge', metric: 'cpu', filter: { service: 'worker' }, thresholds: GOOD_LOW(70, 85) }),
                panel({
                    title: 'Memory',
                    kind: 'gauge',
                    metric: 'memory',
                    decimals: 1,
                    filter: { service: 'worker' },
                    min: 0,
                    max: 4,
                    thresholds: GOOD_LOW(3, 3.5),
                }),
                panel({
                    title: 'Memory by host',
                    kind: 'bargauge',
                    metric: 'memory',
                    groupBy: 'host',
                    filter: { service: 'worker' },
                    min: 0,
                    max: 4,
                    thresholds: GOOD_LOW(3, 3.5),
                    span: 'third',
                }),
                panel({
                    title: 'Queue depth by host',
                    kind: 'timeseries',
                    metric: 'queue_depth',
                    aggregation: 'sum',
                    groupBy: 'host',
                    stacked: true,
                    fill: 'solid',
                    span: 'half',
                }),
                panel({
                    title: 'CPU by host',
                    kind: 'timeseries',
                    metric: 'cpu',
                    groupBy: 'host',
                    filter: { service: 'worker' },
                    fill: 'none',
                    thresholds: [{ color: 'good' }, { value: 85, color: 'critical' }],
                    span: 'half',
                }),
                panel({
                    title: 'CPU heat',
                    kind: 'heatmap',
                    metric: 'cpu',
                    groupBy: 'host',
                    filter: { service: 'worker' },
                    thresholds: [{ color: 'chart-2' }, { value: 70, color: 'warning' }, { value: 85, color: 'critical' }],
                    span: 'half',
                }),
                panel({ title: 'Worker logs', kind: 'logs', metric: 'requests', filter: { service: 'worker' }, span: 'half' }),
            ],
        },
        {
            id: 'jobs',
            title: 'Jobs',
            description: 'How long each job’s runs take, and how many runs wait for a slot.',
            panels: [
                panel({
                    title: 'Slowest run',
                    kind: 'stat',
                    metric: 'job_duration',
                    aggregation: 'max',
                    reduce: 'max',
                    thresholds: GOOD_LOW(120, 160),
                }),
                panel({ title: 'Mean run', kind: 'stat', metric: 'job_duration', reduce: 'mean', color: 'chart-3' }),
                panel({ title: 'Waiting', kind: 'stat', metric: 'queue_depth', aggregation: 'sum', color: 'chart-4' }),
                panel({
                    title: 'Worker errors',
                    kind: 'stat',
                    metric: 'errors',
                    filter: { service: 'worker' },
                    thresholds: GOOD_LOW(0.5, 1),
                    colorMode: 'background',
                }),
                panel({
                    title: 'Duration by job',
                    kind: 'timeseries',
                    metric: 'job_duration',
                    groupBy: 'job',
                    fill: 'none',
                    span: 'two-thirds',
                }),
                panel({
                    title: 'Mean by job',
                    kind: 'bargauge',
                    metric: 'job_duration',
                    groupBy: 'job',
                    reduce: 'mean',
                    min: 0,
                    max: 150,
                    thresholds: GOOD_LOW(60, 120),
                    span: 'third',
                }),
                panel({
                    title: 'Queue by project',
                    kind: 'bar',
                    metric: 'queue_depth',
                    aggregation: 'sum',
                    groupBy: 'project',
                    stacked: true,
                    span: 'half',
                }),
                panel({
                    title: 'Jobs',
                    kind: 'table',
                    metric: 'job_duration',
                    groupBy: 'job',
                    thresholds: GOOD_LOW(60, 120),
                    span: 'half',
                }),
            ],
        },
    ]
}

export const dashboards = collection<Dashboard>('metrics-dashboards', seedDashboards)

/** An alert rule: a metric's value against a threshold, held for a while before it fires. */
export interface AlertRule {
    id: string
    name: string
    metric: MetricId
    aggregation: Aggregation
    filter: Partial<Record<Label, string>>
    condition: 'above' | 'below'
    threshold: number
    /** How long the value must cross the threshold before the rule fires, in seconds. */
    forSeconds: number
    severity: 'critical' | 'warning'
    enabled: boolean
}

function seedRules(): AlertRule[] {
    return [
        {
            id: 'rule-latency',
            name: 'api latency high',
            metric: 'latency_p95',
            aggregation: 'avg',
            filter: { service: 'api' },
            condition: 'above',
            threshold: 220,
            forSeconds: 15,
            severity: 'critical',
            enabled: true,
        },
        {
            id: 'rule-errors',
            name: 'api errors above 2%',
            metric: 'errors',
            aggregation: 'avg',
            filter: { service: 'api' },
            condition: 'above',
            threshold: 2,
            forSeconds: 10,
            severity: 'critical',
            enabled: true,
        },
        {
            id: 'rule-queue',
            name: 'Queue backing up',
            metric: 'queue_depth',
            aggregation: 'sum',
            filter: {},
            condition: 'above',
            threshold: 110,
            forSeconds: 30,
            severity: 'warning',
            enabled: true,
        },
        {
            id: 'rule-worker-cpu',
            name: 'Worker CPU hot',
            metric: 'cpu',
            aggregation: 'max',
            filter: { service: 'worker' },
            condition: 'above',
            threshold: 90,
            forSeconds: 20,
            severity: 'warning',
            enabled: true,
        },
        {
            id: 'rule-requests-low',
            name: 'Requests dropped',
            metric: 'requests',
            aggregation: 'sum',
            filter: { service: 'api' },
            condition: 'below',
            threshold: 120,
            forSeconds: 60,
            severity: 'warning',
            enabled: false,
        },
    ]
}

export const rules = collection<AlertRule>('metrics-rules', seedRules)

/** A rule that fired: when, at what value, and when it resolved, if it has. */
export interface AlertEvent {
    id: string
    rule: string
    name: string
    severity: AlertRule['severity']
    metric: MetricId
    /** The value when it fired. */
    value: number
    firedAt: number
    resolvedAt: number | null
}

/** Whether a value crosses a rule's threshold. */
export const crosses = (rule: AlertRule, value: number | null) =>
    value !== null && (rule.condition === 'above' ? value > rule.threshold : value < rule.threshold)

/** Where a rule would have fired and resolved between two seconds, read every `step` seconds. */
export function firings(rule: AlertRule, from: number, to: number, step = 5): Omit<AlertEvent, 'id'>[] {
    const found: Omit<AlertEvent, 'id'>[] = []
    let since: number | null = null
    let open: Omit<AlertEvent, 'id'> | null = null
    for (let second = from; second <= to; second += step) {
        const value = readNow({ ...rule, filters: [rule.filter] }, second)
        if (crosses(rule, value)) {
            since ??= second
            if (open === null && second - since >= rule.forSeconds) {
                open = {
                    rule: rule.id,
                    name: rule.name,
                    severity: rule.severity,
                    metric: rule.metric,
                    value: value ?? 0,
                    firedAt: second,
                    resolvedAt: null,
                }
                found.push(open)
            }
        } else {
            since = null
            if (open !== null) open.resolvedAt = second
            open = null
        }
    }
    // One still open at the end is left to the live evaluator, which picks it up.
    return found.filter((event) => event.resolvedAt !== null)
}

function seedEvents(): AlertEvent[] {
    const now = Math.floor(Date.now() / 1000)
    return seedRules()
        .filter((rule) => rule.enabled)
        .flatMap((rule) => firings(rule, now - 6 * 3600, now - 60))
        .sort((left, right) => right.firedAt - left.firedAt)
        .map((event, index) => ({ ...event, id: `event-seed-${String(index + 1)}` }))
}

export const events = collection<AlertEvent>('metrics-events', seedEvents)

/** The app's preferences, one row. */
export interface Preferences {
    id: string
    /** The range a dashboard opens on when its link names none. */
    range: string
    /** The refresh a dashboard opens on when its link names none, in seconds. */
    refresh: number
    zone: Zone
    /** Whether the rules are evaluated at all. */
    evaluate: boolean
    /** Whether a rule that fires says so in a toast. */
    notify: boolean
    /** How long fired alerts are kept, in seconds. */
    keep: number
}

export const DEFAULT_PREFERENCES: Preferences = {
    id: 'preferences',
    range: '15m',
    refresh: 5,
    zone: 'local',
    evaluate: true,
    notify: true,
    keep: 24 * 3600,
}

export const preferences = collection<Preferences>('metrics-preferences', () => [DEFAULT_PREFERENCES])
