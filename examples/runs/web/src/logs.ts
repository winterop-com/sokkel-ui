/** What a run wrote and gave back, up to a moment, worked out from where it stands. */

import type { LogLine } from '@winterop-com/sokkel-ui/LogView'

import { clock, took, type Run } from './model'
import { seeded } from './seed'
import type { RunAt } from './timeline'

const time = (at: number) => `${clock(at, true)}.${String(Math.floor(at % 1000)).padStart(3, '0')}`

/** What a step says while it works, by the word its code starts with. */
function working(code: string, run: Run): string[] {
    const project = run.project
    const rows = run.records.toLocaleString('en-US')
    switch (code.split('-')[0]) {
        case 'fetch':
            return [`GET https://api.example.org/${project}/${code.replace(/^fetch-?/, '') || run.job}`, `read ${rows} rows`]
        case 'transform':
            return [`joined and reshaped ${rows} rows`, 'wrote 4 columns: sku, amount, placed, region']
        case 'validate':
            return [`checked ${rows} rows against the schema`]
        case 'upload':
            return [`PUT https://storage.example.org/${project}/${run.job}/${run.id}.csv`]
        default:
            return [`sent the summary to ${project}-team@example.org`]
    }
}

/** The run's log up to `now`: each step's start, what it did and how it ended. */
export function runLog(run: Run, at: RunAt, now: number): LogLine[] {
    const lines: { when: number; line: LogLine }[] = []
    const add = (when: number, line: Omit<LogLine, 'at'>) => {
        if (when <= now) lines.push({ when, line: { at: time(when), ...line } })
    }
    const who = run.by === 'schedule' ? 'the scheduler' : run.by
    add(run.created, { level: 'info', source: 'run', text: `queued by ${who}` })
    if (run.skipped !== null) {
        add(run.created + 1, { level: 'warning', source: 'run', text: `skipped: ${run.skipped}` })
        return lines.map((one) => one.line)
    }
    const random = seeded(run.created)
    add(at.started, { level: 'info', source: 'run', text: `picked up by worker-${String(1 + Math.floor(random() * 3))}` })
    for (const step of at.steps) {
        if (step.status === 'queued') continue
        if (step.status === 'skipped') {
            // A step skipped by a cancel says so at the cancel; one skipped by a failure, once the failure is in.
            const when = run.cancelledAt !== null && step.start >= run.cancelledAt ? run.cancelledAt : step.end
            add(when, { level: 'warning', source: step.code, text: 'skipped' })
            continue
        }
        add(step.start, { level: 'debug', source: step.code, text: `started on ${step.kind}` })
        const said = working(step.code, run)
        said.forEach((text, index) => {
            add(step.start + ((step.end - step.start) * (index + 1)) / (said.length + 1), { level: 'info', source: step.code, text })
        })
        if (step.status === 'failed') {
            add(step.end, { level: 'error', source: step.code, text: run.error ?? 'failed' })
            add(step.end + 1, { level: 'error', source: step.code, text: `failed after ${took(step.end - step.start)}` })
        } else if (step.status === 'succeeded') {
            add(step.end, { level: 'info', source: step.code, text: `done in ${took(step.end - step.start)}` })
        } else if (step.status === 'cancelled' && run.cancelledAt !== null) {
            add(run.cancelledAt, { level: 'warning', source: step.code, text: `cancelled by ${run.cancelledBy ?? 'someone'}` })
        }
    }
    if (at.ended !== null) {
        const words =
            at.state === 'succeeded'
                ? `succeeded in ${took(at.duration)}`
                : at.state === 'failed'
                  ? `failed at ${at.step ?? 'a step'} after ${took(at.duration)}`
                  : `cancelled after ${took(at.duration)}`
        add(at.ended + 2, {
            level: at.state === 'succeeded' ? 'info' : at.state === 'failed' ? 'error' : 'warning',
            source: 'run',
            text: words,
        })
    }
    return lines.sort((left, right) => left.when - right.when).map((one) => one.line)
}

/** What the run gave back once it ended: its rows and file, or what went wrong. */
export function outputsOf(run: Run, at: RunAt): Record<string, unknown> | null {
    if (at.state === 'succeeded')
        return {
            rows: run.records,
            file: `https://storage.example.org/${run.project}/${run.job}/${run.id}.csv`,
            bytes: run.records * 38,
            checksum: `sha256:${run.id.slice(4)}${'0f3a9c'.repeat(3)}`,
        }
    if (at.state === 'failed') return { error: { step: at.step, message: run.error } }
    if (at.state === 'cancelled')
        return { cancelled: { by: run.cancelledBy, at: at.ended === null ? null : new Date(at.ended).toISOString() } }
    return null
}
