/**
 * A simulated clock: a moment that plays on from where it starts at a multiple of real time, and
 * can be paused, moved and sped up. It moves in whole ticks, so every reader sees the same moment
 * until the next tick, and a clock started at the same moment passes the same moments every time.
 */

export interface SimClockOptions {
    /** The simulated moment it starts at, in milliseconds since the epoch. */
    start: number
    /** How many simulated milliseconds pass in a real one: 1 is live, 30 is half a minute each second. 1 by default. */
    speed?: number
    /** Whether it plays from the start; false holds it at `start` until `play`. True by default. */
    playing?: boolean
    /** Real milliseconds between ticks. A second by default. */
    tick?: number
    /** The real clock, in milliseconds; a test hands in its own. */
    now?: () => number
}

export interface SimClock {
    /** The simulated moment as of the last tick, in milliseconds since the epoch: the same until the next tick. */
    get: () => number
    /**
     * Calls `listener` after each tick, and after each `seek`, `play`, `pause` and `setSpeed`, and
     * returns the call that stops it. One timer ticks the clock while it plays and something listens.
     */
    subscribe: (listener: () => void) => () => void
    readonly playing: boolean
    readonly speed: number
    /** Plays on from the moment it stands at. */
    play: () => void
    /** Holds at the moment it stands at. */
    pause: () => void
    /** Moves to a moment, and plays on from it unless paused. */
    seek: (time: number) => void
    /** Changes how fast it plays, from the next tick on. */
    setSpeed: (speed: number) => void
}

/** The most a timer may fire before its tick is wholly past and still count it, in real milliseconds. */
const EARLY = 16

/**
 * A clock at `start` that moves on every `tick` by the tick's length times `speed`. It follows the
 * real clock rather than counting its own timer, so a timer the browser slows in a hidden tab
 * leaves it no later: the next tick takes every tick missed with it. Only ticks wholly past are
 * counted, each at the speed it passed at.
 */
export function createSimClock(options: SimClockOptions): SimClock {
    const now = options.now ?? (() => performance.now())
    const tick = Math.max(1, options.tick ?? 1000)
    const early = Math.min(EARLY, tick / 10)
    const listeners = new Set<() => void>()
    let time = options.start
    let speed = options.speed ?? 1
    let playing = options.playing ?? true
    /** The real moment `time` was reached at: the tick boundary every later tick is counted from. */
    let reached = now()
    let timer: ReturnType<typeof setTimeout> | undefined

    const tell = () => {
        // A copy, so a listener that stops itself does not skip the next one.
        for (const listener of Array.from(listeners)) listener()
    }

    /** Moves `time` on by the ticks wholly past since it was reached, a timer's own tick allowed to come `slack` early. */
    const advance = (slack = 0): boolean => {
        if (!playing) return false
        const ticks = Math.floor((now() - reached + slack) / tick)
        if (!(ticks > 0)) return false
        time += ticks * tick * speed
        reached += ticks * tick
        return true
    }

    const stop = () => {
        if (timer !== undefined) clearTimeout(timer)
        timer = undefined
    }

    /** Sets the timer for the next tick boundary when the clock plays and something listens. */
    const run = () => {
        stop()
        if (!playing || listeners.size === 0) return
        timer = setTimeout(
            () => {
                const moved = advance(early)
                run()
                if (moved) tell()
            },
            Math.max(1, reached + tick - now()),
        )
    }

    return {
        // While the timer runs it alone moves the clock, so every listener is told of each moment a reader sees.
        get() {
            if (timer === undefined) advance()
            return time
        },
        subscribe(listener) {
            listeners.add(listener)
            if (listeners.size === 1) {
                advance()
                run()
            }
            return () => {
                listeners.delete(listener)
                if (listeners.size === 0) stop()
            }
        },
        get playing() {
            return playing
        },
        get speed() {
            return speed
        },
        play() {
            if (playing) return
            playing = true
            reached = now()
            run()
            tell()
        },
        pause() {
            if (!playing) return
            advance()
            playing = false
            stop()
            tell()
        },
        seek(to) {
            time = to
            reached = now()
            run()
            tell()
        },
        setSpeed(next) {
            advance()
            speed = next
            run()
            tell()
        },
    }
}
