/**
 * A media clock: `m:ss` under an hour and `h:mm:ss` from an hour on. A value that is not a
 * finite positive number of seconds, such as the `NaN` a media element reports before it knows
 * its length, reads `0:00`. Fractions are dropped, so the clock turns over on the second.
 */
export function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
    const total = Math.floor(seconds)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const rest = String(total % 60).padStart(2, '0')
    if (hours === 0) return `${String(minutes)}:${rest}`
    return `${String(hours)}:${String(minutes).padStart(2, '0')}:${rest}`
}

/** The time still to play, as a clock with a leading minus sign. */
export function formatRemaining(position: number, duration: number): string {
    const at = Number.isFinite(position) && position > 0 ? position : 0
    return `−${formatTime(duration - at)}`
}

/** A stretch of media that is loaded, in seconds from the start. */
export interface MediaRange {
    start: number
    end: number
}
