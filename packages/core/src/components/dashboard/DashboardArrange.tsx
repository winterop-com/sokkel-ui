import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/core'
import { Plus, StretchHorizontal, X } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { moveItem, stepTo } from '../../lib/reorder'
import { DragDrop, DragGrip, dragData, dragPoint, fromKeyboard, useDragItem, useDragging, useDropTarget, withKeys } from '../DragDrop'
import { IconButton } from '../IconButton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { DashboardGrid, SPAN, type PanelSpan } from './DashboardGrid'
import { PanelToolsProvider } from './panel-tools'

/** One panel's place in an arranged dashboard: its key and how wide it is. The order of the list is the order drawn. */
export interface DashboardLayoutItem {
    id: string
    span?: PanelSpan
}

/** A kind of panel the palette offers, dragged onto the grid (or pressed) to add one. */
export interface DashboardWidget {
    id: string
    label: string
    icon?: ReactNode
    /** How wide a new panel of this kind starts. */
    span?: PanelSpan
}

/** The words an arranged dashboard says, each with an English default. */
export interface DashboardArrangeWords {
    /** A panel's grip. */
    move: (panel: string) => string
    /** A panel's size menu. */
    size: (panel: string) => string
    remove: (panel: string) => string
    /** Each width the size menu offers. */
    spans: Record<PanelSpan, string>
    /** The palette, for a screen reader. */
    palette: string
    /** A widget in the palette: what pressing it does. */
    add: (widget: string) => string
    /** The place after the last panel, while arranging. */
    end: string
    /** Said once a panel is moved from the keyboard, its new place counted from 1. */
    moved: (panel: string, place: number, count: number) => string
}

export const DASHBOARD_ARRANGE_WORDS: DashboardArrangeWords = {
    move: (panel) => `Move ${panel}`,
    size: (panel) => `Size of ${panel}`,
    remove: (panel) => `Remove ${panel}`,
    spans: { sixth: 'Sixth', quarter: 'Quarter', third: 'Third', half: 'Half', 'two-thirds': 'Two thirds', full: 'Full width' },
    palette: 'Widgets',
    add: (widget) => `Add ${widget}`,
    end: 'Drop here to add at the end',
    moved: (panel, place, count) => `${panel} moved to ${String(place)} of ${String(count)}`,
}

const ALL_SPANS: readonly PanelSpan[] = ['sixth', 'quarter', 'third', 'half', 'two-thirds', 'full']

/** Where a drag would land: before or after a panel, or at the end. */
interface Aim {
    id: string | null
    part: 'before' | 'after'
    index: number
}

/** What a panel or a widget hands the drag about itself. */
type Carried = { panel: string } | { widget: DashboardWidget } | { end: true }

/**
 * Where a thing lands among `ids` once dropped before or after the panel `over`, or at the end for
 * null: its place in the list with the moved panel taken out (`moved`), or in the whole list for a
 * new one. Undefined where a panel lands where it was.
 */
export function arrangedIndex(
    ids: readonly string[],
    moved: string | null,
    over: string | null,
    part: 'before' | 'after',
): number | undefined {
    const others = moved === null ? ids : ids.filter((id) => id !== moved)
    const at = over === null ? others.length : others.indexOf(over) + (part === 'after' ? 1 : 0)
    if (over !== null && others.indexOf(over) === -1) return undefined
    if (moved !== null && ids.indexOf(moved) === at) return undefined
    return at
}

export interface DashboardArrangeProps<T extends DashboardLayoutItem> {
    /** The panels in their order, each with its width. */
    layout: readonly T[]
    /** Hears the layout after a panel is moved, resized or removed, as plain data to keep. */
    onLayoutChange: (layout: T[]) => void
    /** Draws a panel: a `DashboardPanel`, a `StatPanel` or a chart panel. Its width comes from the layout. */
    renderPanel: (item: T) => ReactNode
    /** What a panel is called by its grip and its tools. */
    label: (item: T) => string
    /** Whether the panels are being arranged: a grip, a size and a remove in each head, and the palette. Off, it is a plain dashboard. */
    arranging?: boolean
    /** The kinds of panel the palette offers while arranging. */
    palette?: readonly DashboardWidget[]
    /** Adds a panel of a widget at `index` in the layout, dropped there or pressed (at the end). */
    onAdd?: (widget: DashboardWidget, index: number) => void
    /** The widths a panel's size menu offers; `false` for none. */
    spans?: readonly PanelSpan[] | false
    /** Whether each panel has a remove button while arranging. */
    removable?: boolean
    dense?: boolean
    words?: Partial<DashboardArrangeWords>
    className?: string
}

/**
 * A dashboard whose panels the reader arranges. While `arranging`, each panel's head holds a grip
 * that drags it (a finger holds a moment first), a menu of widths and a remove button, and a line
 * at a panel's side shows where a dragged one lands; with the grip focused, the arrow keys move the
 * panel a place and Space or Enter picks it up. Widgets in the `palette` are dragged onto the grid
 * to add a panel there, or pressed to add one at the end. Every change comes back as the layout,
 * an order of `{ id, span }` to keep, and `onAdd` for a widget dropped in.
 *
 * Panels are drawn by the app with `renderPanel`; the library's panels draw the tools in their
 * heads by themselves, and an app's own head draws them with `PanelTools`.
 */
export function DashboardArrange<T extends DashboardLayoutItem>({
    layout,
    onLayoutChange,
    renderPanel,
    label,
    arranging = true,
    palette,
    onAdd,
    spans = ALL_SPANS,
    removable = true,
    dense = false,
    words: given,
    className,
}: DashboardArrangeProps<T>) {
    const kind = useId()
    const words = { ...DASHBOARD_ARRANGE_WORDS, ...given }
    const ids = layout.map((item) => item.id)
    const [aim, setAim] = useState<Aim | undefined>(undefined)
    const aimed = useRef<Aim | undefined>(undefined)
    const [said, setSaid] = useState('')
    const refocus = useRef<string | null>(null)

    const target = (event: DragMoveEvent | DragEndEvent): Aim | undefined => {
        const drag = dragData(event.active)
        const over = dragData(event.over)
        if (drag?.kind !== kind || over?.kind !== kind || event.over === null) return undefined
        const carried = drag.value as Carried
        const onto = over.value as Carried
        const moved = 'panel' in carried ? carried.panel : null
        if ('end' in onto) {
            const index = arrangedIndex(ids, moved, null, 'after')
            return index === undefined ? undefined : { id: null, part: 'after', index }
        }
        if (!('panel' in onto) || onto.panel === moved) return undefined
        const box = event.over.rect
        let part: 'before' | 'after'
        if (fromKeyboard(event) && moved !== null) part = ids.indexOf(onto.panel) > ids.indexOf(moved) ? 'after' : 'before'
        else {
            const point = dragPoint(event)
            part = point !== null && point.x > box.left + box.width / 2 ? 'after' : 'before'
        }
        const index = arrangedIndex(ids, moved, onto.panel, part)
        return index === undefined ? undefined : { id: onto.panel, part, index }
    }
    const follow = (event: DragMoveEvent) => {
        const next = target(event)
        aimed.current = next
        setAim((now) => (now?.id === next?.id && now?.part === next?.part ? now : next))
    }
    const done = () => {
        aimed.current = undefined
        setAim(undefined)
    }

    const step = (id: string, by: number) => {
        const from = ids.indexOf(id)
        const to = stepTo(from, by, ids.length)
        if (from === -1 || to === undefined) return
        refocus.current = id
        onLayoutChange(moveItem(layout, from, to))
        setSaid(words.moved(label(layout[from]), to + 1, ids.length))
    }
    const end = useDropTarget({ id: `${kind}:end`, data: { kind, label: words.end, value: { end: true } satisfies Carried } })
    const showEnd = arranging && palette !== undefined && palette.length > 0

    return (
        <DragDrop
            onDragMove={follow}
            onDragOver={follow}
            onDragEnd={(event) => {
                const landed = aimed.current ?? target(event)
                done()
                const drag = dragData(event.active)
                if (landed === undefined || drag?.kind !== kind) return
                const carried = drag.value as Carried
                if ('widget' in carried) onAdd?.(carried.widget, landed.index)
                else if ('panel' in carried) {
                    refocus.current = carried.panel
                    onLayoutChange(moveItem(layout, ids.indexOf(carried.panel), landed.index))
                }
            }}
            onDragCancel={done}
        >
            <div className={cn('flex min-w-0 flex-col gap-3', className)}>
                {showEnd && (
                    <ul aria-label={words.palette} className="flex flex-wrap gap-2">
                        {palette.map((widget) => (
                            <PaletteChip
                                key={widget.id}
                                kind={kind}
                                widget={widget}
                                words={words}
                                onAdd={() => onAdd?.(widget, layout.length)}
                            />
                        ))}
                    </ul>
                )}
                <DashboardGrid dense={dense}>
                    {layout.map((item) => (
                        <ArrangedPanel
                            key={item.id}
                            kind={kind}
                            item={item}
                            label={label(item)}
                            arranging={arranging}
                            aim={aim?.id === item.id ? aim.part : undefined}
                            spans={spans === false ? [] : spans}
                            removable={removable}
                            words={words}
                            refocus={refocus}
                            onStep={(by) => step(item.id, by)}
                            onSpan={(span) => onLayoutChange(layout.map((each) => (each.id === item.id ? { ...each, span } : each)))}
                            onRemove={() => onLayoutChange(layout.filter((each) => each.id !== item.id))}
                        >
                            {renderPanel(item)}
                        </ArrangedPanel>
                    ))}
                    {showEnd && (
                        <div
                            ref={end.ref}
                            className={cn(
                                'col-span-full flex min-h-14 items-center justify-center gap-1.5 rounded-surface border border-dashed border-border-strong text-sm text-muted-foreground',
                                aim?.id === null && 'border-primary bg-primary/5 text-foreground',
                            )}
                        >
                            <Plus className="size-4" aria-hidden />
                            {words.end}
                        </div>
                    )}
                </DashboardGrid>
                <span aria-live="polite" className="sr-only">
                    {said}
                </span>
            </div>
        </DragDrop>
    )
}

/** A widget in the palette: dragged onto the grid to add a panel there, or pressed to add one at the end. */
function PaletteChip({
    kind,
    widget,
    words,
    onAdd,
}: {
    kind: string
    widget: DashboardWidget
    words: DashboardArrangeWords
    onAdd: () => void
}) {
    const item = useDragItem({
        id: `${kind}:widget:${widget.id}`,
        data: { kind, label: widget.label, value: { widget } satisfies Carried },
    })
    // Enter adds at the end; Space picks the widget up to carry it to a place.
    const { ref, ...handle } = withKeys(item.handle, (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        onAdd()
    })
    return (
        <li>
            <button
                {...handle}
                ref={(element) => {
                    item.ref(element)
                    ref?.(element)
                }}
                type="button"
                title={words.add(widget.label)}
                onClick={onAdd}
                className="flex h-8 cursor-grab touch-manipulation items-center gap-1.5 rounded-control border border-border-strong bg-card px-2.5 text-sm outline-none select-none hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:cursor-grabbing [&_svg]:size-4 [&_svg]:text-muted-foreground"
            >
                {widget.icon}
                {widget.label}
            </button>
        </li>
    )
}

interface ArrangedPanelProps {
    kind: string
    item: DashboardLayoutItem
    label: string
    arranging: boolean
    aim: 'before' | 'after' | undefined
    spans: readonly PanelSpan[]
    removable: boolean
    words: DashboardArrangeWords
    refocus: { current: string | null }
    onStep: (by: number) => void
    onSpan: (span: PanelSpan) => void
    onRemove: () => void
    children: ReactNode
}

/** One panel in its place: its width from the layout, its tools in its head while arranging, and a line where a drag lands beside it. */
function ArrangedPanel({
    kind,
    item,
    label,
    arranging,
    aim,
    spans,
    removable,
    words,
    refocus,
    onStep,
    onSpan,
    onRemove,
    children,
}: ArrangedPanelProps) {
    const dragging = useDragging()
    const data = { kind, label, value: { panel: item.id } satisfies Carried, preview: () => <PanelPreview label={label} /> }
    const drag = useDragItem({ id: `${kind}:panel:${item.id}`, data, disabled: !arranging })
    const drop = useDropTarget({ id: `${kind}:at:${item.id}`, data, disabled: !arranging })
    const grip = useRef<HTMLElement | null>(null)
    useLayoutEffect(() => {
        if (refocus.current !== item.id) return
        refocus.current = null
        grip.current?.focus()
    })
    const handle = withKeys(drag.handle, (event: KeyboardEvent<HTMLElement>) => {
        if (dragging.current || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return
        const by =
            event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
        if (by === 0) return
        event.preventDefault()
        onStep(by)
    })
    const span = item.span ?? 'third'
    const tools = arranging ? (
        <span data-panel-tools className="pointer-events-auto relative z-10 ml-auto flex shrink-0 items-center gap-0.5">
            <DragGrip
                size="icon-xs"
                label={words.move(label)}
                handle={{
                    ...handle,
                    ref: (element) => {
                        grip.current = element
                        handle.ref?.(element)
                    },
                }}
            />
            {spans.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <IconButton size="icon-xs" label={words.size(label)}>
                                <StretchHorizontal aria-hidden />
                            </IconButton>
                        }
                    />
                    <DropdownMenuContent align="end">
                        <DropdownMenuRadioGroup value={span} onValueChange={(value) => onSpan(value as PanelSpan)}>
                            {spans.map((each) => (
                                <DropdownMenuRadioItem key={each} value={each}>
                                    {words.spans[each]}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            {removable && (
                <IconButton size="icon-xs" destructive label={words.remove(label)} onClick={onRemove}>
                    <X aria-hidden />
                </IconButton>
            )}
        </span>
    ) : null
    return (
        <div
            ref={(element) => {
                drag.ref(element)
                drop.ref(element)
            }}
            data-dragging={drag.dragging || undefined}
            className={cn(
                'relative flex min-w-0 flex-col *:min-h-0 *:flex-1',
                SPAN[span],
                arranging && 'rounded-surface outline-1 outline-offset-2 outline-border-strong outline-dashed',
                drag.dragging && 'opacity-40',
            )}
        >
            {aim !== undefined && (
                <span
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute inset-y-0 z-20 w-0.5 rounded-full bg-primary',
                        aim === 'before' ? '-left-1.5' : '-right-1.5',
                    )}
                />
            )}
            <PanelToolsProvider tools={tools}>{children}</PanelToolsProvider>
        </div>
    )
}

/** What follows the pointer as a panel is dragged: a card of its size with its name. */
function PanelPreview({ label }: { label: string }) {
    return (
        <div className="flex size-full min-h-10 items-start rounded-surface border border-border-strong px-3 py-2.5 text-sm font-medium">
            {label}
        </div>
    )
}
