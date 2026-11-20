/** A time on an axis: an ISO 8601 text or milliseconds since the epoch. */
export type TimelineTime = string | number

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** The steps ticks are placed at, from the finest. */
const STEPS = [15 * MINUTE, 30 * MINUTE, HOUR, 2 * HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 3 * DAY, 7 * DAY, 14 * DAY]

/** The least room a tick's label takes, in pixels. */
const TICK_ROOM = 64

/** A time in milliseconds. */
export function timelineMs(time: TimelineTime): number {
    return typeof time === 'number' ? time : Date.parse(time)
}

/** How far a zone's clock is ahead of UTC at a moment, in milliseconds. */
export function zoneOffset(ms: number, timeZone: string | undefined): number {
    if (timeZone === undefined) return -new Date(ms).getTimezoneOffset() * MINUTE
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    }).formatToParts(ms)
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value ?? 0)
    const wall = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'))
    return wall - (ms - (ms % MINUTE))
}

/** The ticks along an axis from `from` to `to` that fit `width` pixels: the step and each tick's time, on the zone's clock. */
export function timelineTicks(from: number, to: number, width: number, timeZone?: string): { step: number; ticks: number[] } {
    const span = Math.max(to - from, 1)
    const most = Math.max(Math.floor(width / TICK_ROOM), 2)
    const step = STEPS.find((candidate) => span / candidate <= most) ?? STEPS[STEPS.length - 1]
    const offset = zoneOffset(from, timeZone)
    const ticks: number[] = []
    for (let at = Math.ceil((from + offset) / step) * step - offset; at <= to; at += step) {
        // A step of a day or more lands on the zone's midnight even across a change of its clock.
        ticks.push(step >= DAY ? at + offset - zoneOffset(at, timeZone) : at)
    }
    return { step, ticks }
}

/** Whether a time is the zone's midnight, where a tick names its day rather than its hour. */
export function isMidnight(at: number, timeZone?: string): boolean {
    return (at + zoneOffset(at, timeZone)) % DAY === 0
}

/** How a tick is labeled at a step: a tick at the zone's midnight, or any tick of a step of a day or more, by its day; the others by their time. */
export function tickLabeler(locale: string, timeZone: string | undefined, step: number): (at: number) => string {
    const day = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone })
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
    return (at) => (step >= DAY || isMidnight(at, timeZone) ? day.format(at) : time.format(at))
}

/** The share of the axis a time stands at, from 0 to 1, held to it. */
export function axisShare(at: number, from: number, to: number): number {
    return Math.min(Math.max((at - from) / Math.max(to - from, 1), 0), 1)
}
