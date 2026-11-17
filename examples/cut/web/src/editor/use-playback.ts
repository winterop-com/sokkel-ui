/**
 * The playhead and how it moves: still, or played at a rate (backward with a negative one) from
 * where it stood, on the page's frame clock. The sound plays with it while it plays forward at its
 * own speed, and starts again from the playhead whenever the edit changes under it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { FRAME, onFrame, type Edit } from '../model'
import { playSound, stopSound } from '../sound'

/** The rates J and L step through, each press doubling the speed up to four times. */
const FASTEST = 4

export interface Playback {
    playhead: number
    /** 0 while still; 1 plays forward at its own speed, -1 backward, 2 and 4 faster. */
    rate: number
    playing: boolean
    seek: (seconds: number) => void
    toggle: () => void
    pause: () => void
    /** L: plays forward, faster on each press while it already does. */
    forward: () => void
    /** J: plays backward, faster on each press while it already does. */
    backward: () => void
    /** Steps by whole frames, stopping play. */
    step: (frames: number) => void
}

export function usePlayback(edit: Edit, length: number, loop: boolean): Playback {
    const [playhead, setPlayhead] = useState(0)
    const [rate, setRate] = useState(0)
    const anchor = useRef({ at: 0, when: 0 })
    const head = useRef(0)
    head.current = playhead
    // The edit as it is now, for the sound started again as play loops.
    const current = useRef(edit)
    current.current = edit

    const limit = Math.max(length, FRAME)

    // Moves the playhead on each frame while it plays, from where it stood when play began.
    useEffect(() => {
        if (rate === 0) return
        anchor.current = { at: head.current, when: performance.now() }
        let frame = 0
        const tick = (now: number) => {
            let t = anchor.current.at + ((now - anchor.current.when) / 1000) * rate
            if (rate > 0 && t >= limit) {
                if (loop && rate === 1) {
                    anchor.current = { at: 0, when: now }
                    t = 0
                    playSound(current.current, 0)
                } else {
                    setPlayhead(onFrame(limit))
                    setRate(0)
                    return
                }
            }
            if (rate < 0 && t <= 0) {
                setPlayhead(0)
                setRate(0)
                return
            }
            setPlayhead(t)
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [rate, limit, loop])

    // The sound follows the rate, and starts again from the playhead when the edit changes while it plays.
    useEffect(() => {
        if (rate !== 1) {
            stopSound()
            return
        }
        playSound(edit, head.current)
        return stopSound
    }, [rate, edit])

    const seek = useCallback(
        (seconds: number) => {
            const t = Math.max(0, Math.min(limit, seconds))
            anchor.current = { at: t, when: performance.now() }
            head.current = t
            setPlayhead(t)
            if (rate === 1) playSound(edit, t)
        },
        [limit, rate, edit],
    )

    const toggle = useCallback(() => {
        if (rate !== 0) return setRate(0)
        // Play from the start again once at the end.
        if (head.current >= limit - FRAME / 2) {
            head.current = 0
            setPlayhead(0)
        }
        setRate(1)
    }, [rate, limit])

    const pause = useCallback(() => {
        setRate(0)
        setPlayhead((t) => onFrame(t))
    }, [])

    const forward = useCallback(() => setRate((current) => (current <= 0 ? 1 : Math.min(FASTEST, current * 2))), [])
    const backward = useCallback(() => setRate((current) => (current >= 0 ? -1 : Math.max(-FASTEST, current * 2))), [])

    const step = useCallback(
        (frames: number) => {
            setRate(0)
            setPlayhead((t) => Math.max(0, Math.min(onFrame(limit), onFrame(t + frames * FRAME))))
        },
        [limit],
    )

    return { playhead, rate, playing: rate !== 0, seek, toggle, pause, forward, backward, step }
}
