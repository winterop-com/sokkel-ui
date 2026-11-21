/**
 * A simulated server, for health checks with no server at hand: it answers each check's request
 * with a status and a body the app names, after a latency that drifts and now and then runs slow,
 * and falls silent for a spell now and then. What it answers at a moment follows from the moment,
 * the server's name and the seed alone, so a status wall drawn at a moment is the same every time.
 */
import type { CheckResponse } from '../checks'

const MINUTE = 60_000

export interface ServerSimOptions {
    /** What tells one simulated server from another: its latency and its bad spells are drawn from it. */
    id: string
    /** What the spells are drawn from. The same seed, the same history. 0 by default. */
    seed?: number
    /** The latency it answers round, in milliseconds. 180 by default. */
    latency?: number
    /** The share of ten-minute spells it runs slow in, from 0 to 1. 0.08 by default. */
    slow?: number
    /** The share of ten-minute spells it does not answer in, from 0 to 1. 0.02 by default. */
    silent?: number
}

/** What a simulated server answers a request with while it is well. */
export interface ServerAnswer {
    /** 200 unless given. */
    status?: number
    /** The body, as text or as a value written as JSON. */
    body?: unknown
}

/** A number from 0 to 1 that is the same every time for the same key and seed. */
function hash(key: string, seed: number): number {
    let value = (2166136261 ^ seed) >>> 0
    for (let index = 0; index < key.length; index += 1) {
        value ^= key.charCodeAt(index)
        value = Math.imul(value, 16777619) >>> 0
    }
    value ^= value >>> 15
    value = Math.imul(value, 2246822519) >>> 0
    value ^= value >>> 13
    return (value >>> 0) / 4294967296
}

/** How long one spell of a simulated server lasts: it is well, slow or silent for the whole of it. */
const SPELL = 10 * MINUTE

/** How a simulated server is at a moment: `well`, `slow` or `silent`. */
export function serverSpell(at: number, options: ServerSimOptions): 'well' | 'slow' | 'silent' {
    const draw = hash(`${options.id}-spell-${String(Math.floor(at / SPELL))}`, options.seed ?? 0)
    const silent = options.silent ?? 0.02
    if (draw < silent) return 'silent'
    return draw < silent + (options.slow ?? 0.08) ? 'slow' : 'well'
}

/**
 * What a simulated server answers one request made at a moment, in milliseconds since the epoch, in
 * the shape `evaluateCheck` takes: the answer the app names with a latency round the server's own,
 * several times that in a slow spell, and no answer at all in a silent one. `path` tells one request
 * of a round from another, so two checks made together take different times.
 */
export function simulateAnswer(at: number, options: ServerSimOptions, answer: ServerAnswer = {}, path = ''): CheckResponse {
    const seed = options.seed ?? 0
    const spell = serverSpell(at, options)
    if (spell === 'silent') return { at, error: 'The simulated server gave no answer.' }
    const usual = options.latency ?? 180
    // A slow drift over half an hour, and a jitter that differs from one request to the next.
    const drift = 1 + 0.25 * Math.sin((at / (30 * MINUTE)) * 2 * Math.PI + hash(options.id, seed) * 2 * Math.PI)
    const jitter = 0.8 + 0.4 * hash(`${options.id}-${path}-${String(Math.floor(at / 1000))}`, seed)
    const slowed = spell === 'slow' ? 6 + 6 * hash(`${options.id}-slow-${String(Math.floor(at / SPELL))}`, seed) : 1
    const response: CheckResponse = { at, status: answer.status ?? 200, latency: Math.round(usual * drift * jitter * slowed) }
    if (answer.body !== undefined) response.body = typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body)
    return response
}
