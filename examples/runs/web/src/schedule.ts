/** When a job's schedule fires, on the UTC clock. */

import { weekdayOf, type Cadence, type Schedule } from './model'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const CADENCES: { value: Cadence; label: string }[] = [
    { value: '15m', label: 'Every 15 minutes' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly' },
]

function parts(at: string): { hour: number; minute: number } {
    const [hour = 0, minute = 0] = at.split(':').map(Number)
    return { hour, minute }
}

const startOf = (schedule: Schedule) => new Date(`${schedule.starts}T00:00:00Z`).getTime()

/** Whether the schedule fires on the UTC day starting at `day`. */
function firesOn(schedule: Schedule, day: number): boolean {
    const weekday = new Date(day).getUTCDay()
    if (schedule.cadence === 'weekdays') return weekday >= 1 && weekday <= 5
    if (schedule.cadence === 'weekly') return weekday === new Date(startOf(schedule)).getUTCDay()
    return true
}

/** The first time the schedule fires after `after`, never before its first day. */
export function nextFire(schedule: Schedule, after: number): number {
    const from = Math.max(after, startOf(schedule) - 1)
    const { hour, minute } = parts(schedule.at)
    if (schedule.cadence === '15m' || schedule.cadence === 'hourly') {
        const step = schedule.cadence === '15m' ? 15 * MINUTE : HOUR
        const offset = (schedule.cadence === '15m' ? minute % 15 : minute) * MINUTE
        return Math.floor((from - offset) / step) * step + offset + step
    }
    let day = Math.floor(from / DAY) * DAY
    for (let tries = 0; tries < 15; tries += 1, day += DAY) {
        const at = day + hour * HOUR + minute * MINUTE
        if (at > from && firesOn(schedule, day)) return at
    }
    return Number.POSITIVE_INFINITY
}

/** Every time the schedule fires after `from`, up to and with `to`. */
export function firesBetween(schedule: Schedule, from: number, to: number, limit = 2000): number[] {
    const fires: number[] = []
    for (let at = nextFire(schedule, from); at <= to && fires.length < limit; at = nextFire(schedule, at)) fires.push(at)
    return fires
}

/** A schedule as a reader says it: `Daily at 02:00 UTC`, `Every 15 minutes`, or Manual only. */
export function saySchedule(schedule: Schedule | null): string {
    if (schedule === null) return 'Manual only'
    const { minute } = parts(schedule.at)
    switch (schedule.cadence) {
        case '15m':
            return minute % 15 === 0 ? 'Every 15 minutes' : `Every 15 minutes from :${String(minute % 15).padStart(2, '0')}`
        case 'hourly':
            return `Hourly at :${String(minute).padStart(2, '0')}`
        case 'daily':
            return `Daily at ${schedule.at} UTC`
        case 'weekdays':
            return `Weekdays at ${schedule.at} UTC`
        case 'weekly':
            return `${weekdayOf(schedule.starts)}s at ${schedule.at} UTC`
    }
}
