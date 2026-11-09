import type { StatusMap } from '@winterop-com/sokkel-ui/lib/status'
import { STATUS_CSS, type StatusColor } from '@winterop-com/sokkel-ui/lib/status'

import type { IncidentState } from './data'

/** How a service or a site is doing now. */
export type Health = 'operational' | 'degraded' | 'outage' | 'maintenance'

/** From the best to the worst, maintenance aside. */
const RANK: Record<Health, number> = { operational: 0, maintenance: 1, degraded: 2, outage: 3 }

/** The worse of two states. */
export function worse(left: Health, right: Health): Health {
    return RANK[right] > RANK[left] ? right : left
}

const HEALTH_COLOR: Record<Health, StatusColor> = {
    operational: 'good',
    degraded: 'warning',
    outage: 'critical',
    maintenance: 'info',
}

/** Every state the board says, in its words and colors: a service's health, an incident's state and its severity. */
export const STATUSES: StatusMap = {
    operational: { color: 'good' },
    degraded: { color: 'warning' },
    outage: { color: 'critical' },
    maintenance: { color: 'info' },
    investigating: { color: 'critical' },
    identified: { color: 'warning' },
    monitoring: { color: 'info' },
    resolved: { color: 'good' },
    minor: { color: 'warning' },
    major: { color: 'critical' },
    critical: { color: 'critical' },
    scheduled: { color: 'info' },
    in_progress: { label: 'in progress', color: 'running' },
    completed: { color: 'succeeded' },
    cancelled: { color: 'cancelled' },
    on_call: { label: 'on call', color: 'good' },
}

/** A state's color as a CSS color, for a dot or a point on the map. */
export function healthCss(health: Health): string {
    return STATUS_CSS[HEALTH_COLOR[health]]
}

export const HEALTH_WORDS: Record<Health, string> = {
    operational: 'Operational',
    degraded: 'Degraded',
    outage: 'Outage',
    maintenance: 'Maintenance',
}

/** An incident's state, in words. */
export const INCIDENT_WORDS: Record<IncidentState, string> = {
    investigating: 'Investigating',
    identified: 'Identified',
    monitoring: 'Monitoring',
    resolved: 'Resolved',
}

/** What the status page says over everything, by the worst state of any service. */
export const OVERALL_WORDS: Record<Health, string> = {
    operational: 'All systems operational',
    maintenance: 'Maintenance in progress',
    degraded: 'Some systems are degraded',
    outage: 'Some systems are down',
}

const NUMBER = new Intl.NumberFormat('en-US')
const ONE_DECIMAL = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const TWO_DECIMALS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatCount = (value: number) => NUMBER.format(Math.round(value))
export const formatMs = (value: number) => `${NUMBER.format(Math.round(value))} ms`
export const formatRate = (value: number) => `${value < 1 ? TWO_DECIMALS.format(value) : ONE_DECIMAL.format(value)}%`

/** A time of day on the board's clock: `14:02:11` or `2:02:11 PM`. */
export function formatClock(date: Date, clock: 12 | 24, seconds = true): string {
    return date.toLocaleTimeString('en-US', {
        hour: clock === 12 ? 'numeric' : '2-digit',
        minute: '2-digit',
        second: seconds ? '2-digit' : undefined,
        hour12: clock === 12,
    })
}

const SHORT_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const FULL_DAY = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

/** A day as `Mon, Nov 9`. */
export const formatDay = (date: Date) => SHORT_DAY.format(date)
/** A day as `Monday, November 9`. */
export const formatLongDay = (date: Date) => FULL_DAY.format(date)

/** A moment as `Mon, Nov 9, 14:02`. */
export function formatMoment(date: Date, clock: 12 | 24): string {
    return `${formatDay(date)}, ${formatClock(date, clock, false)}`
}

/** How long something lasted, said briefly: `42 min`, `2 h 10 min`, `3 days`. */
export function formatDuration(ms: number): string {
    const minutes = Math.max(1, Math.round(ms / 60_000))
    if (minutes < 60) return `${String(minutes)} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 48) return minutes % 60 === 0 ? `${String(hours)} h` : `${String(hours)} h ${String(minutes % 60)} min`
    return `${String(Math.round(hours / 24))} days`
}
