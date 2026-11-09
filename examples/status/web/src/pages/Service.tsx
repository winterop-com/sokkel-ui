import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { type DataAction, type DataColumn, DataTable } from '@winterop-com/sokkel-ui/DataTable'
import { DashboardGrid, DashboardPanel, KpiRow } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Timeline } from '@winterop-com/sokkel-ui/Timeline'
import { formatUptime, formatUptimeDay, overallUptime, UptimeBar } from '@winterop-com/sokkel-ui/UptimeBar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { CalendarClock, CircleStop, Play, Rocket, Siren, Undo2, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import {
    dateOfMoment,
    type Deploy,
    deploys,
    dependents,
    type Maintenance,
    maintenance,
    momentOf,
    type Person,
    previousVersion,
    SERVICE_BY_ID,
    type ServiceId,
} from '../data'
import { inWindow, useLive } from '../live'
import { DeployDialog } from '../parts/DeployDialog'
import { MaintenanceDialog } from '../parts/MaintenanceDialog'
import { ServiceGraph } from '../parts/ServiceGraph'
import { useUptime } from '../parts/uptime'
import { useRows } from '../rows'
import type { Settings } from '../settings'
import { formatClock, formatCount, formatMoment, formatMs, formatRate, HEALTH_WORDS } from '../status'

/** Where a window stands now. */
function windowState(window: Maintenance, now: number): 'scheduled' | 'in_progress' | 'completed' | 'cancelled' {
    if (window.cancelled) return 'cancelled'
    if (inWindow(window, now)) return 'in_progress'
    return dateOfMoment(window.ends).getTime() <= now ? 'completed' : 'scheduled'
}

/** One service: its latency and errors live, what it calls on, its last ninety days, its deploys and its maintenance. */
export function Service({
    id,
    day,
    me,
    options,
    onReport,
}: {
    id: ServiceId
    /** A day of its record to say what happened on, `YYYY-MM-DD`. */
    day: string | undefined
    me: Person
    options: Settings
    onReport: () => void
}) {
    const service = SERVICE_BY_ID[id]
    const state = useLive()
    const rows = useRows()
    const uptime = useUptime()
    const [deploying, setDeploying] = useState(false)
    const [scheduling, setScheduling] = useState(false)
    const health = state.health[id]
    const readings = state.readings[id]
    const last = readings[readings.length - 1]
    const days = uptime[id]
    const overall = overallUptime(days)

    const x = useMemo(() => readings.map((reading) => formatClock(new Date(reading.at), options.clock)), [readings, options.clock])
    const latency = useMemo(
        () => [
            { name: 'p95', values: readings.map((reading) => Math.round(reading.p95)) },
            { name: 'p50', values: readings.map((reading) => Math.round(reading.p50)) },
        ],
        [readings],
    )
    const errors = useMemo(() => [{ name: 'Errors', values: readings.map((reading) => Number(reading.errors.toFixed(2))) }], [readings])
    const latencySteps = useMemo(
        () => [
            { color: 'good' },
            { value: Math.round(service.latency * 1.8), color: 'warning' },
            { value: Math.round(service.latency * 3.5), color: 'critical' },
        ],
        [service.latency],
    )

    const mine = (rows.deploys ?? []).filter((deploy) => deploy.service === id).sort((left, right) => right.at.localeCompare(left.at))
    const running = mine.find((deploy) => deploy.state === 'succeeded')?.version ?? service.version
    const windows = (rows.maintenance ?? [])
        .filter((window) => window.service === id)
        .sort((left, right) => right.starts.localeCompare(left.starts))
    const now = state.at
    const onDay =
        day === undefined
            ? []
            : (rows.incidents ?? []).filter((incident) => {
                  if (!incident.services.includes(id)) return false
                  const from = new Date(`${day}T00:00`).getTime()
                  const to = from + 24 * 60 * 60 * 1000
                  const closed = incident.resolved === null ? Date.now() : new Date(incident.resolved).getTime()
                  return new Date(incident.opened).getTime() < to && closed > from
              })

    const rollBack = (deploy: Deploy) =>
        void deploys.create({
            service: id,
            version: previousVersion(deploy.version),
            at: new Date().toISOString(),
            by: me,
            state: 'running',
            note: `Rolled back from ${deploy.version}`,
        })

    const deployColumns: DataColumn<Deploy>[] = [
        {
            id: 'version',
            header: 'Version',
            width: '6.5rem',
            cell: (deploy) => <span className="font-mono">{deploy.version}</span>,
            sortValue: (deploy) => deploy.version,
        },
        { id: 'state', header: 'State', width: '7.5rem', cell: (deploy) => <StatusChip status={deploy.state} />, stack: 'secondary' },
        { id: 'note', header: 'What it changed', width: 'minmax(8rem,1fr)', cell: (deploy) => deploy.note || '-', stack: 'primary' },
        {
            id: 'by',
            header: 'By',
            width: '6.5rem',
            cell: (deploy) => (
                <Row gap="2xs" inline>
                    <PersonAvatar name={deploy.by} size="2xs" />
                    {deploy.by}
                </Row>
            ),
            stack: 'secondary',
        },
        {
            id: 'at',
            header: 'When',
            width: '7.5rem',
            cell: (deploy) => <RelativeTime date={deploy.at} />,
            sortValue: (deploy) => deploy.at,
            stack: 'secondary',
        },
    ]

    const windowColumns: DataColumn<Maintenance>[] = [
        { id: 'title', header: 'Work', width: 'minmax(8rem,1fr)', cell: (window) => window.title },
        {
            id: 'state',
            header: 'State',
            width: '8rem',
            cell: (window) => <StatusChip status={windowState(window, now)} />,
            stack: 'secondary',
        },
        {
            id: 'when',
            header: 'When',
            width: '12rem',
            cell: (window) =>
                `${formatMoment(dateOfMoment(window.starts), options.clock)} to ${formatClock(dateOfMoment(window.ends), options.clock, false)}`,
            sortValue: (window) => window.starts,
            stack: 'secondary',
        },
    ]

    const windowActions = (window: Maintenance): DataAction[] => {
        const where = windowState(window, now)
        const soon = new Date(Date.now() + 2 * 60 * 1000)
        if (where === 'scheduled')
            return [
                {
                    id: 'start',
                    label: 'Start now, for two minutes',
                    icon: <Play />,
                    onSelect: () => void maintenance.update(window.id, { starts: momentOf(new Date()), ends: momentOf(soon) }),
                },
                {
                    id: 'cancel',
                    label: 'Cancel',
                    icon: <XIcon />,
                    destructive: true,
                    onSelect: () => void maintenance.update(window.id, { cancelled: true }),
                },
            ]
        if (where === 'in_progress')
            return [
                {
                    id: 'end',
                    label: 'End now',
                    icon: <CircleStop />,
                    onSelect: () => void maintenance.update(window.id, { ends: momentOf(new Date()) }),
                },
            ]
        return [{ id: 'remove', label: 'Remove', icon: <XIcon />, destructive: true, onSelect: () => void maintenance.remove(window.id) }]
    }

    const callsOn = service.dependsOn.join(', ') || 'nothing'
    const calledBy = dependents(id)
        .map((one) => one.id)
        .join(', ')

    return (
        <Stack gap="page">
            <PageHeader
                title={service.id}
                code={service.host}
                description={service.description}
                onBack={() => go('/services')}
                meta={<StatusChip status={health} />}
                actions={
                    <>
                        <Button variant="outline" onClick={onReport}>
                            <Siren aria-hidden />
                            Report incident
                        </Button>
                        <Button variant="outline" onClick={() => setScheduling(true)}>
                            <CalendarClock aria-hidden />
                            Schedule maintenance
                        </Button>
                        <Button
                            onClick={() => setDeploying(true)}
                            reason={mine.some((deploy) => deploy.state === 'running') ? 'A deploy is running.' : undefined}
                        >
                            <Rocket aria-hidden />
                            Deploy
                        </Button>
                    </>
                }
            />
            <KpiRow
                items={[
                    { id: 'state', label: 'State', value: HEALTH_WORDS[health] },
                    {
                        id: 'p95',
                        label: 'Latency p95',
                        value: last === undefined ? '-' : Math.round(last.p95),
                        unit: 'ms',
                        note: `usually ${formatMs(service.latency)}`,
                    },
                    {
                        id: 'errors',
                        label: 'Errors',
                        value: last === undefined ? '-' : formatRate(last.errors),
                        note: `usually ${formatRate(service.errors)}`,
                    },
                    { id: 'load', label: 'Requests', value: last === undefined ? '-' : formatCount(last.load), unit: '/s' },
                    { id: 'uptime', label: 'Uptime, 90 days', value: overall === null ? '-' : formatUptime(overall) },
                    { id: 'version', label: 'Running', value: running },
                ]}
            />
            <DashboardGrid>
                <TimeSeriesPanel
                    title="Latency"
                    subtitle="live, in milliseconds"
                    x={x}
                    series={latency}
                    unit="ms"
                    thresholds={latencySteps}
                    labelEvery={15}
                    min={0}
                    span="half"
                />
                <TimeSeriesPanel
                    title="Errors"
                    subtitle="live, share of requests"
                    x={x}
                    series={errors}
                    unit="%"
                    decimals={2}
                    thresholds={[{ color: 'good' }, { value: 1.5, color: 'warning' }, { value: 5, color: 'critical' }]}
                    labelEvery={15}
                    min={0}
                    span="half"
                />
                <DashboardPanel
                    title="Dependencies"
                    subtitle="every service, this one marked"
                    span="half"
                    flush
                    footer={<MetaLine items={[`Calls on ${callsOn}`, calledBy === '' ? 'nothing calls on it' : `called by ${calledBy}`]} />}
                >
                    <ServiceGraph health={state.health} selected={id} onSelect={(next) => go(`/services/${next}`)} />
                </DashboardPanel>
                <DashboardPanel
                    title="Uptime"
                    subtitle={overall === null ? 'the last 90 days' : `${formatUptime(overall)} over 90 days`}
                    span="half"
                >
                    <Stack gap="lg">
                        <UptimeBar
                            label={`${id}, the last 90 days`}
                            days={days}
                            onSelect={(picked) => go(`/services/${id}/${picked.date}`)}
                        />
                        {day === undefined ? (
                            <MetaLine items={['Press a day to see what happened on it.']} />
                        ) : onDay.length === 0 ? (
                            <MetaLine items={[`Nothing happened to ${id} on ${formatUptimeDay(day)}.`]} />
                        ) : (
                            <Timeline
                                events={onDay.map((incident) => ({
                                    id: incident.id,
                                    title: (
                                        <a href={`#/incidents/${incident.id}`} className="underline-offset-2 hover:underline">
                                            {incident.code} {incident.title}
                                        </a>
                                    ),
                                    at: formatUptimeDay(day),
                                    detail: `${incident.severity}, ${incident.state}`,
                                    tone: incident.state,
                                }))}
                            />
                        )}
                    </Stack>
                </DashboardPanel>
                <DashboardPanel title="Deploys" subtitle={`${running} running`} span="half" flush>
                    <DataTable
                        variant="list"
                        stackBelow={420}
                        minWidth="auto"
                        columns={deployColumns}
                        rows={mine}
                        rowKey={(deploy) => deploy.id}
                        defaultSort={{ column: 'at', direction: 'desc' }}
                        rowActions={(deploy) =>
                            deploy.state === 'succeeded' && deploy.version === running
                                ? [
                                      {
                                          id: 'rollback',
                                          label: `Roll back to ${previousVersion(deploy.version)}`,
                                          icon: <Undo2 />,
                                          onSelect: () => rollBack(deploy),
                                      },
                                  ]
                                : []
                        }
                        empty="No deploys yet."
                    />
                </DashboardPanel>
                <DashboardPanel
                    title="Maintenance"
                    subtitle={`${String(windows.filter((window) => windowState(window, now) === 'scheduled').length)} scheduled`}
                    span="half"
                    flush
                    actions={
                        <Button variant="ghost" size="sm" onClick={() => setScheduling(true)}>
                            Schedule
                        </Button>
                    }
                >
                    <DataTable
                        variant="list"
                        stackBelow={420}
                        minWidth="auto"
                        columns={windowColumns}
                        rows={windows}
                        rowKey={(window) => window.id}
                        rowActions={windowActions}
                        empty="Nothing scheduled."
                    />
                </DashboardPanel>
            </DashboardGrid>
            <DeployDialog open={deploying} onOpenChange={setDeploying} service={id} running={running} me={me} />
            <MaintenanceDialog open={scheduling} onOpenChange={setScheduling} service={id} me={me} />
        </Stack>
    )
}
