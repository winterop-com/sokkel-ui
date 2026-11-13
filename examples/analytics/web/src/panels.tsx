/**
 * The dashboard's panels, each reading the range, comparison and segment the address names, so the
 * overview, the revenue page and a report draw the same panel the same way.
 */

import { ActivityList, type ActivityItem } from '@winterop-com/sokkel-ui/ActivityList'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DashboardPanel } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { BarPanel } from '@winterop-com/sokkel-ui-charts/dashboard/BarPanel'
import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import { TimeSeriesPanel } from '@winterop-com/sokkel-ui-charts/dashboard/TimeSeriesPanel'
import type { PanelSeries } from '@winterop-com/sokkel-ui-charts/dashboard/series'
import { MapLegend } from '@winterop-com/sokkel-ui-maps/MapLegend'
import { MapPopup } from '@winterop-com/sokkel-ui-maps/MapPopup'
import { MapOverlay, MapView } from '@winterop-com/sokkel-ui-maps/MapView'
import { PointLayer } from '@winterop-com/sokkel-ui-maps/PointLayer'
import { colorOf, sequentialScale } from '@winterop-com/sokkel-ui-maps/scale'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { Pause, Play } from 'lucide-react'
import { useMemo, useState, type ComponentType } from 'react'

import {
    cohorts,
    countries,
    flows,
    funnel,
    kpis,
    levels,
    refunds,
    revenue,
    revenueByPlan,
    revenueByRegion,
    revenueSeries,
    SIGNUP_FUNNEL,
    topCustomers,
    type Kpis,
    type Segment,
    type TopCustomer,
} from './metrics'
import { BEFORE_COLOR, PANEL_NAMES, PLAN_COLORS, PLAN_NAMES, PLANS, REGION_NAMES, REGIONS, type PanelId } from './model'
import { change, describe, PlanChip, points, useFeed, useSegment, useSpans } from './parts'
import { useLoaded } from './state'
import { go, rangeName, type Span } from './view'
import type { World } from './world'

/** The key figures a dashboard can show as a tile. */
export const KPIS = ['revenue', 'mrr', 'arr', 'active', 'paying', 'arpa', 'signups', 'conversion', 'churn', 'refunded'] as const
export type KpiId = (typeof KPIS)[number]

export const KPI_NAMES: Record<KpiId, string> = {
    revenue: 'Revenue',
    mrr: 'MRR',
    arr: 'ARR',
    active: 'Active teams',
    paying: 'Paying teams',
    arpa: 'ARPA',
    signups: 'Sign-ups',
    conversion: 'Conversion',
    churn: 'Churn',
    refunded: 'Refunded',
}

/** The key figures once per world, segment and span, so every tile of a dashboard reads one count. */
const counted = new WeakMap<World, Map<string, Kpis>>()

function kpisOnce(world: World, segment: Segment, span: Span): Kpis {
    let known = counted.get(world)
    if (known === undefined) {
        known = new Map()
        counted.set(world, known)
    }
    const key = [segment.plan, segment.region, span.from, span.to, span.step, span.buckets.length].join('|')
    let found = known.get(key)
    if (found === undefined) {
        found = kpis(world, segment, span)
        known.set(key, found)
    }
    return found
}

/** One key figure as a tile, with its trend over the range and its change from the period before. */
export function KpiPanel({ id }: { id: KpiId }) {
    const { world, money, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const now = kpisOnce(world, segment, span)
    const before = view.compare ? kpisOnce(world, segment, previous) : undefined
    const short = (value: number) => money(value, true)
    const versus = (a: number, b: number | undefined, higherIsGood = true) =>
        b === undefined ? {} : { delta: change(a, b), good: higherIsGood ? a >= b : a <= b }
    const title = KPI_NAMES[id]
    switch (id) {
        case 'revenue':
            return (
                <StatPanel
                    title={title}
                    value={now.revenue}
                    format={short}
                    color="chart-2"
                    sparkline={now.trend.revenue}
                    {...versus(now.revenue, before?.revenue)}
                    info="Invoices paid in the range, less refunds."
                    span="sixth"
                />
            )
        case 'mrr':
            return (
                <StatPanel
                    title={title}
                    value={now.mrr}
                    format={short}
                    color="chart-1"
                    sparkline={now.trend.mrr}
                    {...versus(now.mrr, before?.mrr)}
                    info="What the paying teams pay each month, at the end of the range."
                    span="sixth"
                />
            )
        case 'arr':
            return <StatPanel title={title} value={now.mrr * 12} format={short} color="chart-1" note="MRR times twelve" span="sixth" />
        case 'active':
            return (
                <StatPanel
                    title={title}
                    value={now.active}
                    color="chart-3"
                    sparkline={now.trend.active}
                    {...versus(now.active, before?.active)}
                    span="sixth"
                />
            )
        case 'paying':
            return <StatPanel title={title} value={now.paying} color="chart-2" {...versus(now.paying, before?.paying)} span="sixth" />
        case 'arpa': {
            const arpa = (of: Kpis) => (of.paying === 0 ? 0 : of.mrr / of.paying)
            return (
                <StatPanel
                    title={title}
                    value={arpa(now)}
                    format={(value) => money(value)}
                    color="chart-3"
                    {...versus(arpa(now), before === undefined ? undefined : arpa(before))}
                    info="Average revenue per account: MRR over the paying teams."
                    span="sixth"
                />
            )
        }
        case 'signups':
            return (
                <StatPanel
                    title={title}
                    value={now.signups}
                    color="chart-4"
                    sparkline={now.trend.signups}
                    {...versus(now.signups, before?.signups)}
                    span="sixth"
                />
            )
        case 'conversion':
            return (
                <StatPanel
                    title={title}
                    value={now.conversion}
                    unit="%"
                    decimals={1}
                    color="good"
                    sparkline={now.trend.conversion}
                    delta={before === undefined ? undefined : points(now.conversion, before.conversion)}
                    good={before === undefined ? undefined : now.conversion >= before.conversion}
                    span="sixth"
                />
            )
        case 'churn':
            return (
                <StatPanel
                    title={title}
                    value={now.churn}
                    unit="%"
                    decimals={1}
                    color="critical"
                    sparkline={now.trend.churn}
                    delta={before === undefined ? undefined : points(now.churn, before.churn)}
                    good={before === undefined ? undefined : now.churn <= before.churn}
                    info="Paying teams that left in the range, as a share of those paying at its start."
                    span="sixth"
                />
            )
        case 'refunded':
            return <RefundedPanel />
    }
}

/** What was paid back in the range, and over how many invoices. */
function RefundedPanel() {
    const { world, money, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const back = useMemo(() => refunds(world, segment, span.from, span.to), [world, segment, span])
    const before = useMemo(
        () => (view.compare ? refunds(world, segment, previous.from, previous.to) : undefined),
        [world, segment, previous, view.compare],
    )
    return (
        <StatPanel
            title={KPI_NAMES.refunded}
            value={back.amount}
            format={(value) => money(value)}
            color="warning"
            note={`${String(back.count)} ${back.count === 1 ? 'invoice' : 'invoices'}`}
            delta={before === undefined ? undefined : change(back.amount, before.amount)}
            good={before === undefined ? undefined : back.amount <= before.amount}
            span="sixth"
        />
    )
}

/** The six key figures of the overview as tiles, for a report. */
export function KpiPanels() {
    return (
        <>
            {(['revenue', 'mrr', 'active', 'signups', 'conversion', 'churn'] as const).map((id) => (
                <KpiPanel key={id} id={id} />
            ))}
        </>
    )
}

/** Revenue over the range, by plan, with the period before as a dashed line. */
export function RevenuePanel({ span: width = 'two-thirds' }: { span?: 'two-thirds' | 'full' }) {
    const { world, money, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const series = useMemo((): PanelSeries[] => {
        const byPlan = revenueByPlan(world, segment, span)
        const shown: PanelSeries[] = []
        if (segment.plan !== 'business') shown.push({ name: PLAN_NAMES.team, values: byPlan.team, color: PLAN_COLORS.team, stack: 'paid' })
        if (segment.plan !== 'team')
            shown.push({ name: PLAN_NAMES.business, values: byPlan.business, color: PLAN_COLORS.business, stack: 'paid' })
        if (view.compare)
            shown.push({ name: 'Period before', values: revenueSeries(world, segment, previous), color: BEFORE_COLOR, dashed: true })
        return shown
    }, [world, segment, span, previous, view.compare])
    return (
        <TimeSeriesPanel
            title="Revenue"
            subtitle={`by plan, ${rangeName(view.range).toLowerCase()}`}
            info="Invoices paid in each step of the range, stacked by plan. The dashed line is the same step of the period before."
            span={width}
            x={span.buckets.map((bucket) => bucket.label)}
            series={series}
            stacked
            fill="solid"
            format={(value) => money(value)}
            bodyClassName="h-64"
            empty={segment.plan === 'free'}
            file="revenue"
        />
    )
}

/** Visitors to paying teams, over the teams that signed up in the range. */
export function FunnelPanel() {
    const { world, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const stages = useMemo(() => funnel(world, segment, span.from, span.to, SIGNUP_FUNNEL, 90), [world, segment, span])
    const before = useMemo(
        () => (view.compare ? funnel(world, segment, previous.from, previous.to, SIGNUP_FUNNEL, 90) : undefined),
        [world, segment, previous, view.compare],
    )
    const rows = useMemo(() => stages.map((stage) => ({ stage: stage.name, teams: stage.count })), [stages])
    const paid = stages[stages.length - 1]?.ofFirst ?? 0
    const paidBefore = before?.[before.length - 1]?.ofFirst
    return (
        <ChartPanel
            kind="funnel"
            title="Sign-up funnel"
            subtitle={`${paid.toFixed(1)}% paid${paidBefore === undefined ? '' : `, ${paidBefore.toFixed(1)}% before`}`}
            info="The teams that signed up in the range, and how far each got within 90 days: a project, a teammate invited, a paid plan."
            span="third"
            rows={rows}
            x="stage"
            y="teams"
            order={rows.map((row) => row.stage)}
            legend="none"
            bodyClassName="h-64"
            file="signup-funnel"
        />
    )
}

/** Paid revenue by country on a map, each country a point sized and colored by it, with its change in a popup. */
export function CountriesPanel({ span: width = 'two-thirds' }: { span?: 'half' | 'two-thirds' | 'full' }) {
    const { world, money, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const [selected, setSelected] = useState<string | null>(null)
    const figures = useMemo(() => countries(world, segment, span, previous), [world, segment, span, previous])
    const most = Math.max(1, ...figures.map((figure) => figure.revenue))
    const scale = useMemo(
        () =>
            sequentialScale({
                breaks: [0.1, 0.25, 0.5, 0.75].map((share) => Math.round(most * share)),
                hue: 'var(--chart-2)',
                format: (value) => money(value, true),
            }),
        [most, money],
    )
    const points = useMemo(
        (): FeatureCollection<Point> => ({
            type: 'FeatureCollection',
            features: figures.map((figure) => ({
                type: 'Feature',
                id: figure.name,
                geometry: { type: 'Point', coordinates: figure.at },
                properties: { name: figure.name, revenue: figure.revenue },
            })),
        }),
        [figures],
    )
    const chosen = figures.find((figure) => figure.name === selected)
    const feature = points.features.find((one) => one.id === selected)
    const total = figures.reduce((sum, figure) => sum + figure.revenue, 0)
    return (
        <DashboardPanel
            title="Revenue by country"
            subtitle={`${money(total, true)}, ${rangeName(view.range).toLowerCase()}`}
            span={width}
            flush
        >
            <MapView
                label="Paid revenue by country"
                framed={false}
                selected={selected}
                onSelectedChange={(id) => setSelected(id)}
                className="min-h-80 flex-1"
            >
                <PointLayer
                    id="countries"
                    data={points}
                    scale={scale}
                    value="revenue"
                    size={{ value: 'revenue', domain: [0, most], range: [4, 20] }}
                />
                <MapOverlay corner="bottom-left">
                    <MapLegend title="Revenue" description={rangeName(view.range)} scale={scale} captions={['Less', 'More']} />
                </MapOverlay>
                {chosen !== undefined && feature !== undefined && (
                    <MapPopup
                        feature={feature as Feature}
                        title={chosen.name}
                        description={REGION_NAMES[chosen.region]}
                        rows={[
                            { label: 'Revenue', value: money(chosen.revenue), color: colorOf(scale, chosen.revenue) ?? undefined },
                            ...(view.compare
                                ? [
                                      { label: 'Period before', value: money(chosen.before) },
                                      { label: 'Change', value: change(chosen.revenue, chosen.before) ?? 'new' },
                                  ]
                                : []),
                            { label: 'Share of all', value: `${(total === 0 ? 0 : (chosen.revenue / total) * 100).toFixed(1)}%` },
                        ]}
                        onClose={() => setSelected(null)}
                    />
                )}
            </MapView>
        </DashboardPanel>
    )
}

/** The teams paying most, with what they paid at the range's start. */
export function CustomersPanel({ span: width = 'half' }: { span?: 'half' | 'two-thirds' | 'full' }) {
    const { world, money, view, href } = useLoaded()
    const segment = useSegment()
    const { span } = useSpans()
    const top = useMemo(() => topCustomers(world, segment, span), [world, segment, span])
    const columns: DataColumn<TopCustomer>[] = [
        { id: 'team', header: 'Team', width: 'minmax(9rem,1fr)', cell: (row) => row.team.name },
        { id: 'plan', header: 'Plan', width: '6.5rem', cell: (row) => <PlanChip plan={row.plan} /> },
        { id: 'seats', header: 'Seats', width: '4rem', align: 'end', cell: (row) => <span className="tabular-nums">{row.seats}</span> },
        { id: 'mrr', header: 'MRR', width: '5.5rem', align: 'end', cell: (row) => <span className="tabular-nums">{money(row.mrr)}</span> },
        ...(view.compare
            ? [
                  {
                      id: 'change',
                      header: 'Change',
                      width: '5.5rem',
                      align: 'end' as const,
                      cell: (row: TopCustomer) => (
                          <span className={`tabular-nums ${row.mrr >= row.before ? 'text-muted-foreground' : 'text-critical-ink'}`}>
                              {row.before === 0 ? 'new' : (change(row.mrr, row.before) ?? '-')}
                          </span>
                      ),
                  },
              ]
            : []),
    ]
    return (
        <DashboardPanel
            title="Top customers"
            subtitle="by MRR"
            span={width}
            flush
            empty={top.length === 0}
            words={{ empty: 'No paying team in this segment.' }}
            actions={
                <Button size="xs" variant="ghost" onClick={() => go(href('customers'))}>
                    All customers
                </Button>
            }
        >
            <DataTable
                variant="list"
                framed={false}
                minWidth="auto"
                stackBelow={420}
                columns={columns}
                rows={top}
                rowKey={(row) => row.team.id}
                onOpen={(row) => go(href(`customers/${row.team.id}`))}
            />
        </DashboardPanel>
    )
}

/** How long ago a moment was, short: `12s ago`, `4m ago`. */
function ago(at: number, now: number): string {
    const seconds = Math.max(0, Math.round((now - at) / 1000))
    if (seconds < 60) return seconds < 5 ? 'just now' : `${String(seconds)}s ago`
    if (seconds < 3600) return `${String(Math.floor(seconds / 60))}m ago`
    if (seconds < 86_400) return `${String(Math.floor(seconds / 3600))}h ago`
    return `${String(Math.floor(seconds / 86_400))}d ago`
}

/** The live feed: the latest sign-ups, upgrades, orders and teams leaving, newest first, those since last read drawn stronger. */
export function FeedPanel({ count = 7 }: { count?: number }) {
    const { world, money, prefs, setPrefs, href, stream } = useLoaded()
    const segment = useSegment()
    const rows = useFeed(count, segment)
    const [read, setRead] = useState<ReadonlySet<string>>(new Set())
    const items = rows.map((row): ActivityItem => {
        const said = describe(row.change, row.team)
        const Icon = said.icon
        const mrr = said.mrr === 0 ? '' : `, ${said.mrr > 0 ? '+' : '-'}${money(Math.abs(said.mrr))} MRR`
        return {
            id: row.change.id,
            icon: <Icon />,
            tone: said.tone,
            text: `${said.text}${mrr}`,
            when: ago(row.change.at, world.now),
            unread: row.change.at > prefs.feedSeen && !read.has(row.change.id),
            action: row.team === undefined ? undefined : { label: 'Open', onClick: () => go(href(`customers/${row.change.team}`)) },
        }
    })
    const unread = items.filter((item) => item.unread === true).length
    const live = stream === 'live'
    return (
        <DashboardPanel
            title="Live"
            subtitle={
                live
                    ? `${String(unread)} new`
                    : stream === 'off'
                      ? 'paused'
                      : stream === 'hidden'
                        ? 'waiting for the page'
                        : 'stopped at the limit'
            }
            span="third"
            flush
            actions={
                <>
                    <Button variant="ghost" size="xs" disabled={unread === 0} onClick={() => void setPrefs({ feedSeen: Date.now() })}>
                        Mark all read
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={prefs.pace === 'off' ? 'Resume the live stream' : 'Pause the live stream'}
                        title={prefs.pace === 'off' ? 'Resume the live stream' : 'Pause the live stream'}
                        onClick={() => void setPrefs({ pace: prefs.pace === 'off' ? 'fast' : 'off' })}
                    >
                        {prefs.pace === 'off' ? <Play aria-hidden /> : <Pause aria-hidden />}
                    </Button>
                </>
            }
        >
            <ActivityList
                items={items}
                head={false}
                onRead={(id) => setRead((was) => new Set([...was, id]))}
                words={{ empty: 'Nothing has happened in this segment yet.' }}
            />
        </DashboardPanel>
    )
}

/** Paid revenue over the range, by plan, as a donut. */
export function PlansPanel() {
    const { world, money, view } = useLoaded()
    const segment = useSegment()
    const { span } = useSpans()
    const plans = useMemo(
        () =>
            PLANS.filter((plan) => plan !== 'free').map((plan) => ({
                plan: PLAN_NAMES[plan],
                revenue: revenue(world, { ...segment, plan }, span.from, span.to),
            })),
        [world, segment, span],
    )
    return (
        <ChartPanel
            kind="donut"
            title="Revenue by plan"
            subtitle={rangeName(view.range).toLowerCase()}
            span="third"
            rows={plans}
            x="plan"
            y="revenue"
            total="revenue"
            colors={{ [PLAN_NAMES.team]: PLAN_COLORS.team, [PLAN_NAMES.business]: PLAN_COLORS.business }}
            format={(value) => money(value, true)}
            bodyClassName="h-64"
            empty={plans.every((one) => one.revenue === 0)}
            file="revenue-by-plan"
        />
    )
}

/** Where MRR went over the range: what new teams added, what teams paying more and less changed, what teams leaving took, and the net change. */
export function MovementsPanel() {
    const { world, money } = useLoaded()
    const segment = useSegment()
    const { span } = useSpans()
    const { rows, start } = useMemo(() => {
        const flow = flows(world, segment, span.from, span.to)
        return {
            start: levels(world, segment, [span.from]).mrr[0] ?? 0,
            rows: [
                { step: 'New', mrr: flow.newMrr },
                { step: 'Expansion', mrr: flow.expansion },
                { step: 'Contraction', mrr: -flow.contraction },
                { step: 'Churn', mrr: -flow.churnMrr },
            ],
        }
    }, [world, segment, span])
    const net = rows.reduce((sum, row) => sum + row.mrr, 0)
    return (
        <ChartPanel
            kind="waterfall"
            title="MRR movements"
            subtitle={`${money(start, true)} to ${money(start + net, true)}`}
            info="What teams starting to pay added to MRR over the range, what teams paying more or less changed, what teams leaving took, and the net change."
            span="half"
            rows={rows}
            x="step"
            y="mrr"
            order={rows.map((row) => row.step)}
            format={(value) => money(value, true)}
            words={{ total: 'Net' }}
            legend="none"
            bodyClassName="h-64"
            empty={segment.plan === 'free'}
            file="mrr-movements"
        />
    )
}

/** Paid revenue by region, beside the period before. */
export function RegionsPanel() {
    const { world, money, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const shown = REGIONS.filter((region) => segment.region === 'all' || region === segment.region)
    const series = useMemo((): PanelSeries[] => {
        const now = revenueByRegion(world, segment, span.from, span.to)
        const out: PanelSeries[] = [{ name: 'This period', values: shown.map((region) => now[region]), color: 'chart-2' }]
        if (view.compare) {
            const before = revenueByRegion(world, segment, previous.from, previous.to)
            out.push({ name: 'Period before', values: shown.map((region) => before[region]), color: BEFORE_COLOR })
        }
        return out
    }, [world, segment, span, previous, view.compare, shown])
    return (
        <BarPanel
            title="Revenue by region"
            subtitle={rangeName(view.range).toLowerCase()}
            span="half"
            x={shown.map((region) => REGION_NAMES[region])}
            series={series}
            horizontal
            format={(value) => money(value)}
            bodyClassName="h-64"
            empty={segment.plan === 'free'}
            file="revenue-by-region"
        />
    )
}

/** Retention by cohort: the share of each month's new paying teams still paying each month after. */
export function CohortsPanel() {
    const { world } = useLoaded()
    const segment = useSegment()
    const { span } = useSpans()
    const grid = useMemo(() => cohorts(world, segment, span.last), [world, segment, span.last])
    return (
        <ChartPanel
            kind="heatmap"
            title="Retention by cohort"
            subtitle="paying teams, by the month they first paid"
            info="Each row is the teams that first paid in a month; each cell the share of them still paying that many months later."
            span="full"
            rows={grid.cells}
            x="month"
            y="retained"
            series="cohort"
            order={grid.months}
            seriesOrder={grid.order}
            unit="%"
            showScale
            legend="none"
            bodyClassName="h-80"
            empty={grid.cells.length === 0}
            file="retention-by-cohort"
        />
    )
}

/** Each panel a report can hold, drawn as the dashboards draw it. */
export const PANEL_PARTS: Record<PanelId, ComponentType> = {
    kpis: KpiPanels,
    revenue: () => <RevenuePanel span="full" />,
    funnel: FunnelPanel,
    countries: () => <CountriesPanel span="two-thirds" />,
    customers: () => <CustomersPanel span="half" />,
    movements: MovementsPanel,
    regions: RegionsPanel,
    cohorts: CohortsPanel,
}

export { PANEL_NAMES }
