/**
 * The arranged dashboards: the widgets a dashboard can show, each a working panel over the world,
 * and the dashboard a person arranges from them, kept by the backend so it survives a reload.
 */

import { DashboardArrange, type DashboardWidget } from '@winterop-com/sokkel-ui/dashboard/DashboardArrange'
import { DashboardEditActions, useDashboardEdit } from '@winterop-com/sokkel-ui/dashboard/DashboardEdit'
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
    CreditCard,
    Earth,
    Grid3x3,
    LayoutDashboard,
    ListFilter,
    Pencil,
    Percent,
    Repeat,
    Trophy,
    Undo2,
    UserMinus,
    UserPlus,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

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

export interface ArrangedBoard {
    /** The page header's actions: Edit, or Reset, Cancel and Done while editing. */
    actions: ReactNode
    /** The dashboard itself. */
    grid: ReactNode
}

/**
 * A dashboard the person edits: its panels as the backend keeps them, and while editing, each
 * dragged to its place, resized or removed, and the widgets not on it offered in a palette to drag
 * in. Done keeps the edits, Cancel throws them away, and Reset puts the dashboard as it comes.
 */
export function useArrangedBoard(board: BoardId): ArrangedBoard {
    const { rows } = useCollection(layouts)
    const stored = rows?.find((row) => row.id === board)
    const save = (next: Placed[]) => {
        const saved = stored === undefined ? layouts.create({ panels: next }, board) : layouts.update(board, { panels: next })
        return saved.catch((error: unknown) => {
            toast.add({
                type: 'error',
                title: 'Could not save the layout',
                description: error instanceof Error ? error.message : String(error),
            })
        })
    }
    const edit = useDashboardEdit<Placed>({
        layout: (stored?.panels ?? DEFAULT_LAYOUTS[board]).filter((one) => isWidget(one.id)),
        defaultLayout: DEFAULT_LAYOUTS[board],
        onSave: save,
    })
    const layout = edit.layout
    const placed = new Set(layout.map((one) => one.id))
    const palette: DashboardWidget[] = WIDGETS.filter((id) => !placed.has(id)).map((id) => {
        const { label, icon: Icon, span } = WIDGET_PARTS[id]
        return { id, label, span, icon: <Icon aria-hidden /> }
    })

    const actions = <DashboardEditActions edit={edit} />

    const grid =
        layout.length === 0 && !edit.editing ? (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <LayoutDashboard aria-hidden />
                    </EmptyMedia>
                    <EmptyTitle>Nothing on this dashboard</EmptyTitle>
                    <EmptyDescription>Edit it and drag in the figures and panels to show.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button size="sm" onClick={edit.edit}>
                        <Pencil aria-hidden />
                        Edit
                    </Button>
                </EmptyContent>
            </Empty>
        ) : (
            <DashboardArrange
                layout={layout}
                onLayoutChange={edit.change}
                label={(item) => WIDGET_PARTS[item.id].label}
                renderPanel={(item) => WIDGET_PARTS[item.id].draw()}
                arranging={edit.editing}
                palette={palette}
                onAdd={(widget, index) => {
                    if (!isWidget(widget.id)) return
                    edit.change(insertItem(layout, { id: widget.id, span: widget.span ?? WIDGET_PARTS[widget.id].span }, index))
                }}
            />
        )
    return { actions, grid }
}
