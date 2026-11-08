/**
 * Where a run stands at a moment, worked out from its plan: when each step starts and ends, which
 * one fails, and whether it was cancelled. The console draws every run through this, and the engine
 * keeps the stored state in step with it.
 */

import type { RunStep } from '@winterop-com/sokkel-ui-graph/RunGraph'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'

import type { Run } from './model'

export interface StepAt extends RunStep {
    start: number
    end: number
}

export interface RunAt {
    state: Status
    steps: StepAt[]
    /** The step running now, or the one it failed or stopped at, or its last. */
    step: string | null
    /** When its first step started or will start. */
    started: number
    ended: number | null
    /** How long it has run, in milliseconds. */
    duration: number
}

/** The steps in an order where every step comes after the steps it needs. */
function ordered<S extends { code: string; needs: string[] }>(steps: readonly S[]): S[] {
    const done = new Set<string>()
    const out: S[] = []
    let left = [...steps]
    while (left.length > 0) {
        const ready = left.filter((step) => step.needs.every((need) => done.has(need) || !steps.some((one) => one.code === need)))
        const next = ready.length > 0 ? ready : left.slice(0, 1)
        for (const step of next) {
            done.add(step.code)
            out.push(step)
        }
        left = left.filter((step) => !next.includes(step))
    }
    return out
}

/** When each step starts and ends and how it ends, were nothing cancelled. */
function plan(run: Run): { code: string; start: number; end: number; outcome: Status }[] {
    const base = run.created + run.wait
    const timed = new Map<string, { start: number; end: number; outcome: Status }>()
    for (const step of ordered(run.steps)) {
        const before = step.needs.map((need) => timed.get(need)).filter((one) => one !== undefined)
        const start = Math.max(base, ...before.map((one) => one.end))
        const blocked = before.some((one) => one.outcome === 'failed' || one.outcome === 'skipped')
        if (blocked) timed.set(step.code, { start, end: start, outcome: 'skipped' })
        else timed.set(step.code, { start, end: start + step.ms, outcome: run.failAt === step.code ? 'failed' : 'succeeded' })
    }
    return run.steps.map((step) => ({ code: step.code, ...(timed.get(step.code) ?? { start: base, end: base, outcome: 'skipped' }) }))
}

/** Where the run stands at `now`. */
export function runAt(run: Run, now: number): RunAt {
    const base = run.created + run.wait
    if (run.skipped !== null) {
        return {
            state: 'skipped',
            steps: run.steps.map((step) => ({ ...step, status: 'skipped', start: run.created, end: run.created })),
            step: null,
            started: run.created,
            ended: run.created,
            duration: 0,
        }
    }
    const cancelled = run.cancelledAt !== null && run.cancelledAt <= now
    const at = cancelled ? (run.cancelledAt ?? now) : now
    const timed = plan(run)
    const steps: StepAt[] = run.steps.map((step, index) => {
        const { start, end, outcome } = timed[index] ?? { start: base, end: base, outcome: 'skipped' as Status }
        let status: Status
        let progress: number | undefined
        if (at < start || (outcome === 'skipped' && at < end)) status = cancelled ? 'skipped' : 'queued'
        else if (at < end) {
            status = cancelled ? 'cancelled' : 'running'
            progress = (at - start) / Math.max(1, end - start)
        } else status = outcome
        const ran = status === 'queued' || status === 'skipped' ? undefined : Math.min(at, end) - start
        return { code: step.code, kind: step.kind, needs: step.needs, status, start, end, progress, duration_ms: ran }
    })
    const last = Math.max(base, ...timed.map((one) => one.end))
    let state: Status
    if (cancelled) state = 'cancelled'
    else if (now < base) state = 'queued'
    else if (now < last) state = 'running'
    else state = run.failAt !== null ? 'failed' : 'succeeded'
    const ended = cancelled ? at : now >= last ? last : null
    const running = steps.find((step) => step.status === 'running' || step.status === 'cancelled')
    const failed = steps.find((step) => step.status === 'failed')
    const step = running?.code ?? failed?.code ?? (state === 'queued' ? null : (steps[steps.length - 1]?.code ?? null))
    return { state, steps, step, started: base, ended, duration: state === 'queued' ? 0 : Math.max(0, (ended ?? at) - base) }
}

/** Whether a run has yet to settle. */
export const isLive = (state: Status) => state === 'running' || state === 'queued'
