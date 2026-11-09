import { RefreshControl, rangeLabel, TimeRangePicker } from '@winterop-com/sokkel-ui/dashboard/TimeRange'
import type { Variable } from '@winterop-com/sokkel-ui/dashboard/VariablesBar'

import { clockOf, INTERVALS, PRESETS } from './query'
import { ALL, HOSTS, PROJECTS, SERVICES } from './source'
import type { View } from './view'

const atMidnight = (date: Date) => date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0

/** A custom range for a reader: its days as the calendar picked them, or its times when a link pinned them. */
function written(from: Date, to: Date): string {
    if (atMidnight(from) && atMidnight(to)) return rangeLabel(from, to)
    const time = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    const sameDay = from.toDateString() === to.toDateString()
    return sameDay
        ? `${time.format(from)} to ${time.format(to)}, ${day.format(to)}`
        : `${day.format(from)} ${time.format(from)} to ${day.format(to)} ${time.format(to)}`
}

/** The range picker and the refresh, as the dashboard's top bar and the editor's preview carry them. */
export function TimeControls({ view }: { view: View }) {
    const updated = view.refresh > 0 && view.paused ? 'paused' : `updated ${clockOf(view.at, view.zone)}`
    return (
        <>
            <TimeRangePicker value={view.range} onChange={view.setRange} presets={PRESETS} words={{ range: written }} />
            <RefreshControl
                onRefresh={view.refreshNow}
                refreshing={view.refreshing}
                interval={view.refresh}
                onIntervalChange={view.setRefresh}
                intervals={INTERVALS}
                paused={view.paused}
                onPausedChange={view.setPaused}
                updated={updated}
            />
        </>
    )
}

const choices = (values: readonly string[]) => [{ value: ALL, label: 'All' }, ...values.map((value) => ({ value, label: value }))]

/** The dashboard's variables as the bar draws them: a service, a host of that service, and a project. */
export function variables(view: View): Variable[] {
    const { vars } = view
    const hosts = HOSTS.filter((host) => vars.service === ALL || host.service === vars.service).map((host) => host.id)
    return [
        {
            kind: 'select',
            id: 'service',
            label: 'service',
            value: vars.service,
            options: choices(SERVICES),
            onChange: (service) => {
                const keepsHost =
                    vars.host === ALL || HOSTS.some((host) => host.id === vars.host && (service === ALL || host.service === service))
                view.setVariables({ ...vars, service, host: keepsHost ? vars.host : ALL })
            },
        },
        {
            kind: 'select',
            id: 'host',
            label: 'host',
            value: vars.host,
            options: choices(hosts),
            onChange: (host) => view.setVariables({ ...vars, host }),
        },
        {
            kind: 'select',
            id: 'project',
            label: 'project',
            value: vars.project,
            options: choices(PROJECTS),
            onChange: (project) => view.setVariables({ ...vars, project }),
        },
    ]
}
