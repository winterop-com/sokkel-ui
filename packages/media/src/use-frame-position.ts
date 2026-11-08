import { useLayoutEffect, useRef, useState } from 'react'

/** A position read on an animation frame, with the given position it was read against. */
export interface FrameReading {
    at: number
    given: number
}

/**
 * The position to draw: the last frame's reading while frames are read, and once they stop (a
 * pause) that reading until the given position moves (a seek, or the player's own report), so the
 * scrubber neither jumps back to a position a quarter second old nor misses a seek.
 */
export function drawnPosition(given: number, frame: FrameReading | null, reading: boolean): number {
    if (frame === null) return given
    if (reading) return frame.at
    return frame.given === given ? frame.at : given
}

/**
 * A position that moves every animation frame while `playing`: `read`, such as
 * `() => audio.currentTime`, is called on each frame and its seconds drawn in place of `given`,
 * which a media element reports only about four times a second. Without `read`, or while not
 * playing, it is `given`. The frame loop runs only while it reads, so a paused player costs
 * nothing.
 */
export function useFramePosition(given: number, read: (() => number) | undefined, playing: boolean): number {
    const reader = useRef(read)
    const latest = useRef(given)
    useLayoutEffect(() => {
        reader.current = read
        latest.current = given
    })
    const [frame, setFrame] = useState<FrameReading | null>(null)
    const reading = playing && read !== undefined

    // A layout effect, so the first reading is drawn before the paint that would show the last one.
    useLayoutEffect(() => {
        if (!reading) return
        let request = 0
        const take = () => {
            const at = reader.current?.()
            if (at === undefined || !Number.isFinite(at)) return
            const base = latest.current
            setFrame((last) => (last !== null && last.at === at && last.given === base ? last : { at, given: base }))
        }
        const tick = () => {
            take()
            request = requestAnimationFrame(tick)
        }
        take()
        request = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(request)
    }, [reading])

    return drawnPosition(given, frame, reading)
}
