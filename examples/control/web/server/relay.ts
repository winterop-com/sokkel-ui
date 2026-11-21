/**
 * How the AIS messages reach a page without queuing behind one that is slow. A stream of lines is
 * worth only its latest batch: what a page cannot take now is dropped, never kept for later, so a
 * stalled page costs the server no memory.
 */

import type { ControlProxy, VesselMessage } from './proxy.ts'

/** How often an event stream is sent a comment, so nothing between the server and the page closes it. */
export const KEEP_OPEN_EVERY = 15_000

/** How long a page may take nothing before its stream is closed, in milliseconds. */
export const STALLED_AFTER = 60_000

/** Where an event stream is written: a response, or a test's stand-in. */
export interface EventSink {
    /** Writes text and says whether more may be written now; false until `onDrain`'s call. */
    write(text: string): boolean
    /** Registers the call made when the sink can take more. */
    onDrain(drained: () => void): void
    /** Closes the stream. */
    close(): void
}

export interface RelayOptions {
    now?: () => number
    /** The timer the keep-open comment and the stall check run on; a test hands in its own. */
    every?: (run: () => void, milliseconds: number) => () => void
}

/**
 * Streams the proxy's AIS messages to a sink as server-sent events until `stop`. While the sink is
 * full, batches of lines and keep-open comments are dropped; the latest word on whether the stream
 * is connected is kept and sent once the sink drains. A sink full for `STALLED_AFTER` is closed.
 */
export function relayVessels(proxy: Pick<ControlProxy, 'vessels'>, sink: EventSink, options: RelayOptions = {}): { stop: () => void } {
    const now = options.now ?? (() => Date.now())
    const every =
        options.every ??
        ((run, milliseconds) => {
            const timer = setInterval(run, milliseconds)
            return () => clearInterval(timer)
        })
    let fullSince: number | undefined
    let pending: VesselMessage | undefined
    let stopped = false
    const write = (text: string) => {
        if (!sink.write(text)) fullSince = now()
    }
    sink.onDrain(() => {
        fullSince = undefined
        if (stopped || pending === undefined) return
        const message = pending
        pending = undefined
        write(`data: ${JSON.stringify(message)}\n\n`)
    })
    write(': open\n\n')
    const leave = proxy.vessels((message) => {
        if (stopped) return
        if (fullSince === undefined) write(`data: ${JSON.stringify(message)}\n\n`)
        else if (!('lines' in message)) pending = message
    })
    const stop = () => {
        if (stopped) return
        stopped = true
        endTimer()
        leave()
    }
    const endTimer = every(() => {
        if (fullSince === undefined) write(': keep open\n\n')
        else if (now() - fullSince >= STALLED_AFTER) {
            stop()
            sink.close()
        }
    }, KEEP_OPEN_EVERY)
    return { stop }
}

/** How many messages may be on their way to a page that has not said it took them. */
const MOST_UNTAKEN = 2

/**
 * A valve for a channel with no signal of its own, such as a desktop shell's messages to its page:
 * the page says when it has taken a message, and while `MOST_UNTAKEN` are untaken, batches of lines
 * are dropped. Word of the stream connecting or dropping always passes.
 */
export function createValve(): { pass: (message: VesselMessage) => boolean; taken: () => void } {
    let untaken = 0
    return {
        pass: (message) => {
            if ('lines' in message && untaken >= MOST_UNTAKEN) return false
            untaken += 1
            return true
        },
        taken: () => {
            untaken = Math.max(0, untaken - 1)
        },
    }
}
