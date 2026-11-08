import { Ellipsis } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { fitCount } from './TagChips'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'

/** A tool that moves into the More menu when the toolbar has no room for it. */
export interface ToolbarItem {
    id: string
    /** What the tool says, in the row and as its entry in More. */
    label: string
    icon?: ReactNode
    onSelect?: () => void
    disabled?: boolean
    /** On or off, for a tool that toggles: pressed in the row, checked in More. */
    pressed?: boolean
    /** Drawn in the row in place of the plain button, such as a `FilterChip`. */
    render?: ReactNode
    /** Drawn in More in place of the plain entry, such as a submenu; the plain entry calls `onSelect`. */
    menu?: ReactNode
}

/** The words a toolbar says. */
export interface ToolbarWords {
    /** The button that holds the tools the row has no room for. */
    more: string
}

const WORDS: ToolbarWords = {
    more: 'More',
}

/** The gap between the tools that move into More, in pixels; `gap-2` below. */
const ITEM_GAP = 8

/**
 * The tools the row has room for, in order, and the rest for More: as many as fit `room` with the
 * gap between each two, keeping room for More whenever any are left out.
 */
export function toolbarSplit<T>(
    items: readonly T[],
    widths: readonly number[],
    room: number,
    gap: number,
    moreWidth: number,
): { inline: T[]; overflow: T[] } {
    const count = fitCount(widths.slice(0, items.length), room, gap, moreWidth)
    return { inline: items.slice(0, count), overflow: items.slice(count) }
}

/** A tool as the row draws it: the app's own node, or a plain button with its icon and label. */
function Inline({ item }: { item: ToolbarItem }) {
    if (item.render !== undefined) return item.render
    return (
        <Button
            variant="ghost"
            size="sm"
            disabled={item.disabled}
            aria-pressed={item.pressed}
            onClick={item.onSelect}
            className={cn(item.pressed === true && 'bg-muted text-foreground')}
        >
            {item.icon}
            {item.label}
        </Button>
    )
}

/** A tool as More lists it: the app's own entry, a checked entry for a toggle, or a plain one. */
function Entry({ item }: { item: ToolbarItem }) {
    if (item.menu !== undefined) return item.menu
    if (item.pressed !== undefined) {
        return (
            <DropdownMenuCheckboxItem checked={item.pressed} disabled={item.disabled} onCheckedChange={() => item.onSelect?.()}>
                {item.icon}
                {item.label}
            </DropdownMenuCheckboxItem>
        )
    }
    return (
        <DropdownMenuItem disabled={item.disabled} onClick={item.onSelect}>
            {item.icon}
            {item.label}
        </DropdownMenuItem>
    )
}

/** The More button, drawn by the menu's trigger and by the ruler alike. */
function moreButton(label: string) {
    return <Button variant="ghost" size="icon-sm" aria-label={label} title={label} className="text-muted-foreground" />
}

export interface ToolbarProps {
    /** The search field, sized by the toolbar. */
    search?: ReactNode
    /** The tools after the search, in order. */
    children?: ReactNode
    /**
     * Tools after `children` that move, from the last, into a More menu at their end when the
     * row has no room for them, so the row stays one line.
     */
    items?: readonly ToolbarItem[]
    /** Opens More on the first render, for a still view of it. */
    defaultMoreOpen?: boolean
    /** Tools at the end of the row, such as a count, a sort or a view switch. */
    end?: ReactNode
    variant?: 'page' | 'pane'
    className?: string
    words?: Partial<ToolbarWords>
}

/**
 * The row of tools above a page's or a pane's content: a search, filters, a `Segmented`, a sort,
 * a count. `search` comes first and takes the row's whole width when the row is narrow; `children`
 * follow in order; `end` stands at the row's right end. When the row runs out of room its tools
 * wrap onto more lines rather than overflow, so none is hidden on a phone.
 *
 * `items` are tools that give way instead: they follow `children` in the room the row has left,
 * measured on the toolbar itself rather than the window, and those that do not fit move into a
 * More menu at their end, in order, as a plain entry, a checked one for a toggle, or the item's
 * own `menu`. As the toolbar widens they come back out.
 *
 * `variant="pane"` makes it a strip across the top of a pane, padded with a rule under it; on a
 * page it sits in the page's flow.
 */
export function Toolbar({
    search,
    children,
    items,
    defaultMoreOpen = false,
    end,
    variant = 'page',
    className,
    words: given,
}: ToolbarProps) {
    const words = { ...WORDS, ...given }
    const room = useRef<HTMLDivElement>(null)
    const ruler = useRef<HTMLDivElement>(null)
    const [fit, setFit] = useState(items?.length ?? 0)
    const count = items?.length ?? 0
    useLayoutEffect(() => {
        const box = room.current
        const measure = ruler.current
        if (box === null || measure === null) return
        const update = () => {
            const boxes = [...measure.children] as HTMLElement[]
            const more = boxes.pop()?.offsetWidth ?? 0
            const widths = boxes.map((one) => one.offsetWidth)
            setFit(toolbarSplit(widths, widths, box.clientWidth, ITEM_GAP, more).inline.length)
        }
        update()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(update)
        observer.observe(box)
        observer.observe(measure)
        return () => observer.disconnect()
    }, [count])
    const inline = items?.slice(0, fit) ?? []
    const overflow = items?.slice(fit) ?? []
    return (
        <div
            className={cn(
                '@container/toolbar min-w-0',
                variant === 'pane' && 'shrink-0 border-b border-border px-(--density-panel-pad) py-2',
                className,
            )}
        >
            <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                {search !== undefined && <div className="w-full @md/toolbar:w-64">{search}</div>}
                {children}
                {items !== undefined && (
                    <div ref={room} data-slot="toolbar-items" className="relative flex min-w-0 flex-1 basis-24 items-center gap-2">
                        {/* Every tool and More at their own widths, out of sight, so what fits is known before it is drawn. */}
                        <div
                            ref={ruler}
                            aria-hidden
                            inert
                            className="pointer-events-none invisible absolute top-0 left-0 flex h-0 w-max items-center gap-2 overflow-hidden"
                        >
                            {items.map((item) => (
                                <div key={item.id} className="flex shrink-0 items-center">
                                    <Inline item={item} />
                                </div>
                            ))}
                            <div className="flex shrink-0 items-center">{moreButton(words.more)}</div>
                        </div>
                        {inline.map((item) => (
                            <div key={item.id} className="flex shrink-0 items-center">
                                <Inline item={item} />
                            </div>
                        ))}
                        {overflow.length > 0 && (
                            <DropdownMenu defaultOpen={defaultMoreOpen}>
                                <DropdownMenuTrigger render={moreButton(words.more)}>
                                    <Ellipsis aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-48">
                                    {overflow.map((item) => (
                                        <Entry key={item.id} item={item} />
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )}
                {end !== undefined && <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">{end}</div>}
            </div>
        </div>
    )
}

export interface ToolbarTitleProps {
    as?: 'h1' | 'h2' | 'h3'
    children: ReactNode
}

/** The title a toolbar names its content by, such as the month a calendar shows; it takes the room the tools leave and truncates. */
export function ToolbarTitle({ as: Heading = 'h2', children }: ToolbarTitleProps) {
    return <Heading className="min-w-0 flex-1 truncate text-detail-title">{children}</Heading>
}
