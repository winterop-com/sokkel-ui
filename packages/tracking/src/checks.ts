/**
 * Server health checks as data. A check is a plain object: which path to request, what to expect of
 * the answer (its status, text in its body, values in its JSON) and how to judge how long it took.
 * The app performs the request and hands what came back to `evaluateCheck`, which says whether the
 * server is up, degraded or down, and why. A status monitor then holds a status steady over a run of
 * results, so an app raises an alert when the status changes and not at every slow answer, and gives
 * the uptime and the latency over a window.
 *
 * A kind names the checks a kind of server takes; `HTTP_KIND` is any server that answers over HTTP,
 * and a domain add-on gives its own. Times are milliseconds: instants since the epoch, the rest spans.
 */
import type { WordsPart } from '@winterop-com/sokkel-ui/lib/words'

/** A value JSON holds that is not an object or a list. */
export type JsonScalar = string | number | boolean | null

/** HTTP statuses from one to another, both included. */
export interface StatusRange {
    from: number
    to: number
}

/** What a value in the JSON body must be. */
export interface JsonExpectation {
    /** The path to the value: keys apart by dots, a place in a list in brackets (`databaseInfo.name`, `features[0].id`). */
    path: string
    /** What the value must equal. With neither this nor `matches`, the value must only be there. */
    equals?: JsonScalar
    /** A regular expression the value, written as text, must match. */
    matches?: string
}

/** What an answer must be for its check to pass. */
export interface CheckExpectation {
    /** The statuses that pass: one, a range, or several of either; 200 to 299 unless given. */
    status?: number | StatusRange | readonly (number | StatusRange)[]
    /** Text the body must hold. */
    body?: string
    /** Values the JSON body must hold, every one of them. */
    json?: readonly JsonExpectation[]
}

/** How an answer's latency is judged. */
export interface LatencyRule {
    /** An answer slower than this many milliseconds leaves the server degraded. */
    degraded?: number
    /** An answer slower than this many milliseconds counts as none: the server is down. An app stops waiting here. */
    down?: number
}

/** One request to a server and what its answer must be. */
export interface Check {
    /** Unique among a server's checks. */
    id: string
    /** What a list writes for it. */
    label: string
    /** The path to request under the server's base URL; empty for the base URL itself. */
    path: string
    /** `GET` unless given. */
    method?: 'GET' | 'HEAD'
    /** Headers the request carries. */
    headers?: Readonly<Record<string, string>>
    /** Whether the request is sent with the credentials the app holds for the server. */
    credentials?: boolean
    expect?: CheckExpectation
    latency?: LatencyRule
    /** Values read from the JSON body to show beside the result, each by the path to it: `{ version: 'version' }`. */
    capture?: Readonly<Record<string, string>>
}

/** What came back from a check's request, as the app hands it over. */
export interface CheckResponse {
    /** When the request was made, in milliseconds since the epoch. */
    at: number
    /** The HTTP status; left out when no answer came. */
    status?: number
    /** The body as text. */
    body?: string
    /** The body as JSON, where the app has read it already; read from `body` otherwise. */
    json?: unknown
    /** How long the answer took, in milliseconds. */
    latency?: number
    /** Why no answer came: a refused connection, a name that did not resolve, a timeout. */
    error?: string
}

/** How a server stands; `unknown` before enough is known. */
export type CheckStatus = 'up' | 'degraded' | 'down' | 'unknown'

/** Every status, from the best. */
export const CHECK_STATUSES: readonly CheckStatus[] = ['up', 'degraded', 'down', 'unknown']

/** Which part of a check an answer failed. */
export type CheckFailureReason = 'unreachable' | 'status' | 'body' | 'json' | 'latency'

/** Why a check did not pass. */
export interface CheckFailure {
    reason: CheckFailureReason
    /** What the check expected, as text. */
    expected?: string
    /** What came in its place, as text. */
    actual?: string
    /** The path of the JSON value, for a value that was wrong. */
    path?: string
}

/** One observation of a server: how it stood at a time, and how long its answer took. */
export interface Observation {
    status: Exclude<CheckStatus, 'unknown'>
    /** In milliseconds since the epoch. */
    at: number
    /** In milliseconds. */
    latency?: number
}

/** What a check found in one answer. */
export interface CheckResult extends Observation {
    /** The check's id. */
    check: string
    /** The HTTP status that came. */
    httpStatus?: number
    /** Why it is not up; left out when it is. */
    failure?: CheckFailure
    /** The values the check captured from the body, by name. */
    values?: Record<string, JsonScalar>
}

export interface CheckWords {
    statuses: Record<CheckStatus, string>
    reasons: Record<CheckFailureReason, string>
    /** The generic HTTP check's label. */
    answers: string
}

export const CHECK_WORDS: CheckWords = {
    statuses: { up: 'Up', degraded: 'Degraded', down: 'Down', unknown: 'Unknown' },
    reasons: {
        unreachable: 'No answer',
        status: 'Unexpected status',
        body: 'Unexpected body',
        json: 'Unexpected value',
        latency: 'Slow answer',
    },
    answers: 'Answers',
}

export const CHECK_PART: WordsPart<CheckWords> = { id: 'check', words: CHECK_WORDS }

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const scalar = (value: unknown): value is JsonScalar =>
    value === null || typeof value === 'string' || typeof value === 'boolean' || finite(value)

/** The statuses a check passes on when it names none. */
export const OK_STATUSES: StatusRange = { from: 200, to: 299 }

const ranges = (status: CheckExpectation['status']): (number | StatusRange)[] =>
    status === undefined ? [OK_STATUSES] : typeof status === 'number' || 'from' in status ? [status] : [...status]

/** Whether an HTTP status is one a check passes on. */
export function statusPasses(status: number, expected?: CheckExpectation['status']): boolean {
    return ranges(expected).some((range) => (typeof range === 'number' ? status === range : status >= range.from && status <= range.to))
}

/** The statuses a check passes on as text: `200-299`, `200, 204`. */
const statusText = (expected: CheckExpectation['status']): string =>
    ranges(expected)
        .map((range) => (typeof range === 'number' ? String(range) : `${String(range.from)}-${String(range.to)}`))
        .join(', ')

/**
 * The value at a path in a JSON value: keys apart by dots, a place in a list in brackets or as a key
 * (`databaseInfo.name`, `features[0].id`, `features.0.id`), a leading `$` allowed. Undefined when the
 * path leads nowhere.
 */
export function readPath(value: unknown, path: string): unknown {
    let at: unknown = value
    for (const key of path.replace(/^\$/, '').match(/[^.[\]]+/g) ?? []) {
        if (Array.isArray(at)) {
            if (!/^\d+$/.test(key)) return undefined
            at = at[Number(key)]
        } else if (typeof at === 'object' && at !== null && Object.hasOwn(at, key)) at = (at as Record<string, unknown>)[key]
        else return undefined
    }
    return at
}

/** A value as a failure says it. */
const written = (value: unknown): string => (value === undefined ? 'nothing' : typeof value === 'string' ? value : JSON.stringify(value))

/** The JSON of a response: what the app read, or its body read here; undefined when the body is not JSON. */
function jsonOf(response: CheckResponse): unknown {
    if (response.json !== undefined) return response.json
    if (typeof response.body !== 'string') return undefined
    try {
        return JSON.parse(response.body) as unknown
    } catch {
        return undefined
    }
}

/** The first JSON expectation an answer does not meet. */
function jsonFailure(expectations: readonly JsonExpectation[], json: unknown): CheckFailure | undefined {
    for (const { path, equals, matches } of expectations) {
        const value = readPath(json, path)
        if (equals !== undefined) {
            if (value !== equals) return { reason: 'json', path, expected: written(equals), actual: written(value) }
            continue
        }
        if (matches !== undefined) {
            let pattern: RegExp | undefined
            try {
                pattern = new RegExp(matches)
            } catch {
                pattern = undefined
            }
            if (pattern === undefined || !scalar(value) || !pattern.test(String(value)))
                return { reason: 'json', path, expected: `/${matches}/`, actual: written(value) }
            continue
        }
        if (value === undefined) return { reason: 'json', path, actual: written(value) }
    }
    return undefined
}

/**
 * What a check finds in the answer to its request. No answer, a status the check does not pass on,
 * a body without its text or a JSON value that is wrong leaves the server down, as does an answer
 * slower than the check's `latency.down`; one slower than `latency.degraded` leaves it degraded.
 */
export function evaluateCheck(check: Check, response: CheckResponse): CheckResult {
    const result: CheckResult = { check: check.id, status: 'up', at: response.at }
    if (finite(response.latency)) result.latency = response.latency
    const fail = (status: 'degraded' | 'down', failure: CheckFailure): CheckResult => ({ ...result, status, failure })
    if (!finite(response.status)) {
        const failure: CheckFailure = { reason: 'unreachable' }
        if (response.error !== undefined && response.error !== '') failure.actual = response.error
        return fail('down', failure)
    }
    result.httpStatus = response.status
    const expect = check.expect ?? {}
    if (!statusPasses(response.status, expect.status))
        return fail('down', { reason: 'status', expected: statusText(expect.status), actual: String(response.status) })
    if (expect.body !== undefined && !(response.body ?? '').includes(expect.body))
        return fail('down', { reason: 'body', expected: expect.body })
    const reads = (expect.json?.length ?? 0) > 0 || check.capture !== undefined
    const json = reads ? jsonOf(response) : undefined
    const wrong = jsonFailure(expect.json ?? [], json)
    if (wrong !== undefined) return fail('down', wrong)
    const values = Object.entries(check.capture ?? {})
        .map(([name, path]) => [name, readPath(json, path)] as const)
        .filter((entry): entry is readonly [string, JsonScalar] => scalar(entry[1]))
    if (values.length > 0) result.values = Object.fromEntries(values)
    const { degraded, down } = check.latency ?? {}
    if (finite(response.latency)) {
        if (finite(down) && response.latency > down)
            return fail('down', { reason: 'latency', expected: `${String(down)} ms`, actual: `${String(Math.round(response.latency))} ms` })
        if (finite(degraded) && response.latency > degraded)
            return fail('degraded', {
                reason: 'latency',
                expected: `${String(degraded)} ms`,
                actual: `${String(Math.round(response.latency))} ms`,
            })
    }
    return result
}

/** The URL a check requests: its path under the server's base URL, whatever slashes either ends or starts with. */
export function checkUrl(base: string, check: Pick<Check, 'path'> | string): string {
    const path = typeof check === 'string' ? check : check.path
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path
    const root = base.replace(/\/+$/, '')
    if (path === '') return root
    return path.startsWith('?') || path.startsWith('#') ? `${root}${path}` : `${root}/${path.replace(/^\/+/, '')}`
}

/** How bad each status is; what is not known yet stands between up and degraded. */
const BADNESS: Readonly<Record<CheckStatus, number>> = { up: 0, unknown: 1, degraded: 2, down: 3 }

/** The worst of several statuses, as a server with several checks stands; `unknown` for none. */
export function worstStatus(statuses: readonly CheckStatus[]): CheckStatus {
    return (
        statuses.reduce<CheckStatus | undefined>(
            (worst, status) => (worst === undefined || BADNESS[status] > BADNESS[worst] ? status : worst),
            undefined,
        ) ?? 'unknown'
    )
}

/**
 * Several observations made together as one: the worst status, the latest time and the slowest
 * answer. One round of a server's checks is one observation for its monitor. Undefined for none.
 */
export function combineResults(results: readonly Observation[]): Observation | undefined {
    if (results.length === 0) return undefined
    const combined: Observation = {
        status: worstStatus(results.map((result) => result.status)) as Observation['status'],
        at: Math.max(...results.map((result) => result.at)),
    }
    const latencies = results.map((result) => result.latency).filter(finite)
    if (latencies.length > 0) combined.latency = Math.max(...latencies)
    return combined
}

/** How long the generic check waits before an answer is slow, and before it is none. */
export const DEFAULT_LATENCY: Readonly<Required<LatencyRule>> = { degraded: 1000, down: 10_000 }

export interface HttpCheckOptions extends Partial<Omit<Check, 'expect'>>, CheckExpectation {}

/**
 * A check of any server that answers over HTTP: its base URL, or the path given, answering with a
 * status from 200 to 399 unless told otherwise, slow past a second and down past ten.
 */
export function httpCheck(options: HttpCheckOptions = {}): Check {
    const { status, body, json, ...rest } = options
    const expect: CheckExpectation = { status: status ?? { from: 200, to: 399 } }
    if (body !== undefined) expect.body = body
    if (json !== undefined) expect.json = json
    return { id: 'http', label: CHECK_WORDS.answers, path: '', latency: DEFAULT_LATENCY, ...rest, expect }
}

export interface CheckKindOptions {
    /** Whether the app holds credentials for the server, so the checks that need them can run. */
    credentials?: boolean
}

/** A kind of server: what a list of kinds offers, and the checks a server of the kind takes. */
export interface CheckKind {
    id: string
    label: string
    checks: (options?: CheckKindOptions) => Check[]
}

/** Any server that answers over HTTP. */
export const HTTP_KIND: CheckKind = { id: 'http', label: 'HTTP', checks: () => [httpCheck()] }

/** A server to watch, as an app keeps one and a quick-add list offers one. */
export interface CheckTarget {
    id: string
    label: string
    /** The id of its kind. */
    kind: string
    /** Its base URL. */
    url: string
}

/** A change of status, to raise an alert on. */
export interface StatusChange {
    from: CheckStatus
    to: CheckStatus
    /** When the observation that settled it was made, in milliseconds since the epoch. */
    at: number
}

/** What a monitor holds: plain data an app can keep and start a monitor from again. */
export interface StatusState {
    status: CheckStatus
    /** When the status was taken, in milliseconds since the epoch. */
    since?: number
    /** The observations kept, oldest first. */
    observations: Observation[]
}

/** How long answers took over a window, in milliseconds. */
export interface LatencySummary {
    mean: number
    median: number
    /** The latency 95 answers in a hundred were as fast as. */
    p95: number
    min: number
    max: number
}

/** How a server has stood over a window. */
export interface StatusSummary {
    status: CheckStatus
    /** When the status was taken, in milliseconds since the epoch. */
    since?: number
    /** The latest observation, as it was made. */
    last?: Observation
    /** How many observations the window holds. */
    count: number
    /** The share of the window's observations that were not down, from 0 to 1; left out for an empty window. */
    uptime?: number
    /** Over the window's observations that carry a latency; left out when none does. */
    latency?: LatencySummary
}

export interface StatusMonitorOptions {
    /** How many observations in a row must be worse than the status before it worsens; 3 by default. */
    failures?: number
    /** How many observations in a row must be better than the status before it improves; 1 by default. */
    recoveries?: number
    /** The window the uptime and the latency are worked out over, in milliseconds; an hour by default. */
    window?: number
    /** A state kept from before, to go on from. */
    initial?: StatusState
}

export interface StatusMonitor {
    /**
     * Takes one observation, in the order they were made, and gives the change when it settles a new
     * status; undefined while the status holds.
     */
    push(observation: Observation): StatusChange | undefined
    status(): CheckStatus
    /** How the server has stood over the window that ends at `now`, the latest observation's time by default. */
    summary(now?: number): StatusSummary
    /** What the monitor holds, as plain data. */
    state(): StatusState
    /** Forgets every observation; the status is `unknown` again. */
    clear(): void
}

/** How many of the latest observations in a row a test holds for. */
function run(observations: readonly Observation[], holds: (status: Observation['status']) => boolean): number {
    let count = 0
    for (let index = observations.length - 1; index >= 0 && holds(observations[index].status); index -= 1) count += 1
    return count
}

/** The value a share of the sorted values are no greater than, by the nearest rank. */
const rank = (sorted: readonly number[], share: number): number => sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)]

/**
 * A monitor of one server, or of one of its checks: it takes each observation and holds a status
 * steady across them. The status turns `down` after `failures` observations in a row that were down,
 * `degraded` after as many that were not up, and improves after `recoveries` in a row that were
 * better, so one slow or lost answer raises no alert and one good answer ends one.
 */
export function createStatusMonitor(options: StatusMonitorOptions = {}): StatusMonitor {
    const failures = Math.max(1, Math.floor(options.failures ?? 3))
    const recoveries = Math.max(1, Math.floor(options.recoveries ?? 1))
    const window = Math.max(0, options.window ?? 3_600_000)
    // The runs are counted over the latest observations, which are kept even when the window has passed them.
    const fewest = Math.max(failures, recoveries)
    let status: CheckStatus = options.initial?.status ?? 'unknown'
    let since = options.initial?.since
    let observations: Observation[] = (options.initial?.observations ?? []).map((observation) => ({ ...observation }))

    const settled = (): CheckStatus => {
        if (run(observations, (each) => each === 'down') >= failures) return 'down'
        if (run(observations, (each) => each === 'up') >= recoveries) return 'up'
        if (status === 'down') return run(observations, (each) => each !== 'down') >= recoveries ? 'degraded' : 'down'
        return run(observations, (each) => each !== 'up') >= failures ? 'degraded' : status
    }

    return {
        push(observation) {
            // Only what an observation is, so a check's result leaves its failure and its values behind.
            const kept: Observation = { status: observation.status, at: observation.at }
            if (finite(observation.latency)) kept.latency = observation.latency
            observations.push(kept)
            const oldest = observation.at - window
            const firstKept = observations.findIndex((each) => each.at > oldest)
            const drop = Math.min(firstKept === -1 ? observations.length : firstKept, Math.max(0, observations.length - fewest))
            if (drop > 0) observations = observations.slice(drop)
            const next = settled()
            if (next === status) return undefined
            const change: StatusChange = { from: status, to: next, at: observation.at }
            status = next
            since = observation.at
            return change
        },
        status: () => status,
        summary(now) {
            const last = observations[observations.length - 1]
            const end = now ?? last?.at
            const summary: StatusSummary = { status, count: 0 }
            if (since !== undefined) summary.since = since
            if (last !== undefined) summary.last = { ...last }
            if (end === undefined) return summary
            const within = observations.filter((each) => each.at > end - window && each.at <= end)
            summary.count = within.length
            if (within.length === 0) return summary
            summary.uptime = within.filter((each) => each.status !== 'down').length / within.length
            const latencies = within
                .map((each) => each.latency)
                .filter(finite)
                .sort((a, b) => a - b)
            if (latencies.length > 0)
                summary.latency = {
                    mean: latencies.reduce((sum, each) => sum + each, 0) / latencies.length,
                    median: rank(latencies, 0.5),
                    p95: rank(latencies, 0.95),
                    min: latencies[0],
                    max: latencies[latencies.length - 1],
                }
            return summary
        },
        state: () => {
            const state: StatusState = { status, observations: observations.map((observation) => ({ ...observation })) }
            if (since !== undefined) state.since = since
            return state
        },
        clear() {
            observations = []
            status = 'unknown'
            since = undefined
        },
    }
}
