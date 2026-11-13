import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import { DashboardArrange, type DashboardLayoutItem, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { DashboardPanel, KpiRow } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { ListRow, ListRows } from '@winterop-com/sokkel-ui/ListRow'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { formatUptime, overallUptime } from '@winterop-com/sokkel-ui/UptimeBar'
import {
    Activity,
    CalendarClock,
    CircleCheck,
    Gauge,
    Globe,
    LayoutGrid,
    Pause,
    PhoneCall,
    Play,
    Rocket,
    RotateCcw,
    Siren,
    TriangleAlert,
    Waves,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { dateOfMoment, SERVICE_IDS, SERVICES, SITES } from '../data'
import { layout as layoutStore, setLayout, useServiceOrder } from '../layout'
import { useLive } from '../live'
import { IncidentTable } from '../parts/IncidentTable'
import { ServiceTiles } from '../parts/ServiceTiles'
import { SitesMap } from '../parts/SitesMap'
import { UptimeList } from '../parts/UptimeList'
import { useUptime } from '../parts/uptime'
import { useRows } from '../rows'
import { setSettings, type Settings } from '../settings'
import { formatClock, formatCount, formatMoment, formatMs } from '../status'

/** Every panel the board can show, each fed by the live readings and the board's rows. */
const WIDGETS = [
    { id: 'sites', label: 'Sites', icon: <Globe aria-hidden />, span: 'two-thirds' },
    { id: 'open', label: 'Open incidents', icon: <Siren aria-hidden />, span: 'third' },
    { id: 'uptime', label: 'Uptime', icon: <Activity aria-hidden />, span: 'full' },
    { id: 'latency', label: 'Latency', icon: <Gauge aria-hidden />, span: 'half' },
    { id: 'requests', label: 'Requests', icon: <Waves aria-hidden />, span: 'half' },
    { id: 'errors', label: 'Errors', icon: <TriangleAlert aria-hidden />, span: 'half' },
    { id: 'on-call', label: 'On call', icon: <PhoneCall aria-hidden />, span: 'third' },
    { id: 'maintenance', label: 'Maintenance', icon: <CalendarClock aria-hidden />, span: 'third' },
    { id: 'deploys', label: 'Deploys', icon: <Rocket aria-hidden />, span: 'third' },
] as const satisfies readonly DashboardWidget[]

type WidgetId = (typeof WIDGETS)[number]['id']

const LABELS = Object.fromEntries(WIDGETS.map((widget) => [widget.id, widget.label])) as Record<WidgetId, string>

/** The board as it comes: the map beside what is open, then the last ninety days. */
const DEFAULT_LAYOUT: DashboardLayoutItem[] = WIDGETS.slice(0, 3).map((widget) => ({ id: widget.id, span: widget.span }))

const sameLayout = (left: readonly DashboardLayoutItem[], right: readonly DashboardLayoutItem[]) =>
    left.length === right.length && left.every((item, index) => item.id === right[index]?.id && item.span === right[index]?.span)

/**
 * The board: the figures, every service as a tile in the person's order, and the panels they
 * arranged, the sites on a map, the open incidents and the last ninety days to begin with.
 */
export function Overview({ options, onReport }: { options: Settings; onReport: () => void }) {
    const state = useLive()
    const rows = useRows()
    const uptime = useUptime()
    const services = useServiceOrder()
    const kept = useStore(layoutStore).overview
    const [arranging, setArranging] = useState(false)
    const [site, setSite] = useState<string | null>(null)
    const layout = (kept ?? DEFAULT_LAYOUT).filter((item) => LABELS[item.id as WidgetId] !== undefined)
    const keep = (next: DashboardLayoutItem[]) => setLayout({ overview: next })

    const open = (rows.incidents ?? []).filter((incident) => incident.state !== 'resolved')
    const working = SERVICE_IDS.filter((id) => state.health[id] === 'operational').length
    const sitesWorking = SITES.filter((one) => state.siteHealth[one.id] === 'operational').length
    const last = (id: (typeof SERVICE_IDS)[number]) => state.readings[id][state.readings[id].length - 1]
    const requests = SERVICE_IDS.reduce((sum, id) => sum + (last(id)?.load ?? 0), 0)
    const apiP95 = last('api')?.p95 ?? 0
    const all = SERVICE_IDS.map((id) => overallUptime(uptime[id])).filter((value): value is number => value !== null)
    const average = all.length === 0 ? null : all.reduce((sum, value) => sum + value, 0) / all.length

    const x = useMemo(
        () => state.readings.api.map((reading) => formatClock(new Date(reading.at), options.clock)),
        [state.readings, options.clock],
    )
    const series = (pick: (reading: (typeof state.readings.api)[number]) => number) =>
        services.map((service) => ({ name: service.id, values: state.readings[service.id].map(pick) }))
    const windows = (rows.maintenance ?? [])
        .filter((window) => !window.cancelled && dateOfMoment(window.ends).getTime() > state.at)
        .sort((left, right) => left.starts.localeCompare(right.starts))
        .slice(0, 5)
    const deploys = [...(rows.deploys ?? [])].sort((left, right) => right.at.localeCompare(left.at)).slice(0, 6)
    const nextShift = (rows.shifts ?? [])
        .filter((shift) => new Date(shift.starts).getTime() > state.at)
        .sort((left, right) => left.starts.localeCompare(right.starts))[0]

    const panelOf = (item: DashboardLayoutItem): ReactNode => {
        const id = item.id as WidgetId
        const title = LABELS[id]
        switch (id) {
            case 'sites':
                return (
                    <DashboardPanel title={title} subtitle="by state, live" flush className="min-h-96">
                        <SitesMap
                            state={state}
                            open={open}
                            selected={site}
                            onSelectedChange={setSite}
                            onIncident={(incident) => go(`/incidents/${incident.id}`)}
                            className="min-h-80 flex-1"
                        />
                    </DashboardPanel>
                )
            case 'open':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle={open.length === 0 ? 'none' : String(open.length)}
                        flush
                        actions={
                            <Button variant="ghost" size="sm" onClick={() => go('/incidents')}>
                                All
                            </Button>
                        }
                    >
                        <IncidentTable
                            rows={open}
                            compact
                            className="min-h-0 flex-1"
                            empty={
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <CircleCheck aria-hidden />
                                        </EmptyMedia>
                                        <EmptyTitle>Nothing open</EmptyTitle>
                                        <EmptyDescription>Every incident is resolved.</EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            }
                        />
                    </DashboardPanel>
                )
            case 'uptime':
                return (
                    <DashboardPanel title={title} subtitle="the last 90 days">
                        <UptimeList
                            services={services}
                            health={state.health}
                            uptime={uptime}
                            onDay={(service, day) => go(`/services/${service.id}/${day.date}`)}
                        />
                    </DashboardPanel>
                )
            case 'latency':
                return (
                    <TimeSeriesPanel
                        title={title}
                        subtitle="p95 of each service, live"
                        x={x}
                        series={series((reading) => Math.round(reading.p95))}
                        unit="ms"
                        labelEvery={15}
                        min={0}
                        file="latency"
                    />
                )
            case 'requests':
                return (
                    <TimeSeriesPanel
                        title={title}
                        subtitle="per second, live"
                        x={x}
                        series={series((reading) => Math.round(reading.load))}
                        stacked
                        labelEvery={15}
                        min={0}
                        file="requests"
                    />
                )
            case 'errors':
                return (
                    <TimeSeriesPanel
                        title={title}
                        subtitle="share of requests, live"
                        x={x}
                        series={series((reading) => Number(reading.errors.toFixed(2)))}
                        unit="%"
                        decimals={2}
                        labelEvery={15}
                        min={0}
                        file="errors"
                    />
                )
            case 'on-call':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle={rows.onCall === undefined ? undefined : 'now'}
                        flush
                        actions={
                            <Button variant="ghost" size="sm" onClick={() => go('/on-call')}>
                                Rotation
                            </Button>
                        }
                        empty={rows.onCall === undefined}
                        words={{ empty: 'Nobody is on call.' }}
                    >
                        {rows.onCall !== undefined && (
                            <ListRows flush>
                                <ListRow
                                    icon={<PersonAvatar name={rows.onCall.person} size="sm" />}
                                    title={rows.onCall.person}
                                    detail={rows.onCall.note === '' ? 'On call now' : rows.onCall.note}
                                    aside={<RelativeTime date={rows.onCall.since} />}
                                    wrap
                                />
                                {nextShift !== undefined && (
                                    <ListRow
                                        icon={<PersonAvatar name={nextShift.person} size="sm" />}
                                        title={nextShift.person}
                                        detail="Next on call"
                                        aside={nextShift.starts}
                                    />
                                )}
                            </ListRows>
                        )}
                    </DashboardPanel>
                )
            case 'maintenance':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle="coming up"
                        flush
                        empty={windows.length === 0}
                        words={{ empty: 'No maintenance is planned.' }}
                    >
                        <ListRows flush>
                            {windows.map((window) => (
                                <ListRow
                                    key={window.id}
                                    icon={<CalendarClock className="size-4 text-muted-foreground" aria-hidden />}
                                    title={window.title}
                                    detail={`${window.service}, ${formatMoment(dateOfMoment(window.starts), options.clock)}`}
                                    href={`#/services/${window.service}`}
                                />
                            ))}
                        </ListRows>
                    </DashboardPanel>
                )
            case 'deploys':
                return (
                    <DashboardPanel
                        title={title}
                        subtitle="the latest"
                        flush
                        empty={deploys.length === 0}
                        words={{ empty: 'No deploys yet.' }}
                    >
                        <ListRows flush>
                            {deploys.map((deploy) => (
                                <ListRow
                                    key={deploy.id}
                                    icon={<Rocket className="size-4 text-muted-foreground" aria-hidden />}
                                    title={`${deploy.service} ${deploy.version}`}
                                    detail={<RelativeTime date={deploy.at} />}
                                    aside={<StatusChip status={deploy.state} />}
                                    href={`#/services/${deploy.service}`}
                                />
                            ))}
                        </ListRows>
                    </DashboardPanel>
                )
        }
    }

    const shown = new Set(layout.map((item) => item.id))

    return (
        <Stack gap="page">
            <PageHeader
                title="Overview"
                description={
                    arranging
                        ? 'Drag a panel by its grip to move it, set its width or remove it, and drag a widget in to add it.'
                        : options.live
                          ? `Live, a reading every ${String(options.interval / 1000)} s, the last at ${formatClock(new Date(state.at), options.clock)}.`
                          : `Paused at ${formatClock(new Date(state.at), options.clock)}.`
                }
                actions={
                    arranging ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => setLayout({ overview: null })}
                                reason={sameLayout(layout, DEFAULT_LAYOUT) ? 'The layout is the default.' : undefined}
                            >
                                <RotateCcw aria-hidden />
                                Reset layout
                            </Button>
                            <Button onClick={() => setArranging(false)}>Done</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setSettings({ live: !options.live })}>
                                {options.live ? <Pause aria-hidden /> : <Play aria-hidden />}
                                {options.live ? 'Pause' : 'Resume'}
                            </Button>
                            <Button variant="outline" onClick={() => setArranging(true)}>
                                <LayoutGrid aria-hidden />
                                Arrange
                            </Button>
                            <Button onClick={onReport}>
                                <Siren aria-hidden />
                                Report incident
                            </Button>
                        </>
                    )
                }
            />
            <KpiRow
                items={[
                    { id: 'services', label: 'Services operational', value: `${String(working)} of ${String(SERVICES.length)}` },
                    { id: 'sites', label: 'Sites operational', value: `${String(sitesWorking)} of ${String(SITES.length)}` },
                    { id: 'open', label: 'Open incidents', value: String(open.length), note: open[0]?.code },
                    { id: 'uptime', label: 'Uptime, 90 days', value: average === null ? '-' : formatUptime(average) },
                    { id: 'requests', label: 'Requests', value: formatCount(requests), unit: '/s', note: `api p95 ${formatMs(apiP95)}` },
                    { id: 'on-call', label: 'On call', value: rows.onCall?.person ?? '-', note: 'Hand over on the On call page' },
                ]}
            />
            <ServiceTiles services={services} state={state} uptime={uptime} />
            <DashboardArrange
                layout={layout}
                onLayoutChange={keep}
                renderPanel={panelOf}
                label={(item) => LABELS[item.id as WidgetId]}
                arranging={arranging}
                palette={WIDGETS.filter((widget) => !shown.has(widget.id))}
                onAdd={(widget, index) => keep(insertItem(layout, { id: widget.id, span: widget.span }, index))}
            />
        </Stack>
    )
}
