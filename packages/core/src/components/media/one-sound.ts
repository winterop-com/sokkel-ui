import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * One sound at a time. A player claims the sound as it starts to be heard, and whoever held it
 * before is paused, so a video started over an album does not play on top of it. `AudioPlayer`,
 * `VideoPlayer` and `MediaBar` claim it on their own unless given `exclusive={false}`; an app's own
 * element or player joins by claiming it too, with `claimSound` or `useOneSound`.
 */

/** What another claim can stop: a media element, or a player an app drives, by its `pause`. */
export interface SoundHolder {
    pause: () => void
}

let holder: SoundHolder | null = null

/**
 * Takes the sound for `claimant`, pausing whoever held it before, and returns a release that gives
 * it up. A release after another has claimed the sound does nothing, so a player paused by a
 * claim cannot take the sound back by releasing late, and claiming again while holding it pauses
 * nothing.
 */
export function claimSound(claimant: SoundHolder): () => void {
    const previous = holder
    holder = claimant
    if (previous !== null && previous !== claimant) {
        try {
            previous.pause()
        } catch {
            // A player that cannot be paused does not stop the new one being heard.
        }
    }
    return () => {
        if (holder === claimant) holder = null
    }
}

/** Who holds the sound now, if anyone. */
export function soundHolder(): SoundHolder | null {
    return holder
}

/**
 * Holds the sound while `heard`: as it turns true the player claims it, pausing any other, and it
 * gives it up as it turns false or the player unmounts. `stop` is how another claim pauses this
 * player: its media element, or a function. With `exclusive` false it neither claims nor is paused.
 */
export function useOneSound(stop: RefObject<SoundHolder | null> | (() => void), heard: boolean, exclusive = true): void {
    const latest = useRef(stop)
    useLayoutEffect(() => {
        latest.current = stop
    })
    useEffect(() => {
        if (!heard || !exclusive) return
        return claimSound({
            pause: () => {
                const current = latest.current
                if (typeof current === 'function') current()
                else current.current?.pause()
            },
        })
    }, [heard, exclusive])
}
