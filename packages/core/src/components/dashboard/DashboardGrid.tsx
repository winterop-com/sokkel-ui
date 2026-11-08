import { Maximize2, MoreHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { LoadingOverlay } from '../Loaders'
import { Stat } from '../Stat'
import { WindowedPane } from '../WindowedPane'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'

/**
 * How much of the grid's width a panel takes on a wide screen. Every panel is full width on a
 * phone but a sixth, which takes half the width in a dense grid, as a stat tile does.
 */
export type PanelSpan = 'sixth' | 'quarter' | 'third' | 'half' | 'two-thirds' | 'full'

/** The grid classes for a panel's span. */
export const SPAN: Record<PanelSpan, string> = {
    sixth: 'col-span-1 md:col-span-2 xl:col-span-2',
    quarter: 'col-span-full md:col-span-3 xl:col-span-3',
    third: 'col-span-full md:col-span-6 xl:col-span-4',
    half: 'col-span-full md:col-span-6 xl:col-span-6',
    'two-thirds': 'col-span-full md:col-span-6 xl:col-span-8',
    full: 'col-span-full',
}

/**
 * The grid a dashboard's panels sit in: twelve columns on a wide screen, six on a tablet, one on a
 * phone, with panels in a row stretched to the same height. A dense grid packs panels with small
 * gaps and puts two stat tiles side by side on a phone.
 */
export function DashboardGrid({ dense = false, children, className }: { dense?: boolean; children: ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'grid md:grid-cols-6 xl:grid-cols-12',
                dense ? 'grid-cols-2 gap-1.5' : 'grid-cols-1 gap-(--density-section-gap)',
                className,
            )}
        >
            {children}
        </div>
    )
}

export interface PanelWords {
    expand: string
    menu: string
    empty: string
}

const WORDS: PanelWords = { expand: 'Expand', menu: 'Panel actions', empty: 'No data for this range.' }

/**
 * One panel of a dashboard: a head with the title, a quiet subtitle such as the range it covers,
 * and its actions, then the content. `menu` holds dropdown items; `expandable` opens the content
 * in a full-screen dialog. While `loading` the content dims under a bar; when `empty` the panel
 * says so in place of its content.
 */
export function DashboardPanel({
    title,
    subtitle,
    span = 'third',
    actions,
    menu,
    expandable = false,
    loading = false,
    empty = false,
    flush = false,
    footer,
    words: given,
    className,
    children,
}: {
    title: ReactNode
    subtitle?: ReactNode
    span?: PanelSpan
    actions?: ReactNode
    /** Dropdown menu items, behind the panel's more button. */
    menu?: ReactNode
    expandable?: boolean
    loading?: boolean
    empty?: boolean
    /** Content that fills the panel to its edges, such as a list, takes no padding. */
    flush?: boolean
    footer?: ReactNode
    words?: Partial<PanelWords>
    className?: string
    children?: ReactNode
}) {
    const words = { ...WORDS, ...given }
    const [expanded, setExpanded] = useState(false)
    const body = empty ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">{words.empty}</p> : children
    const tool =
        'flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-ring'
    return (
        <section
            className={cn(
                'flex min-w-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card',
                SPAN[span],
                className,
            )}
        >
            <header className="flex min-h-10 shrink-0 items-center gap-2 border-b border-border px-3 py-1.5">
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <h3 className="truncate text-sm font-medium">{title}</h3>
                    {subtitle !== undefined && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
                </div>
                {actions}
                {expandable && (
                    <button type="button" aria-label={words.expand} title={words.expand} className={tool} onClick={() => setExpanded(true)}>
                        <Maximize2 className="size-3.5" aria-hidden />
                    </button>
                )}
                {menu !== undefined && (
                    <DropdownMenu>
                        <DropdownMenuTrigger aria-label={words.menu} title={words.menu} className={tool}>
                            <MoreHorizontal className="size-4" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {menu}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </header>
            <LoadingOverlay loading={loading} className="flex min-h-0 flex-1 flex-col">
                {expandable ? (
                    <WindowedPane
                        title={
                            <>
                                {title}
                                {subtitle !== undefined && (
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">{subtitle}</span>
                                )}
                            </>
                        }
                        open={expanded}
                        onOpenChange={setExpanded}
                        button="none"
                        words={{ expand: words.expand }}
                        className={cn('flex min-h-0 flex-1 flex-col', !flush && !empty && 'p-4')}
                    >
                        {body}
                    </WindowedPane>
                ) : (
                    <div className={cn('flex min-h-0 flex-1 flex-col', !flush && !empty && 'p-4')}>{body}</div>
                )}
            </LoadingOverlay>
            {footer !== undefined && (
                <footer className="shrink-0 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">{footer}</footer>
            )}
        </section>
    )
}

/** One number in a row of key figures. */
export interface Kpi {
    id: string
    label: ReactNode
    value: ReactNode
    unit?: ReactNode
    change?: string
    good?: boolean
    note?: ReactNode
    trend?: ReactNode
}

/**
 * A row of key figures across a dashboard's top, each a stat divided from the next. The row wraps
 * to two columns on a phone.
 */
export function KpiRow({ items, className }: { items: readonly Kpi[]; className?: string }) {
    return (
        <div
            className={cn(
                'grid grid-cols-2 overflow-hidden rounded-surface border border-border-strong bg-card md:grid-cols-(--kpi-columns)',
                className,
            )}
            style={{ '--kpi-columns': `repeat(${items.length}, minmax(0, 1fr))` } as React.CSSProperties}
        >
            {items.map((item) => (
                <Stat
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    unit={item.unit}
                    change={item.change}
                    good={item.good}
                    note={item.note}
                    trend={item.trend}
                    className="border-r border-b border-border p-4 md:border-b-0 md:last:border-r-0"
                />
            ))}
        </div>
    )
}
