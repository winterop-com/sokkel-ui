import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { StatusChip, type StatusMap } from '@winterop-com/sokkel-ui/StatusChip'
import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { UptimeBar, type UptimeDay } from '@winterop-com/sokkel-ui/UptimeBar'

/**
 * A service's record over the last ninety days as a bar a day, today at the right: green while it
 * was up all day, a warning when a little was lost, critical past that, and quiet where nothing was
 * measured. Pointing at a day says its date, its uptime and what happened.
 */
const meta: Meta = { title: 'Patterns/Uptime bar', parameters: { frame: 'padded' } }
export default meta

/** The day `offset` days before 2026-11-08, as `YYYY-MM-DD`. */
function dayBefore(offset: number): string {
    return new Date(Date.UTC(2026, 10, 8 - offset)).toISOString().slice(0, 10)
}

/** What lowered a service's uptime, by how many days before 2026-11-08 it happened. */
type Lost = Record<number, { uptime: number; note: string }>

/** Ninety days of a service's record, every day up but the ones in `losses`; none measured before `since` days ago. */
function record(losses: Lost, since = 90): UptimeDay[] {
    return Array.from({ length: 90 }, (_, index) => {
        const offset = 89 - index
        const loss = losses[offset]
        if (offset >= since) return { date: dayBefore(offset), uptime: null }
        return { date: dayBefore(offset), uptime: loss?.uptime ?? 1, note: loss?.note }
    })
}

const API = record({
    61: { uptime: 0.9982, note: 'Slow responses from the api' },
    23: { uptime: 0.9861, note: 'Elevated error rates on the api' },
    4: { uptime: 0.9994, note: 'A slow deploy of the api' },
})
const WORKER = record({ 40: { uptime: 0.9958, note: 'Jobs queued behind a stuck worker' } })
const SCHEDULER = record({})
const SEARCH = record({ 12: { uptime: 0.9713, note: 'Search index rebuilt from scratch' } }, 34)

/** A service that was up every day. */
export const Steady: StoryObj = {
    render: () => <UptimeBar label="scheduler, the last 90 days" days={SCHEDULER} className="max-w-2xl" />,
}

/** Three days with losses, each with its note; point at one to read it. */
export const Losses: StoryObj = {
    render: () => <UptimeBar label="api, the last 90 days" days={API} className="max-w-2xl" />,
}

/** A service measured only since it went live 34 days ago: the days before are quiet and the uptime counts the measured ones. */
export const NoData: StoryObj = {
    name: 'No data',
    render: () => <UptimeBar label="search, the last 90 days" days={SEARCH} className="max-w-2xl" />,
}

/** Tidevann's states for a service, which a day can be drawn in instead of by its uptime. */
const SERVICE_STATES: StatusMap = {
    operational: { color: 'good' },
    degraded: { color: 'warning' },
    outage: { color: 'critical' },
    maintenance: { color: 'info' },
}

/** The worker's days drawn in the states the status map names: a night of maintenance among them. */
const WORKER_STATES: UptimeDay[] = WORKER.map((day, index) => {
    const offset = 89 - index
    if (offset === 40) return { ...day, status: 'degraded' }
    if (offset === 15) return { ...day, status: 'maintenance', note: 'Planned maintenance of the worker' }
    return { ...day, status: 'operational' }
})

/** Days drawn in the app's own states from a `StatusProvider`, maintenance in its own color. */
export const States: StoryObj = {
    render: () => (
        <StatusProvider statuses={SERVICE_STATES}>
            <UptimeBar label="worker, the last 90 days" days={WORKER_STATES} className="max-w-2xl" />
        </StatusProvider>
    ),
}

const SERVICES = [
    { name: 'api', state: 'degraded', days: API },
    { name: 'worker', state: 'operational', days: WORKER },
    { name: 'scheduler', state: 'operational', days: SCHEDULER },
    { name: 'search', state: 'operational', days: SEARCH },
]

/** A status page's services, each with its state and its record; pressing a day names it below. */
function Services() {
    const [chosen, setChosen] = useState<string | null>(null)
    return (
        <StatusProvider statuses={SERVICE_STATES}>
            <Section title="Services" meta="the last 90 days" description={chosen ?? 'Press a day to choose it.'}>
                <Stack gap="xl">
                    {SERVICES.map((service) => (
                        <Stack key={service.name} gap="xs">
                            <Row justify="between">
                                <span>{service.name}</span>
                                <StatusChip status={service.state} />
                            </Row>
                            <UptimeBar
                                label={`${service.name}, the last 90 days`}
                                days={service.days}
                                onSelect={(day) => setChosen(`${service.name} on ${day.date}`)}
                            />
                        </Stack>
                    ))}
                </Stack>
            </Section>
        </StatusProvider>
    )
}

/** Four services on a status page, each under its name and state; the page's width decides how many days show. */
export const Page: StoryObj = { render: () => <Services /> }
