/**
 * Every kind of widget a dashboard can hold, each drawn from the live source with its options:
 * stat tiles, line, area and bar charts, a gauge, the recent runs, the activity, a service's log,
 * the sites on a map, a note, a to-do list, what is coming up, uptime, who is on call, and the
 * projects' share of the runs.
 */

import { BarPanel } from '@winterop-com/sokkel-ui-charts/dashboard/BarPanel'
import { GaugePanel } from '@winterop-com/sokkel-ui-charts/dashboard/GaugePanel'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { categoricalScale, classCounts } from '@winterop-com/sokkel-ui-maps/scale'
import { ActivityList, type ActivityItem } from '@winterop-com/sokkel-ui/ActivityList'
import { BarList } from '@winterop-com/sokkel-ui/BarList'
import { CheckboxField } from '@winterop-com/sokkel-ui/CheckboxField'
import { DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import type { Threshold } from '@winterop-com/sokkel-ui/dashboard/thresholds'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { STATUS_CSS } from '@winterop-com/sokkel-ui/lib/status'
import { ListRow, ListRows } from '@winterop-com/sokkel-ui/ListRow'
import { LogView } from '@winterop-com/sokkel-ui/LogView'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { QuickAdd } from '@winterop-com/sokkel-ui/QuickAdd'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { UptimeBar } from '@winterop-com/sokkel-ui/UptimeBar'
import type { Feature, FeatureCollection, Point } from 'geojson'
import {
    Activity,
    CalendarClock,
    ChartArea,
    ChartColumn,
    ChartLine,
    CircleGauge,
    FolderKanban,
    Gauge,
    Globe,
    ListChecks,
    NotebookPen,
    PhoneCall,
    ScrollText,
    SignalHigh,
    Table2,
    type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { todos } from './collections'
import { metricOf, onCall, SITES, upcoming, useLive, type LiveState, type Run, type Site } from './live'
import { METRICS, PROJECTS, SERVICES, type Metric, type Prefs, type Widget, type WidgetKind } from './model'

/** Each kind's name and icon, as the palette and the configure dialog say them. */
export const KINDS: Record<WidgetKind, { label: string; icon: LucideIcon }> = {
    stat: { label: 'Stat', icon: Gauge },
    trend: { label: 'Chart', icon: ChartLine },
    bars: { label: 'Bar chart', icon: ChartColumn },
    gauge: { label: 'Gauge', icon: CircleGauge },
    runs: { label: 'Recent runs', icon: Table2 },
    activity: { label: 'Activity', icon: Activity },
    log: { label: 'Log', icon: ScrollText },
    map: { label: 'Sites map', icon: Globe },
    note: { label: 'Note', icon: NotebookPen },
    todo: { label: 'To-do list', icon: ListChecks },
    upcoming: { label: 'Upcoming', icon: CalendarClock },
    uptime: { label: 'Uptime', icon: SignalHigh },
    oncall: { label: 'On call', icon: PhoneCall },
    projects: { label: 'Projects', icon: FolderKanban },
}

/** The icon of a palette entry, by the look it adds. */
export const PALETTE_ICONS: Record<string, LucideIcon> = { area: ChartArea, line: ChartLine }

/** The title a widget shows: its own, or what its kind and options make it. */
export function titleOf(widget: Widget): string {
    if (widget.title !== undefined && widget.title.trim() !== '') return widget.title
    const { options } = widget
    switch (widget.kind) {
        case 'stat':
        case 'gauge':
            return METRICS[options.metric ?? 'runs'].label
        case 'trend':
            return options.compare !== undefined && options.compare !== 'none'
                ? `${METRICS[options.metric ?? 'runs'].label} and ${METRICS[options.compare].label.toLowerCase()}`
                : METRICS[options.metric ?? 'runs'].label
        case 'bars':
            return `Runs by ${options.group ?? 'job'}`
        case 'log':
            return `${options.service ?? 'api'} log`
        case 'runs':
            return options.failedOnly === true ? 'Recent failures' : 'Recent runs'
        default:
            return KINDS[widget.kind].label
    }
}

const HIGH_IS_BAD: Partial<Record<Metric, Threshold[]>> = {
    failures: [{ color: 'good' }, { value: 4, color: 'warning' }, { value: 8, color: 'critical' }],
    queue: [{ color: 'good' }, { value: 25, color: 'warning' }, { value: 45, color: 'critical' }],
    latency: [{ color: 'good' }, { value: 200, color: 'warning' }, { value: 300, color: 'critical' }],
    cpu: [{ color: 'good' }, { value: 70, color: 'warning' }, { value: 85, color: 'critical' }],
    memory: [{ color: 'good' }, { value: 75, color: 'warning' }, { value: 88, color: 'critical' }],
    success: [{ color: 'critical' }, { value: 90, color: 'warning' }, { value: 95, color: 'good' }],
}

const two = (value: number) => String(value).padStart(2, '0')

/** A time of day as the settings write it. */
export function clockOf(at: number, clock: Prefs['clock'], seconds = false): string {
    const date = new Date(at)
    const minutes = `${two(date.getMinutes())}${seconds ? `:${two(date.getSeconds())}` : ''}`
    if (clock === '24h') return `${two(date.getHours())}:${minutes}`
    const hours = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12
    return `${String(hours)}:${minutes} ${date.getHours() < 12 ? 'am' : 'pm'}`
}

/** How long ago, said shortly. */
export function ago(at: number, now: number): string {
    const seconds = Math.max(0, Math.round((now - at) / 1000))
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${String(seconds)} s ago`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${String(minutes)} min ago`
    return `${String(Math.round(minutes / 60))} h ago`
}

/** How long until, said shortly. */
function within(at: number, now: number): string {
    const minutes = Math.max(0, Math.round((at - now) / 60_000))
    if (minutes < 1) return 'now'
    if (minutes < 60) return `in ${String(minutes)} min`
    const hours = Math.floor(minutes / 60)
    return `in ${String(hours)} h${minutes % 60 === 0 ? '' : ` ${String(minutes % 60)} min`}`
}

/** What a widget reads besides its own options. */
export interface WidgetContext {
    prefs: Prefs
    /** Opens the widget's options, where a widget offers a way there, such as an empty note. */
    onConfigure?: () => void
}

/** Draws a widget from the live source. */
export function WidgetView({ widget, context }: { widget: Widget; context: WidgetContext }) {
    const state = useLive()
    return <>{draw(widget, state, context)}</>
}

function draw(widget: Widget, state: LiveState, { prefs, onConfigure }: WidgetContext): ReactNode {
    const title = titleOf(widget)
    const { options } = widget
    switch (widget.kind) {
        case 'stat': {
            const metric = options.metric ?? 'runs'
            const { now, values } = metricOf(state, metric)
            const before = values[Math.max(0, values.length - 11)] ?? now
            const change = before === 0 ? 0 : ((now - before) / before) * 100
            const better = metric === 'runs' || metric === 'success' ? change >= 0 : change <= 0
            return (
                <StatPanel
                    title={title}
                    value={now}
                    unit={METRICS[metric].unit}
                    decimals={METRICS[metric].decimals}
                    thresholds={HIGH_IS_BAD[metric]}
                    color={HIGH_IS_BAD[metric] === undefined ? METRICS[metric].color : undefined}
                    sparkline={values}
                    delta={`${change >= 0 ? '+' : ''}${change.toFixed(0)}%`}
                    good={Math.abs(change) < 1 ? undefined : better}
                />
            )
        }
        case 'gauge': {
            const metric = options.metric ?? 'cpu'
            const { now } = metricOf(state, metric)
            const max = metric === 'latency' ? 500 : metric === 'queue' ? 60 : metric === 'runs' ? 100 : 100
            return (
                <GaugePanel
                    title={title}
                    value={now}
                    min={0}
                    max={max}
                    unit={METRICS[metric].unit}
                    decimals={METRICS[metric].decimals}
                    thresholds={HIGH_IS_BAD[metric]}
                    color={METRICS[metric].color}
                />
            )
        }
        case 'trend': {
            const metric = options.metric ?? 'runs'
            const compare =
                options.compare === undefined || options.compare === 'none' || options.compare === metric ? null : options.compare
            const x = state.readings.map((reading) => clockOf(reading.at, prefs.clock, true))
            const series: PanelSeries[] = [metric, ...(compare === null ? [] : [compare])].map((one) => ({
                name: METRICS[one].label,
                values: metricOf(state, one).values,
                color: METRICS[one].color,
            }))
            const unit = compare === null || METRICS[compare].unit === METRICS[metric].unit ? METRICS[metric].unit : undefined
            return (
                <TimeSeriesPanel
                    title={title}
                    subtitle="live"
                    x={x}
                    series={series}
                    unit={unit}
                    fill={options.style === 'area' ? 'gradient' : 'none'}
                    min={0}
                    labelEvery={15}
                    legend={compare === null ? 'none' : 'list'}
                    file={widget.id}
                />
            )
        }
        case 'bars': {
            const group = options.group ?? 'job'
            const counts = state.counts[group] as Record<string, number>
            const names = Object.keys(counts)
            return (
                <BarPanel
                    title={title}
                    subtitle="since midnight"
                    x={names}
                    series={[{ name: 'Runs', values: names.map((name) => counts[name] ?? 0), color: 'chart-1' }]}
                    horizontal={group !== 'project'}
                    legend="none"
                    file={widget.id}
                />
            )
        }
        case 'runs':
            return (
                <RunsWidget title={title} state={state} rows={options.rows ?? 6} failedOnly={options.failedOnly === true} prefs={prefs} />
            )
        case 'activity': {
            const items: ActivityItem[] = state.happenings.slice(0, options.rows ?? 8).map((one) => ({
                id: one.id,
                text: one.text,
                when: ago(one.at, state.at),
                tone: one.tone,
            }))
            return (
                <DashboardPanel
                    title={title}
                    subtitle="live"
                    flush
                    empty={items.length === 0}
                    words={{ empty: 'Nothing has happened yet.' }}
                >
                    <ActivityList items={items} head={false} />
                </DashboardPanel>
            )
        }
        case 'log': {
            const service = options.service ?? 'api'
            return (
                <DashboardPanel title={title} subtitle="following" flush>
                    <LogView lines={state.logs[service]} follow framed={false} className="h-72 min-h-0 flex-1" />
                </DashboardPanel>
            )
        }
        case 'map':
            return (
                <DashboardPanel title={title} subtitle="round trips, live" flush className="min-h-96">
                    <SitesMap sites={state.sites} className="min-h-80 flex-1" />
                </DashboardPanel>
            )
        case 'note': {
            const text = options.text ?? ''
            return (
                <DashboardPanel
                    title={title}
                    empty={text.trim() === '' && onConfigure === undefined}
                    words={{ empty: 'This note is empty.' }}
                >
                    {text.trim() === '' ? (
                        onConfigure !== undefined && (
                            <Button variant="outline" size="sm" onClick={onConfigure}>
                                Write the note
                            </Button>
                        )
                    ) : (
                        <Markdown content={text} scale="message" />
                    )}
                </DashboardPanel>
            )
        }
        case 'todo':
            return <TodoWidget id={widget.id} title={title} hideDone={options.hideDone === true} />
        case 'upcoming': {
            const fires = upcoming(state.at, options.rows ?? 6)
            return (
                <DashboardPanel title={title} subtitle="on the schedules" flush>
                    <ListRows flush>
                        {fires.map((fire) => (
                            <ListRow
                                key={fire.id}
                                icon={<CalendarClock className="size-4 text-muted-foreground" aria-hidden />}
                                title={fire.job}
                                mono
                                detail={`${fire.project}, ${fire.what}`}
                                aside={
                                    <span className="tabular-nums" title={within(fire.at, state.at)}>
                                        {clockOf(fire.at, prefs.clock)}
                                    </span>
                                }
                            />
                        ))}
                    </ListRows>
                </DashboardPanel>
            )
        }
        case 'uptime':
            return (
                <DashboardPanel title={title} subtitle="the last 90 days">
                    <Stack gap="lg">
                        {SERVICES.map((service) => (
                            <Stack key={service} gap="xs">
                                <span className="font-mono text-sm">{service}</span>
                                <UptimeBar label={`${service}, the last 90 days`} days={state.uptime[service]} minBarWidth={3} />
                            </Stack>
                        ))}
                    </Stack>
                </DashboardPanel>
            )
        case 'oncall': {
            const rota = onCall(state.at)
            return (
                <DashboardPanel title={title} subtitle="hands over at 09:00" flush>
                    <ListRows flush>
                        <ListRow
                            icon={<PersonAvatar name={rota.now} size="sm" />}
                            title={rota.now}
                            detail={`On call until ${clockOf(rota.until, prefs.clock)} tomorrow`}
                            aside={<StatusChip status="running" label="now" />}
                        />
                        {options.showNext !== false && (
                            <ListRow
                                icon={<PersonAvatar name={rota.next} size="sm" />}
                                title={rota.next}
                                detail="Next on call"
                                aside={within(rota.until, state.at)}
                            />
                        )}
                    </ListRows>
                </DashboardPanel>
            )
        }
        case 'projects': {
            const total = PROJECTS.reduce((sum, project) => sum + state.counts.project[project], 0)
            return (
                <DashboardPanel title={title} subtitle="share of today's runs">
                    <BarList
                        label="Runs by project"
                        items={PROJECTS.map((project) => ({
                            label: project,
                            value: total === 0 ? 0 : state.counts.project[project] / total,
                            note: `${String(state.counts.project[project])} runs`,
                        }))}
                    />
                </DashboardPanel>
            )
        }
    }
}

function RunsWidget({
    title,
    state,
    rows,
    failedOnly,
    prefs,
}: {
    title: string
    state: LiveState
    rows: number
    failedOnly: boolean
    prefs: Prefs
}) {
    const shown = (failedOnly ? state.runs.filter((run) => run.state === 'failed') : state.runs).slice(0, rows)
    const columns: DataColumn<Run>[] = [
        {
            id: 'job',
            header: 'Job',
            width: 'minmax(8rem,1fr)',
            cell: (run) => <span className="font-mono">{run.job}</span>,
            stack: 'primary',
        },
        {
            id: 'project',
            header: 'Project',
            width: '6rem',
            cell: (run) => <span className="text-muted-foreground">{run.project}</span>,
            stack: 'line',
        },
        { id: 'state', header: 'State', width: '7rem', cell: (run) => <StatusChip status={run.state} />, stack: 'secondary' },
        {
            id: 'when',
            header: 'Started',
            width: '5rem',
            align: 'end',
            cell: (run) => (
                <span className="text-muted-foreground tabular-nums" title={ago(run.started, state.at)}>
                    {clockOf(run.started, prefs.clock)}
                </span>
            ),
        },
    ]
    return (
        <DashboardPanel
            title={title}
            subtitle="live"
            flush
            empty={shown.length === 0}
            words={{ empty: failedOnly ? 'Nothing has failed lately.' : 'No run yet.' }}
        >
            <DataTable
                variant="list"
                framed={false}
                minWidth="auto"
                stackBelow={360}
                columns={columns}
                rows={shown}
                rowKey={(run) => run.id}
            />
        </DashboardPanel>
    )
}

function TodoWidget({ id, title, hideDone }: { id: string; title: string; hideDone: boolean }) {
    const { rows } = useCollection(todos)
    const mine = (rows ?? []).filter((todo) => todo.widget === id).sort((left, right) => left.created - right.created)
    const done = mine.filter((todo) => todo.done)
    const shown = hideDone ? mine.filter((todo) => !todo.done) : mine
    return (
        <DashboardPanel
            title={title}
            subtitle={`${String(mine.length - done.length)} open`}
            loading={rows === undefined}
            actions={
                done.length > 0 && (
                    <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                            for (const todo of done) void todos.remove(todo.id)
                        }}
                    >
                        Clear done
                    </Button>
                )
            }
        >
            <Stack gap="md">
                <QuickAdd
                    placeholder="Add a to-do"
                    onAdd={async (text) => {
                        await todos.create({ widget: id, text, done: false, created: Date.now() })
                    }}
                />
                {shown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{mine.length === 0 ? 'Nothing to do yet.' : 'Everything is done.'}</p>
                ) : (
                    <Stack gap="sm">
                        {shown.map((todo) => (
                            <CheckboxField
                                key={todo.id}
                                label={todo.text}
                                checked={todo.done}
                                onCheckedChange={(checked) => void todos.update(todo.id, { done: checked })}
                            />
                        ))}
                    </Stack>
                )}
            </Stack>
        </DashboardPanel>
    )
}

const SITE_WORDS: Record<Site['state'], string> = { operational: 'Operational', degraded: 'Slow', outage: 'Down' }
const SITE_COLOR: Record<Site['state'], string> = {
    operational: STATUS_CSS.good,
    degraded: STATUS_CSS.warning,
    outage: STATUS_CSS.critical,
}
const SCALE = categoricalScale(
    (['operational', 'degraded', 'outage'] as const).map((state) => ({ value: state, label: SITE_WORDS[state], color: SITE_COLOR[state] })),
)
const stateOfPoint = (feature: Feature) => (feature.properties as { state?: Site['state'] } | null)?.state

/** Tidevann's sites on a map, each in its state's color; choosing one opens its card. */
function SitesMap({ sites, className }: { sites: readonly Site[]; className?: string }) {
    const [selected, setSelected] = useState<string | null>(null)
    // The points change only when a site's state does, so the map is not redrawn every tick.
    const signature = sites.map((site) => site.state).join(' ')
    const data = useMemo<FeatureCollection<Point, { name: string; state: Site['state'] }>>(
        () => ({
            type: 'FeatureCollection',
            features: SITES.map((site, index) => ({
                type: 'Feature',
                id: site.id,
                geometry: { type: 'Point', coordinates: site.at },
                properties: { name: site.city, state: (signature.split(' ')[index] ?? 'operational') as Site['state'] },
            })),
        }),
        [signature],
    )
    const tally = classCounts(
        SCALE,
        data.features.map((feature) => feature.properties.state),
    )
    const site = sites.find((one) => one.id === selected)
    const feature = data.features.find((one) => one.id === selected)
    return (
        <MapView label="Sites by state" framed={false} selected={selected} onSelectedChange={(id) => setSelected(id)} className={className}>
            <PointLayer id="sites" data={data} scale={SCALE} value={stateOfPoint} radius={7} />
            <MapOverlay corner="bottom-left">
                <MapLegend title="Sites" description={`${String(sites.length)} cities`} scale={SCALE} shape="point" counts={tally.counts} />
            </MapOverlay>
            {site !== undefined && feature !== undefined && (
                <MapPopup
                    feature={feature as Feature}
                    title={site.city}
                    description={site.country}
                    rows={[
                        { label: 'State', value: SITE_WORDS[site.state], color: SITE_COLOR[site.state] },
                        { label: 'Round trip', value: `${String(site.latency)} ms` },
                    ]}
                    onClose={() => setSelected(null)}
                />
            )}
        </MapView>
    )
}
