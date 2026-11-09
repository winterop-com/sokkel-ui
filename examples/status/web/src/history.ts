import type { UptimeDay } from '@winterop-com/sokkel-ui/UptimeBar'

import { dateOfMoment, dayOf, type Incident, type Maintenance, type ServiceId, type Severity } from './data'

const DAY = 24 * 60 * 60 * 1000

/** How much of an incident's time counts as down, by its severity. */
const WEIGHT: Record<Severity, number> = { minor: 0.3, major: 0.7, critical: 1 }

/** A number from 0 to 1 that is always the same for the same text. */
function hashed(text: string): number {
    let hash = 2166136261
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
    return hash / 0xffffffff
}

/** How many milliseconds two spans share. */
function overlap(from: number, to: number, start: number, end: number): number {
    return Math.max(0, Math.min(to, end) - Math.max(from, start))
}

/**
 * A service's last `count` days, oldest first, today last: each day's uptime from the incidents
 * that touched it, weighed by their severity, a stray minute lost here and there, and the day drawn
 * in the state of the worst incident it had, or as maintenance when a window ran that day.
 */
export function uptimeDays(
    service: ServiceId,
    rows: readonly Incident[],
    windows: readonly Maintenance[],
    now: number,
    count = 90,
): UptimeDay[] {
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const touching = rows.filter((incident) => incident.services.includes(service))
    const planned = windows.filter((window) => window.service === service && !window.cancelled)
    return Array.from({ length: count }, (_, index) => {
        const start = new Date(today)
        start.setDate(start.getDate() - (count - 1 - index))
        const from = start.getTime()
        const to = Math.min(from + DAY, now)
        const date = dayOf(start)
        const length = Math.max(1, to - from)
        let lost = 0
        let worst: Severity | undefined
        const notes: string[] = []
        for (const incident of touching) {
            const opened = new Date(incident.opened).getTime()
            const closed = incident.resolved === null ? now : new Date(incident.resolved).getTime()
            const shared = overlap(opened, closed, from, to)
            if (shared <= 0) continue
            lost += shared * WEIGHT[incident.severity]
            notes.push(incident.title)
            if (worst === undefined || WEIGHT[incident.severity] > WEIGHT[worst]) worst = incident.severity
        }
        const blip = hashed(`${service}:${date}`) < 0.05 ? 0.0003 : 0
        const uptime = Math.max(0, 1 - lost / length - blip)
        const window = planned.find((one) => overlap(dateOfMoment(one.starts).getTime(), dateOfMoment(one.ends).getTime(), from, to) > 0)
        if (worst !== undefined) {
            return { date, uptime, status: worst === 'minor' ? 'degraded' : 'outage', note: notes.join('; ') }
        }
        if (window !== undefined && dateOfMoment(window.starts).getTime() <= now) {
            return { date, uptime, status: 'maintenance', note: window.title }
        }
        return { date, uptime }
    })
}
