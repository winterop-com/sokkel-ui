/**
 * Answers as they are written: each one loads its model if it must, waits out the time the model
 * takes to read the prompt, then streams word by word at the model's pace until it ends, is
 * stopped, or fails. What is being written lives here, outside React; the conversation or the
 * comparison it belongs to keeps the answer once it ends.
 */

import { createStore } from '@winterop-com/sokkel-ui/hooks/use-store'

import { log } from '../data/backend'
import type { Model, Usage } from '../data/model'
import { plan, pieces, tokens, type Ask } from './generate'
import { answeredWith, ensureLoaded, markBusy, onRunnerStop } from './runner'

export type Phase = 'loading' | 'waiting' | 'streaming' | 'done' | 'stopped' | 'failed'

/** An answer being written. */
export interface Live {
    model: string
    phase: Phase
    reasoning: string
    text: string
    input: number
    output: number
    /** When it was asked, when its first token came and when it ended. */
    asked: number
    first: number | null
    ended: number | null
    rate: number
    note?: string
    problem?: string
}

/** Every answer being written, by the key its owner gave it. */
export const live = createStore<Readonly<Record<string, Live>>>({})

const stopping = new Set<string>()

/** How to end each answer still waiting for its model to load. */
const waiting = new Map<string, () => void>()

function set(key: string, change: Partial<Live>): Live {
    const next = { ...live.get()[key], ...change } as Live
    live.update((all) => ({ ...all, [key]: next }))
    return next
}

function drop(key: string): void {
    live.update((all) => {
        const { [key]: _gone, ...rest } = all
        return rest
    })
}

/** The usage an answer ended with, or has so far. */
export function usageOf(answer: Live, now = Date.now()): Usage {
    const first = answer.first === null ? 0 : answer.first - answer.asked
    const writing = answer.first === null ? 0 : (answer.ended ?? now) - answer.first
    return {
        input: answer.input,
        output: answer.output,
        firstToken: first,
        rate: Number((writing > 0 ? (answer.output / writing) * 1000 : answer.rate).toFixed(1)),
        latency: (answer.ended ?? now) - answer.asked,
        note: answer.note,
    }
}

/**
 * Writes the answer to `ask` under `key`, and hands it to `onEnd` once it ends, stopped or failed;
 * the answer stays here until `onEnd`'s promise settles, so the owner shows it without a gap.
 */
export function answer(key: string, ask: Ask, onEnd: (ended: Live) => Promise<unknown>): void {
    stopping.delete(key)
    const asked = Date.now()
    set(key, {
        model: ask.model.id,
        phase: 'loading',
        reasoning: '',
        text: '',
        input: 0,
        output: 0,
        asked,
        first: null,
        ended: null,
        rate: 0,
    })
    let over = false
    const end = (change: Partial<Live>) => {
        if (over) return
        over = true
        waiting.delete(key)
        const ended = set(key, { ...change, ended: Date.now() })
        void onEnd(ended).finally(() => drop(key))
    }
    // Stopped while its model loads, the answer ends at once; the load carries on, as a runner's does.
    waiting.set(key, () => end({ phase: 'stopped' }))
    ensureLoaded(ask.model, true).then(
        () => !over && write(key, ask, end),
        (error: unknown) => end({ phase: 'failed', problem: error instanceof Error ? error.message : String(error) }),
    )
}

function write(key: string, ask: Ask, end: (change: Partial<Live>) => void): void {
    if (stopping.has(key)) {
        end({ phase: 'stopped' })
        return
    }
    const planned = plan(ask)
    set(key, { phase: 'waiting', input: planned.input, rate: planned.rate, note: planned.note })
    markBusy(ask.model.id, true)
    const thinking = pieces(planned.reasoning)
    const words = pieces(planned.text)
    const all = [...thinking, ...words]
    let at = 0
    let output = 0
    let first: number | null = null
    const waitUntil = Date.now() + planned.prefill
    const timer = setInterval(() => {
        const now = Date.now()
        const finish = (change: Partial<Live>) => {
            clearInterval(timer)
            markBusy(ask.model.id, false)
            answeredWith(ask.model.id)
            if (change.phase === 'done')
                log(
                    'info',
                    'chat',
                    `${ask.model.name} answered ${String(output)} tokens at ${(first === null ? 0 : (output / Math.max(1, now - first)) * 1000).toFixed(1)} tok/s`,
                )
            end(change)
        }
        if (stopping.has(key)) {
            finish({ phase: 'stopped', note: undefined })
            return
        }
        if (now < waitUntil) return
        if (first === null) first = now
        const due = (planned.rate * (now - first)) / 1000
        while (at < all.length && output < due) {
            output += tokens(all[at])
            at += 1
        }
        const reasoning = thinking.slice(0, Math.min(at, thinking.length)).join('')
        const text = at > thinking.length ? words.slice(0, at - thinking.length).join('') : ''
        set(key, { phase: 'streaming', first, output, reasoning, text })
        if (at >= all.length) finish({ phase: 'done' })
    }, 45)
}

/** Stops the answer under `key`, keeping what it has written. */
export function stopAnswer(key: string): void {
    if (live.get()[key] === undefined) return
    stopping.add(key)
    if (live.get()[key].phase === 'loading') waiting.get(key)?.()
}

/** Whether any answer is being written for one of the keys that start with `prefix`. */
export function writing(all: Readonly<Record<string, Live>>, prefix: string): boolean {
    return Object.keys(all).some((key) => key.startsWith(prefix))
}

onRunnerStop(() => {
    for (const key of Object.keys(live.get())) {
        stopping.add(key)
        const one = live.get()[key]
        if (one.phase === 'loading' || one.phase === 'waiting') set(key, { problem: 'The runner stopped before the answer began.' })
    }
})

/** A model's name for the log, from the library. */
export function nameOf(library: readonly Model[], id: string): string {
    return library.find((model) => model.id === id)?.name ?? id
}
