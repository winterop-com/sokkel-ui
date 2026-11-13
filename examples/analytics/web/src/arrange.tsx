/**
 * The arranged dashboards: the widgets a dashboard can show, each a working panel over the world,
 * and the dashboard a person arranges from them, kept by the backend so it survives a reload.
 */

import { DashboardArrange, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { insertItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import {
    Activity,
    Banknote,
    CalendarClock,
    ChartArea,
    ChartBar,
    ChartColumn,
    ChartPie,
    Check,
    CreditCard,
    Earth,
    Grid3x3,
    LayoutDashboard,
    LayoutGrid,
    ListFilter,
    Percent,
    Repeat,
    RotateCcw,
    Trophy,
    Undo2,
    UserMinus,
    UserPlus,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { layouts } from './collections'
import { DEFAULT_LAYOUTS, WIDGETS, type BoardId, type Placed, type WidgetId } from './model'
import {
    CohortsPanel,
    CountriesPanel,
    CustomersPanel,
    FeedPanel,
    FunnelPanel,
    KPI_NAMES,
    KpiPanel,
    MovementsPanel,
    PlansPanel,
    RegionsPanel,
    RevenuePanel,
    type KpiId,
} from './panels'

interface Widget {
    label: string
    icon: LucideIcon
    /** How wide it starts once added. */
    span: Placed['span']
    draw: () => ReactNode
}

const kpi = (id: KpiId, icon: LucideIcon): Widget => ({ label: KPI_NAMES[id], icon, span: 'sixth', draw: () => <KpiPanel id={id} /> })

/** Every widget a dashboard can show. */
export const WIDGET_PARTS: Record<WidgetId, Widget> = {
    revenue: kpi('revenue', Banknote),
    mrr: kpi('mrr', Repeat),
    arr: kpi('arr', CalendarClock),
    active: kpi('active', Users),
    paying: kpi('paying', CreditCard),
    arpa: kpi('arpa', UserRound),
    signups: kpi('signups', UserPlus),
    conversion: kpi('conversion', Percent),
    churn: kpi('churn', UserMinus),
    refunded: kpi('refunded', Undo2),
    'revenue-chart': { label: 'Revenue over time', icon: ChartArea, span: 'two-thirds', draw: () => <RevenuePanel /> },
    plans: { label: 'Revenue by plan', icon: ChartPie, span: 'third', draw: () => <PlansPanel /> },
    funnel: { label: 'Sign-up funnel', icon: ListFilter, span: 'third', draw: () => <FunnelPanel /> },
    countries: { label: 'Revenue by country', icon: Earth, span: 'two-thirds', draw: () => <CountriesPanel /> },
    feed: { label: 'Live feed', icon: Activity, span: 'third', draw: () => <FeedPanel /> },
    customers: { label: 'Top customers', icon: Trophy, span: 'half', draw: () => <CustomersPanel /> },
    movements: { label: 'MRR movements', icon: ChartColumn, span: 'half', draw: () => <MovementsPanel /> },
    regions: { label: 'Revenue by region', icon: ChartBar, span: 'half', draw: () => <RegionsPanel /> },
    cohorts: { label: 'Retention by cohort', icon: Grid3x3, span: 'full', draw: () => <CohortsPanel /> },
}

const isWidget = (id: string): id is WidgetId => (WIDGETS as readonly string[]).includes(id)
const sameLayout = (a: readonly Placed[], b: readonly Placed[]) =>
    a.length === b.length && a.every((one, index) => one.id === b[index]?.id && one.span === b[index]?.span)

export interface ArrangedBoard {
    /** The page header's actions: Arrange, or Reset layout and Done while arranging. */
    actions: ReactNode
    /** The dashboard itself. */
    grid: ReactNode
}

/**
 * A dashboard the person arranges: its panels as the backend keeps them, and while arranging, each
 * dragged to its place, resized or removed, and the widgets not on it offered in a palette to drag
 * in. Every change is saved as it is made; Reset layout puts the dashboard as it comes back.
 */
export function useArrangedBoard(board: BoardId): ArrangedBoard {
    const [arranging, setArranging] = useState(false)
    const { rows } = useCollection(layouts)
    const stored = rows?.find((row) => row.id === board)
    // The layout as last changed here, drawn until the backend has kept it, so a drop never jumps back.
    const [held, setHeld] = useState<Placed[] | null>(null)
    const writes = useRef(0)
    const layout = (held ?? stored?.panels ?? DEFAULT_LAYOUTS[board]).filter((one) => isWidget(one.id))
    const keep = (next: Placed[]) => {
        setHeld(next)
        writes.current += 1
        const write = writes.current
        const saved = stored === undefined ? layouts.create({ panels: next }, board) : layouts.update(board, { panels: next })
        void saved.then(
            () => {
                if (writes.current === write) setHeld(null)
            },
            (error: unknown) => {
                if (writes.current === write) setHeld(null)
                toast.add({
                    type: 'error',
                    title: 'Could not save the layout',
                    description: error instanceof Error ? error.message : String(error),
                })
            },
        )
    }
    const placed = new Set(layout.map((one) => one.id))
    const palette: DashboardWidget[] = WIDGETS.filter((id) => !placed.has(id)).map((id) => {
        const { label, icon: Icon, span } = WIDGET_PARTS[id]
        return { id, label, span, icon: <Icon aria-hidden /> }
    })
    const isDefault = sameLayout(layout, DEFAULT_LAYOUTS[board])

    const actions = arranging ? (
        <>
            <Button
                variant="outline"
                size="sm"
                reason={isDefault ? 'The dashboard is as it comes.' : undefined}
                onClick={() => {
                    keep(DEFAULT_LAYOUTS[board])
                    toast.add({ title: 'Layout reset' })
                }}
            >
                <RotateCcw aria-hidden />
                Reset layout
            </Button>
            <Button size="sm" onClick={() => setArranging(false)}>
                <Check aria-hidden />
                Done
            </Button>
        </>
    ) : (
        <Button variant="outline" size="sm" onClick={() => setArranging(true)}>
            <LayoutGrid aria-hidden />
            Arrange
        </Button>
    )

    const grid =
        layout.length === 0 && !arranging ? (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <LayoutDashboard aria-hidden />
                    </EmptyMedia>
                    <EmptyTitle>Nothing on this dashboard</EmptyTitle>
                    <EmptyDescription>Arrange it and drag in the figures and panels to show.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button size="sm" onClick={() => setArranging(true)}>
                        <LayoutGrid aria-hidden />
                        Arrange
                    </Button>
                </EmptyContent>
            </Empty>
        ) : (
            <DashboardArrange
                layout={layout}
                onLayoutChange={keep}
                label={(item) => WIDGET_PARTS[item.id].label}
                renderPanel={(item) => WIDGET_PARTS[item.id].draw()}
                arranging={arranging}
                palette={palette}
                onAdd={(widget, index) => {
                    if (!isWidget(widget.id)) return
                    keep(insertItem(layout, { id: widget.id, span: widget.span ?? WIDGET_PARTS[widget.id].span }, index))
                }}
            />
        )
    return { actions, grid }
}
