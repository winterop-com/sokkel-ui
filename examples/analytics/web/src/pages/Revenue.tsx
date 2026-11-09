import { ConfirmDialog } from '@winterop-com/sokkel-ui/DialogShell'
import { DataTable, type DataAction, type DataColumn, type DataSort } from '@winterop-com/sokkel-ui/DataTable'
import { FilterBar, type Filter, type FilterField } from '@winterop-com/sokkel-ui/FilterBar'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SavedViews, type SavedView } from '@winterop-com/sokkel-ui/SavedViews'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'
import { StatPanel } from '@winterop-com/sokkel-ui/dashboard/StatPanel'
import { ChartPanel } from '@winterop-com/sokkel-ui-charts/dashboard/ChartPanel'
import { filterRows } from '@winterop-com/sokkel-ui/lib/filters'
import { EMPTY_VIEW, type ListViewState } from '@winterop-com/sokkel-ui/lib/list-views'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Banknote, CalendarDays, CircleDot, CopyIcon, Earth, ExternalLinkIcon, Layers, RotateCcwIcon, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { retryCharge, setInvoiceStatus } from '../backend'
import { invoiceViews } from '../collections'
import { kpis, levels, refunds, revenue } from '../metrics'
import { isoDay, PLAN_COLORS, PLAN_NAMES, PLANS, REGION_NAMES, REGIONS, shortDay, type Invoice, type InvoiceStatus } from '../model'
import { CohortsPanel, MovementsPanel, RegionsPanel, RevenuePanel } from '../panels'
import { change, PlanChip, STATUSES, useSegment, useSpans, ViewBar } from '../parts'
import { useLoaded } from '../state'
import { go, rangeName } from '../view'

/** The revenue pages: the breakdowns, and the invoices behind them. */
export function Revenue({ tab }: { tab: 'breakdowns' | 'invoices' }) {
    const { href } = useLoaded()
    return (
        <>
            <PageHeader
                title="Revenue"
                description="What the paying teams pay, where it comes from and where it goes."
                actions={
                    <Segmented
                        label="Revenue page"
                        value={tab}
                        onValueChange={(next) => go(href(next === 'invoices' ? 'revenue/invoices' : 'revenue'))}
                        options={[
                            { value: 'breakdowns', label: 'Breakdowns' },
                            { value: 'invoices', label: 'Invoices' },
                        ]}
                    />
                }
            />
            <ViewBar />
            {tab === 'breakdowns' ? <Breakdowns /> : <Invoices />}
        </>
    )
}

/** MRR and what makes it, revenue by plan and region, MRR movements and retention by cohort. */
function Breakdowns() {
    const { world, money, view } = useLoaded()
    const segment = useSegment()
    const { span, previous } = useSpans()
    const figures = useMemo(() => {
        const now = kpis(world, segment, span)
        const before = kpis(world, segment, previous)
        const back = refunds(world, segment, span.from, span.to)
        const backBefore = refunds(world, segment, previous.from, previous.to)
        const plans = PLANS.filter((plan) => plan !== 'free').map((plan) => ({
            plan: PLAN_NAMES[plan],
            revenue: revenue(world, { ...segment, plan }, span.from, span.to),
        }))
        const mrrBefore = levels(world, segment, [previous.to]).mrr[0] ?? 0
        return { now, before, back, backBefore, plans, mrrBefore }
    }, [world, segment, span, previous])
    const { now, before, back, backBefore } = figures
    const arpa = now.paying === 0 ? 0 : now.mrr / now.paying
    const arpaBefore = before.paying === 0 ? 0 : before.mrr / before.paying
    const compare = view.compare
    const short = (value: number) => money(value, true)
    return (
        <DashboardGrid>
            <StatPanel
                title="MRR"
                value={now.mrr}
                format={short}
                color="chart-1"
                sparkline={now.trend.mrr}
                delta={compare ? change(now.mrr, figures.mrrBefore) : undefined}
                good={compare ? now.mrr >= figures.mrrBefore : undefined}
                span="sixth"
            />
            <StatPanel title="ARR" value={now.mrr * 12} format={short} color="chart-1" note="MRR times twelve" span="sixth" />
            <StatPanel
                title="Paying teams"
                value={now.paying}
                color="chart-2"
                delta={compare ? change(now.paying, before.paying) : undefined}
                good={compare ? now.paying >= before.paying : undefined}
                span="sixth"
            />
            <StatPanel
                title="ARPA"
                value={arpa}
                format={(value) => money(value)}
                color="chart-3"
                delta={compare ? change(arpa, arpaBefore) : undefined}
                good={compare ? arpa >= arpaBefore : undefined}
                info="Average revenue per account: MRR over the paying teams."
                span="sixth"
            />
            <StatPanel
                title="Revenue"
                value={now.revenue}
                format={short}
                color="chart-2"
                sparkline={now.trend.revenue}
                delta={compare ? change(now.revenue, before.revenue) : undefined}
                good={compare ? now.revenue >= before.revenue : undefined}
                span="sixth"
            />
            <StatPanel
                title="Refunded"
                value={back.amount}
                format={(value) => money(value)}
                color="warning"
                note={`${String(back.count)} ${back.count === 1 ? 'invoice' : 'invoices'}`}
                delta={compare ? change(back.amount, backBefore.amount) : undefined}
                good={compare ? back.amount <= backBefore.amount : undefined}
                span="sixth"
            />
            <RevenuePanel />
            <ChartPanel
                kind="donut"
                title="Revenue by plan"
                subtitle={rangeName(view.range).toLowerCase()}
                span="third"
                rows={figures.plans}
                x="plan"
                y="revenue"
                total="revenue"
                colors={{ [PLAN_NAMES.team]: PLAN_COLORS.team, [PLAN_NAMES.business]: PLAN_COLORS.business }}
                format={short}
                bodyClassName="h-64"
                empty={figures.plans.every((one) => one.revenue === 0)}
                file="revenue-by-plan"
            />
            <MovementsPanel />
            <RegionsPanel />
            <CohortsPanel />
        </DashboardGrid>
    )
}

const ICON = 'size-4 text-muted-foreground'

const INVOICE_FIELDS: FilterField<Invoice>[] = [
    {
        id: 'status',
        label: 'State',
        type: 'set',
        options: (['paid', 'open', 'failed', 'refunded'] as const).map((value) => ({ value, label: STATUSES[value]?.label ?? value })),
        icon: <CircleDot className={ICON} aria-hidden />,
        value: (invoice) => invoice.status,
    },
    {
        id: 'plan',
        label: 'Plan',
        type: 'set',
        options: PLANS.filter((plan) => plan !== 'free').map((plan) => ({ value: plan, label: PLAN_NAMES[plan] })),
        icon: <Layers className={ICON} aria-hidden />,
        value: (invoice) => invoice.plan,
    },
    {
        id: 'region',
        label: 'Region',
        type: 'set',
        options: REGIONS.map((region) => ({ value: region, label: REGION_NAMES[region] })),
        icon: <Earth className={ICON} aria-hidden />,
        value: (invoice) => invoice.region,
    },
    {
        id: 'kind',
        label: 'For',
        type: 'set',
        options: [
            { value: 'renewal', label: 'A month' },
            { value: 'upgrade', label: 'A new plan' },
            { value: 'seats', label: 'Seats added' },
        ],
        icon: <Layers className={ICON} aria-hidden />,
        value: (invoice) => invoice.kind,
    },
    {
        id: 'amount',
        label: 'Amount',
        type: 'number',
        unit: 'USD',
        operators: ['atLeast', 'atMost', 'between'],
        icon: <Banknote className={ICON} aria-hidden />,
        value: (invoice) => invoice.amount,
    },
    {
        id: 'date',
        label: 'Date',
        type: 'date',
        icon: <CalendarDays className={ICON} aria-hidden />,
        value: (invoice) => isoDay(invoice.day),
    },
]

const KIND_NAMES: Record<Invoice['kind'], string> = { renewal: 'A month', upgrade: 'A new plan', seats: 'Seats added' }

let madeView = 0

/** The invoices of the range and segment, filtered, sorted and saved as views, each with what can be done about it. */
function Invoices() {
    const { world, money, me, href, view } = useLoaded()
    const segment = useSegment()
    const { span } = useSpans()
    const { rows: views } = useCollection(invoiceViews)
    const viewId = view.params.get('view') ?? 'all'
    const saved = views?.find((one) => one.id === viewId)
    const [filters, setFilters] = useState<readonly Filter[]>([])
    const [sort, setSort] = useState<DataSort | null>(null)
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
    const [order, setOrder] = useState<readonly string[]>([])
    const [widths, setWidths] = useState<Readonly<Record<string, number>>>({})
    const [query, setQuery] = useState('')
    const [refunding, setRefunding] = useState<Invoice | null>(null)

    const apply = (state: ListViewState) => {
        setFilters(state.filters)
        setSort(state.sort)
        setHidden(new Set(state.hidden))
        setOrder(state.order)
        setWidths(state.widths)
    }
    // A view picked here, from the palette or from a shared link is applied once it has loaded.
    const [appliedId, setAppliedId] = useState<string | undefined>(undefined)
    if (saved !== undefined && saved.id !== appliedId) {
        setAppliedId(saved.id)
        apply(saved.state)
    }

    const current: ListViewState = { filters, sort, hidden: [...hidden], order, widths }
    // Newest first, until a column head sorts them.
    const inRange = useMemo(
        () =>
            world.invoices
                .filter(
                    (invoice) =>
                        invoice.at >= span.from &&
                        invoice.at < span.to &&
                        (segment.region === 'all' || invoice.region === segment.region) &&
                        (segment.plan === 'all' || invoice.plan === segment.plan),
                )
                .reverse(),
        [world, span, segment],
    )
    const rows = useMemo(() => {
        const kept = filterRows(inRange, filters, INVOICE_FIELDS)
        const wanted = query.trim().toLowerCase()
        return wanted === '' ? kept : kept.filter((invoice) => `${invoice.id} ${invoice.name}`.toLowerCase().includes(wanted))
    }, [inRange, filters, query])

    const pick = (id: string) => go(href('revenue/invoices', { view: id }))
    const columns: DataColumn<Invoice>[] = [
        {
            id: 'id',
            header: 'Invoice',
            width: '10rem',
            cell: (invoice) => <span className="font-mono">{invoice.id}</span>,
            sortValue: (invoice) => invoice.id,
        },
        { id: 'team', header: 'Team', width: 'minmax(10rem,1fr)', cell: (invoice) => invoice.name, sortValue: (invoice) => invoice.name },
        {
            id: 'plan',
            header: 'Plan',
            width: '6.5rem',
            cell: (invoice) => <PlanChip plan={invoice.plan} />,
            sortValue: (invoice) => invoice.plan,
        },
        {
            id: 'kind',
            header: 'For',
            width: '7.5rem',
            cell: (invoice) => <span className="text-muted-foreground">{KIND_NAMES[invoice.kind]}</span>,
            sortValue: (invoice) => invoice.kind,
        },
        {
            id: 'region',
            header: 'Region',
            width: '9rem',
            cell: (invoice) => REGION_NAMES[invoice.region],
            sortValue: (invoice) => invoice.region,
        },
        {
            id: 'date',
            header: 'Date',
            width: '6.5rem',
            cell: (invoice) => <span className="tabular-nums">{shortDay(invoice.day)}</span>,
            sortValue: (invoice) => invoice.at,
        },
        {
            id: 'status',
            header: 'State',
            width: '7rem',
            cell: (invoice) => <StatusChip status={invoice.status} statuses={STATUSES} />,
            sortValue: (invoice) => invoice.status,
        },
        {
            id: 'amount',
            header: 'Amount',
            width: '7rem',
            align: 'end',
            cell: (invoice) => <span className="tabular-nums">{money(invoice.amount)}</span>,
            sortValue: (invoice) => invoice.amount,
        },
    ]
    const say = (invoice: Invoice, status: InvoiceStatus) =>
        setInvoiceStatus(invoice, status, me).then(() =>
            toast.add({
                title: `${invoice.id} ${STATUSES[status]?.label?.toLowerCase() ?? status}`,
                description: `${invoice.name}, ${money(invoice.amount)}`,
            }),
        )
    const actions = (invoice: Invoice): DataAction[] => [
        { id: 'team', label: 'Open team', icon: <ExternalLinkIcon />, onSelect: () => go(href(`customers/${invoice.team}`)) },
        {
            id: 'copy',
            label: 'Copy number',
            icon: <CopyIcon />,
            onSelect: () =>
                void navigator.clipboard.writeText(invoice.id).then(
                    () => toast.add({ title: 'Copied', description: invoice.id }),
                    () => toast.add({ type: 'error', title: 'Could not copy', description: 'The browser kept the clipboard closed.' }),
                ),
        },
        { id: 'line', separator: true },
        {
            id: 'retry',
            label: 'Charge again',
            icon: <RotateCcwIcon />,
            disabled: invoice.status !== 'failed' && invoice.status !== 'open',
            onSelect: () =>
                void retryCharge(invoice, me).then((status) =>
                    toast.add(
                        status === 'paid'
                            ? {
                                  type: 'success',
                                  title: `${invoice.id} paid`,
                                  description: `The card went through for ${money(invoice.amount)}.`,
                              }
                            : {
                                  type: 'error',
                                  title: `${invoice.id} declined again`,
                                  description: 'The card was declined. Try again later.',
                              },
                    ),
                ),
        },
        {
            id: 'paid',
            label: 'Mark paid',
            disabled: invoice.status === 'paid' || invoice.status === 'refunded',
            onSelect: () => void say(invoice, 'paid'),
        },
        {
            id: 'refund',
            label: 'Refund',
            icon: <Undo2 />,
            destructive: true,
            disabled: invoice.status !== 'paid',
            onSelect: () => setRefunding(invoice),
        },
    ]

    const total = rows.reduce((sum, invoice) => sum + (invoice.status === 'paid' ? invoice.amount : 0), 0)
    return (
        <>
            <SavedViews
                views={views ?? []}
                value={saved?.id ?? null}
                current={current}
                columns={columns.map((column) => column.id)}
                onValueChange={(picked) => (picked.id === viewId ? apply(picked.state) : pick(picked.id))}
                onSave={(next) => void invoiceViews.update(next.id, { name: next.name, state: next.state })}
                onSaveNew={(name, state) => {
                    madeView += 1
                    const id = `view-${Date.now().toString(36)}-${String(madeView)}`
                    void invoiceViews.create({ name, state }, id).then(() => pick(id))
                }}
                onRename={(renamed, name) => void invoiceViews.update(renamed.id, { name })}
                onDelete={(gone: SavedView) =>
                    void invoiceViews.remove(gone.id).then(() => {
                        apply(EMPTY_VIEW)
                        pick('all')
                    })
                }
            />
            <DataTable
                className="min-h-0 flex-1"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={<FilterBar fields={INVOICE_FIELDS} filters={filters} onFiltersChange={setFilters} />}
                columns={columns}
                rows={rows}
                rowKey={(invoice) => invoice.id}
                sort={sort}
                onSortChange={setSort}
                hiddenColumns={hidden}
                onHiddenColumnsChange={setHidden}
                columnOrder={order}
                onColumnOrderChange={setOrder}
                columnWidths={widths}
                onColumnWidthsChange={setWidths}
                rowActions={actions}
                onOpen={(invoice) => go(href(`customers/${invoice.team}`))}
                foot={`${money(total)} paid of these, ${rangeName(view.range).toLowerCase()}`}
                words={{ rows: (count) => `${count.toLocaleString('en-US')} ${count === 1 ? 'invoice' : 'invoices'}` }}
                minWidth="56rem"
                stackLayout="compact"
                empty="No invoice in this range matches."
            />
            <ConfirmDialog
                open={refunding !== null}
                onOpenChange={(open) => !open && setRefunding(null)}
                question={refunding === null ? '' : `Refund ${refunding.id}?`}
                detail={
                    refunding === null ? undefined : `${money(refunding.amount)} goes back to ${refunding.name}, and leaves the revenue.`
                }
                confirm={{
                    label: 'Refund',
                    destructive: true,
                    onConfirm: () => {
                        if (refunding !== null) void say(refunding, 'refunded')
                        setRefunding(null)
                    },
                }}
            />
        </>
    )
}
