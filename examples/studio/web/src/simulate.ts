/**
 * Runs a pipeline on the simulated backend: each step in turn, after the steps it needs, its
 * outcome decided by its settings so the same pipeline always ends the same way, and the run kept
 * in the runs collection as it goes, with its log.
 */

import { runs as runRows } from './backend'
import { ME, PROJECTS, type LogLine, type Project, type Run, type RunStepRecord, type WorkFile } from './model'
import { readPipeline, stepOrder, type StepInfo } from './pipeline'

/** A number from a text, the same every time. */
function hash(text: string): number {
    let value = 2166136261
    for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0
    return value
}

/** How many rows each check refuses. */
const REFUSED: Record<string, number> = { email: 31, positive: 6, unique: 2, required: 0, date: 0 }

interface Outcome {
    ok: boolean
    rows?: number
    rejected?: number
    output?: string
    lines: { level: LogLine['level']; text: string }[]
    reason?: string
}

interface Done {
    rows?: number
    rejected?: number
    output?: string
}

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

/** What one try of a step does, from its settings and what the steps before it handed on. */
function attempt(step: StepInfo, fill: (text: string) => string, before: readonly Done[], project: Project | undefined): Outcome {
    const config = step.config
    const given = before.reduce<number | undefined>((rows, one) => one.rows ?? rows, undefined) ?? 0
    switch (step.kind) {
        case 'fetch': {
            const url = fill(asString(config.url))
            let host = ''
            try {
                host = new URL(url).hostname
            } catch {
                return { ok: false, lines: [{ level: 'error', text: `${url} is not an address` }], reason: `${url} is not an address.` }
            }
            if (host !== 'example.org' && !host.endsWith('.example.org'))
                return {
                    ok: false,
                    lines: [
                        { level: 'info', text: `GET ${url}` },
                        { level: 'error', text: `could not resolve ${host}` },
                    ],
                    reason: `Could not resolve ${host}.`,
                }
            const rows = 400 + (hash(url) % 2400)
            return {
                ok: true,
                rows,
                output: url,
                lines: [
                    { level: 'info', text: `GET ${url}` },
                    { level: 'info', text: `200 OK, ${asString(config.format, 'json')}, ${rows.toLocaleString('en-US')} rows` },
                ],
            }
        }
        case 'transform': {
            const script = asString(config.script)
            const language = asString(config.language, 'jq')
            if (script.includes('error('))
                return {
                    ok: false,
                    lines: [{ level: 'error', text: `${language}: the script raised an error on row 1` }],
                    reason: 'The script raised an error.',
                }
            const rows = Math.round(given * 0.97)
            return {
                ok: true,
                rows,
                lines: [
                    { level: 'info', text: `${language}: ${script.length > 60 ? `${script.slice(0, 57)}...` : script}` },
                    { level: 'info', text: `${given.toLocaleString('en-US')} rows in, ${rows.toLocaleString('en-US')} out` },
                ],
            }
        }
        case 'validate': {
            const rules = Array.isArray(config.rules) ? (config.rules as Record<string, unknown>[]) : []
            const lines: Outcome['lines'] = []
            let rejected = 0
            for (const rule of rules) {
                const refused = Math.min(given, REFUSED[asString(rule.check)] ?? 0)
                rejected += refused
                lines.push({
                    level: refused > 0 ? 'warn' : 'info',
                    text: `${asString(rule.check)} check on ${asString(rule.field)}: ${refused === 0 ? 'every row passes' : `${String(refused)} rows refused`}`,
                })
            }
            const onInvalid = asString(config.on_invalid, 'fail')
            const allowed = typeof config.max_rejected === 'number' ? config.max_rejected : 0
            if (onInvalid === 'fail' && rejected > allowed) {
                const reason = `${String(rejected)} rows refused, more than max_rejected (${String(allowed)}).`
                lines.push({ level: 'error', text: reason })
                return { ok: false, rejected, lines, reason }
            }
            const kept = onInvalid === 'skip' ? given - rejected : given
            lines.push({
                level: 'info',
                text:
                    rejected === 0
                        ? `${given.toLocaleString('en-US')} rows valid`
                        : onInvalid === 'skip'
                          ? `${String(rejected)} rows left out, ${kept.toLocaleString('en-US')} kept`
                          : `${String(rejected)} rows passed with a warning`,
            })
            return { ok: true, rows: kept, rejected, lines }
        }
        case 'upload': {
            const bucket = fill(asString(config.bucket))
            const path = fill(asString(config.path))
            if (project !== undefined && !bucket.startsWith(`${project}-`))
                return {
                    ok: false,
                    lines: [
                        { level: 'info', text: `PUT ${bucket}/${path}` },
                        { level: 'error', text: `403: ${project} cannot write to ${bucket}` },
                    ],
                    reason: `${project} cannot write to the bucket ${bucket}.`,
                }
            return {
                ok: true,
                rows: given,
                output: `${bucket}/${path}`,
                lines: [
                    { level: 'info', text: `PUT ${bucket}/${path}` },
                    { level: 'info', text: `wrote ${given.toLocaleString('en-US')} rows` },
                ],
            }
        }
        default:
            return { ok: true, rows: given, lines: [] }
    }
}

const timers = new Map<string, number>()

/** Stops a run that is going: the step running and those ahead are cancelled. */
export function cancelRun(run: Run): void {
    const timer = timers.get(run.id)
    if (timer === undefined) return
    window.clearTimeout(timer)
    timers.delete(run.id)
    const at = Date.now() - run.started
    void runRows.update(run.id, {
        state: 'cancelled',
        finished: Date.now(),
        steps: run.steps.map((step) => (step.state === 'running' || step.state === 'queued' ? { ...step, state: 'cancelled' } : step)),
        log: [...run.log, { at, step: null, level: 'warn', text: `cancelled by ${ME}` }],
    })
}

/**
 * Starts a run of a pipeline from its text (the editor's, saved or not) and answers with the run
 * as first stored; the run goes on by itself, step by step. Refuses a pipeline whose steps loop.
 */
export async function startRun(file: WorkFile, text: string, number: number, draft: boolean): Promise<Run> {
    const pipeline = readPipeline(text)
    const order = stepOrder(pipeline.steps)
    if (pipeline.broken || order === null) throw new Error('The pipeline does not read as YAML, or its steps loop.')
    const project = PROJECTS.find((one) => one === pipeline.project) ?? file.project
    const started = Date.now()
    const steps: RunStepRecord[] = order.map((step) => ({ id: step.id, kind: step.kind, needs: step.needs, state: 'queued' }))
    const first: Omit<Run, 'id'> = {
        number,
        file: file.id,
        pipeline: pipeline.name || file.name,
        project,
        state: 'running',
        started,
        by: ME,
        steps,
        log: [
            {
                at: 0,
                step: null,
                level: 'info',
                text: `run ${String(number)} of ${pipeline.name || file.name} started by ${ME}${draft ? ', from unsaved changes' : ''}`,
            },
        ],
        draft,
    }
    const run = await runRows.create(first)
    const results = new Map<string, Done>()
    const date = new Date(started).toISOString().slice(0, 10)
    const fill = (value: string) =>
        value.replace(/\$\{([^}]*)\}/g, (_, reference: string) => {
            const [root, name = '', field = ''] = reference.trim().split('.')
            if (root === 'params') return String(pipeline.params[name] ?? '')
            if (root === 'run') return { id: String(number), date, started: new Date(started).toISOString(), by: ME }[name] ?? ''
            if (root === 'steps') return String(results.get(name)?.[field as keyof Done] ?? '')
            return ''
        })

    let current = run
    const save = (patch: Partial<Omit<Run, 'id'>>) => {
        current = { ...current, ...patch }
        void runRows.update(run.id, patch)
    }
    const log = (step: string | null, level: LogLine['level'], text: string) => [
        ...current.log,
        { at: Date.now() - started, step, level, text },
    ]

    const next = (index: number) => {
        const step = order[index]
        if (step === undefined) {
            const failedStep = current.steps.find((one) => one.state === 'failed')
            timers.delete(run.id)
            save({
                state: failedStep === undefined ? 'succeeded' : 'failed',
                finished: Date.now(),
                log: log(
                    null,
                    failedStep === undefined ? 'info' : 'error',
                    failedStep === undefined ? 'run succeeded' : `run failed at ${failedStep.id}`,
                ),
            })
            return
        }
        const blocked =
            step.kind !== 'notify' && step.needs.some((need) => current.steps.find((one) => one.id === need)?.state !== 'succeeded')
        if (blocked) {
            save({
                steps: current.steps.map((one) => (one.id === step.id ? { ...one, state: 'skipped' } : one)),
                log: log(step.id, 'info', 'skipped: a step it needs did not succeed'),
            })
            next(index + 1)
            return
        }
        save({
            steps: current.steps.map((one) => (one.id === step.id ? { ...one, state: 'running' } : one)),
            log: log(step.id, 'info', `started${step.retries > 0 ? `, up to ${String(step.retries + 1)} tries` : ''}`),
        })
        const took = 500 + (hash(`${step.id}${step.kind}`) % 900)
        const begun = Date.now()
        timers.set(
            run.id,
            window.setTimeout(() => {
                let outcome: Outcome
                let lines = current.log
                if (step.kind === 'notify') {
                    const failedSoFar = current.steps.some((one) => one.state === 'failed')
                    const state = failedSoFar ? 'failed' : 'succeeded'
                    const on = Array.isArray(step.config.on) ? (step.config.on as string[]) : ['failed']
                    const channel = asString(step.config.channel)
                    const message = fill(asString(step.config.message, `${pipeline.name} ${state}`))
                    outcome = {
                        ok: true,
                        lines: on.includes(state)
                            ? [{ level: 'info', text: `posted to ${channel}: ${message}` }]
                            : [{ level: 'info', text: `nothing to post: the run ${state}, and on is ${on.join(', ')}` }],
                    }
                } else {
                    const before = step.needs.flatMap((need) => results.get(need) ?? [])
                    outcome = attempt(step, fill, before, project)
                    for (let tried = 1; !outcome.ok && tried <= step.retries; tried += 1) {
                        for (const line of outcome.lines) lines = [...lines, { at: Date.now() - started, step: step.id, ...line }]
                        lines = [
                            ...lines,
                            { at: Date.now() - started, step: step.id, level: 'warn', text: `try ${String(tried)} failed; trying again` },
                        ]
                        outcome = attempt(step, fill, before, project)
                    }
                }
                for (const line of outcome.lines) lines = [...lines, { at: Date.now() - started, step: step.id, ...line }]
                const duration = Date.now() - begun
                results.set(step.id, { rows: outcome.rows, rejected: outcome.rejected, output: outcome.output })
                current = { ...current, log: lines }
                save({
                    steps: current.steps.map((one) =>
                        one.id === step.id
                            ? {
                                  ...one,
                                  state: outcome.ok ? 'succeeded' : 'failed',
                                  duration_ms: duration,
                                  ...(outcome.rows === undefined ? {} : { rows: outcome.rows }),
                              }
                            : one,
                    ),
                    log: log(step.id, outcome.ok ? 'info' : 'error', outcome.ok ? 'succeeded' : 'failed'),
                    ...(outcome.ok || current.failed !== undefined
                        ? {}
                        : { failed: { step: step.id, reason: outcome.reason ?? 'It failed.' } }),
                })
                next(index + 1)
            }, took),
        )
    }
    next(0)
    return run
}
