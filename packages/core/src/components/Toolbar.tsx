import { Ellipsis } from 'lucide-react'
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { SplitButton, type SplitButtonItem } from './SplitButton'
import { fitCount } from './TagChips'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'

/** A tool that moves into the More menu when the toolbar has no room for it. */
export interface ToolbarItem {
    id: string
    /**
     * What the tool is called: its accessible name, its entry in More, and its face in the row
     * unless `face` is given.
     */
    label: string
    /** A shorter face in the row, where the page around it names the rest: "New" here, "New job" in `label`. */
    face?: ReactNode
    icon?: ReactNode
    onSelect?: () => void
    disabled?: boolean
    /**
     * Why the tool cannot be used now; given, it is shut but stays reachable: `aria-disabled` and
     * the reason in its tooltip in the row, and a shut entry with the reason under it in More.
     */
    reason?: ReactNode
    /** For a tool that destroys: the critical tint under the pointer in the row, and in More. */
    destructive?: boolean
    /**
     * Related ways to do the tool's action, drawn in the row as a `SplitButton`'s menu; in More the
     * tool's own entry comes first and these after it, set apart as a group.
     */
    more?: readonly SplitButtonItem[]
    /** The name of the split button's chevron for this tool's `more`, in place of the toolbar's `moreWays`. */
    moreLabel?: string
    /**
     * The tool's look in the row in place of the toolbar's: `outline` for a primary that is quiet until
     * it would do something, `default` filled, `ghost` bare.
     */
    variant?: 'default' | 'outline' | 'ghost'
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
    /** The name of the chevron that opens a split tool's related ways. */
    moreWays: string
}

const WORDS: ToolbarWords = {
    more: 'More',
    moreWays: 'More ways',
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

/** One entry in More, as a tool or one of its related ways is listed there. */
export interface ToolbarEntry {
    key: string
    label: ReactNode
    icon?: ReactNode
    /** A line under the label: the reason a shut entry gives, or how a related way differs. */
    note?: ReactNode
    onSelect?: () => void
    /** Shut, by `disabled` or by a reason. */
    shut: boolean
    destructive: boolean
    /** Checked or not, for a toggle. */
    pressed?: boolean
    /** Set in to line up with its tool's label: a related way without an icon under a tool with one. */
    inset: boolean
}

/** A reason that says something, as `reason` props are read across the library. */
function said(reason: ReactNode): boolean {
    return reason !== undefined && reason !== null && reason !== false
}

/** What More lists for a tool: its own entry, then its related ways in order, all shut with it. */
export function toolbarEntries(item: ToolbarItem): ToolbarEntry[] {
    const shut = said(item.reason) || item.disabled === true
    const own: ToolbarEntry = {
        key: item.id,
        label: item.label,
        icon: item.icon,
        note: said(item.reason) ? item.reason : undefined,
        onSelect: item.onSelect,
        shut,
        destructive: item.destructive === true,
        pressed: item.pressed,
        inset: false,
    }
    const ways = (item.more ?? []).map((way, index): ToolbarEntry => ({
        key: `${item.id}-${String(index)}`,
        label: way.label,
        icon: way.icon,
        note: way.description,
        onSelect: way.onSelect,
        shut: shut || way.disabled === true,
        destructive: way.destructive === true,
        inset: item.icon !== undefined && way.icon === undefined,
    }))
    return [own, ...ways]
}

/** How the plain buttons in the row look: bare, or framed as a page header's actions are. */
export type ToolbarItemVariant = 'ghost' | 'outline'

/** A tool as the row draws it: the app's own node, a split button for one with related ways, or a plain button. */
function Inline({
    item,
    variant,
    words,
    icons = true,
}: {
    item: ToolbarItem
    variant: ToolbarItemVariant | 'default'
    words: ToolbarWords
    icons?: boolean
}) {
    if (item.render !== undefined) return item.render
    const icon = icons ? item.icon : undefined
    const look = item.variant ?? variant
    const named = item.face !== undefined
    const title = named && !said(item.reason) ? item.label : undefined
    if (item.more !== undefined) {
        return (
            <SplitButton
                variant={look}
                size="sm"
                label={named ? item.label : undefined}
                title={title}
                onClick={item.onSelect}
                items={item.more}
                disabled={item.disabled}
                reason={item.reason}
                words={{ more: item.moreLabel ?? words.moreWays }}
            >
                {icon}
                {item.face ?? item.label}
            </SplitButton>
        )
    }
    return (
        <Button
            variant={look}
            size="sm"
            disabled={item.disabled}
            reason={item.reason}
            aria-label={named ? item.label : undefined}
            title={title}
            aria-pressed={item.pressed}
            onClick={item.onSelect}
            destructiveHover={item.destructive === true}
            className={cn(item.pressed === true && 'bg-muted text-foreground')}
        >
            {icon}
            {item.face ?? item.label}
        </Button>
    )
}

/** An entry's icon and label, with its note under the label where it has one. */
function EntryFace({ entry }: { entry: ToolbarEntry }) {
    return (
        <>
            {entry.icon}
            {entry.note === undefined ? (
                entry.label
            ) : (
                <span className="flex min-w-0 flex-col">
                    <span>{entry.label}</span>
                    <span className="text-help text-muted-foreground">{entry.note}</span>
                </span>
            )}
        </>
    )
}

/** One entry as More lists it: a checked entry for a toggle, or a plain one. */
function Entry({ entry }: { entry: ToolbarEntry }) {
    const tall = entry.note !== undefined && 'items-start'
    if (entry.pressed !== undefined) {
        return (
            <DropdownMenuCheckboxItem
                checked={entry.pressed}
                disabled={entry.shut}
                onCheckedChange={() => entry.onSelect?.()}
                className={cn(tall)}
            >
                <EntryFace entry={entry} />
            </DropdownMenuCheckboxItem>
        )
    }
    return (
        <DropdownMenuItem
            disabled={entry.shut}
            variant={entry.destructive ? 'destructive' : 'default'}
            inset={entry.inset}
            onClick={entry.onSelect}
            className={cn(tall)}
        >
            <EntryFace entry={entry} />
        </DropdownMenuItem>
    )
}

/** A tool with related ways, listed in More as a group of its own. */
function isSplit(item: ToolbarItem | undefined): boolean {
    return item !== undefined && item.more !== undefined && item.menu === undefined
}

/** The tools in More, in order: the app's own entry, or a tool's entries, a split tool's as a group set apart by rules. */
function Entries({ items }: { items: readonly ToolbarItem[] }) {
    return items.map((item, index) => {
        const rule = index > 0 && (isSplit(item) || isSplit(items[index - 1])) && <DropdownMenuSeparator />
        const entries = item.menu !== undefined ? item.menu : toolbarEntries(item).map((entry) => <Entry key={entry.key} entry={entry} />)
        return (
            <Fragment key={item.id}>
                {rule}
                {isSplit(item) ? <DropdownMenuGroup>{entries}</DropdownMenuGroup> : entries}
            </Fragment>
        )
    })
}

/** The More button, drawn by the menu's trigger and by the ruler alike. */
function moreButton(label: string, variant: ToolbarItemVariant) {
    return (
        <Button
            variant={variant}
            size="icon-sm"
            aria-label={label}
            title={label}
            className={cn(variant === 'ghost' && 'text-muted-foreground')}
        />
    )
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
    /** A part before `items` in their room that never moves into More, such as a status chip. */
    itemsLead?: ReactNode
    /**
     * The primary action after `items` and More, drawn filled, that never moves into More: a reason,
     * a face, a label and related ways (`more`, a split button) as any item takes them.
     */
    primary?: ToolbarItem
    /**
     * Keeps the row to one line: its tools never wrap onto a second, and the search and the room for
     * `items` give way instead, `items` folding into More. Off by default, so a phone sees every tool.
     */
    nowrap?: boolean
    /** Draws `items` and `primary` in the row by their words alone, the icons kept for the entries in More. */
    wordsOnly?: boolean
    /** Opens More on the first render, for a still view of it. */
    defaultMoreOpen?: boolean
    /** How `items` drawn as plain buttons look, and More with them: `ghost` (the default) or `outline`. */
    itemVariant?: ToolbarItemVariant
    /** Where `items` stand in the room they have: after `children` (`start`, the default), or at its end. */
    itemsAlign?: 'start' | 'end'
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
 * own `menu`. A tool with a `reason` is shut but stays reachable, saying why in its tooltip and
 * under its entry; one with `more` is a split button in the row and a group in More, its own entry
 * and then its related ways. `face` gives a tool a shorter face in the row than its `label`, which
 * stays its name. As the toolbar widens they come back out. `itemsAlign="end"` stands them at the end of
 * their room and `itemVariant="outline"` frames them, for a row of actions such as a page header's.
 *
 * `variant="pane"` makes it a strip across the top of a pane, padded with a rule under it; on a
 * page it sits in the page's flow.
 */
export function Toolbar({
    search,
    children,
    items,
    itemsLead,
    primary,
    wordsOnly = false,
    nowrap = false,
    defaultMoreOpen = false,
    itemVariant = 'ghost',
    itemsAlign = 'start',
    end,
    variant = 'page',
    className,
    words: given,
}: ToolbarProps) {
    const words = { ...WORDS, ...given }
    const room = useRef<HTMLDivElement>(null)
    const ruler = useRef<HTMLDivElement>(null)
    const leader = useRef<HTMLDivElement>(null)
    const trailer = useRef<HTMLDivElement>(null)
    const icons = !wordsOnly
    const [fit, setFit] = useState(items?.length ?? 0)
    const count = items?.length ?? 0
    const led = itemsLead !== undefined && itemsLead !== null && itemsLead !== false
    useLayoutEffect(() => {
        const box = room.current
        const measure = ruler.current
        if (box === null || measure === null) return
        const update = () => {
            const boxes = [...measure.children] as HTMLElement[]
            const more = boxes.pop()?.offsetWidth ?? 0
            const widths = boxes.map((one) => one.offsetWidth)
            const lead = leader.current === null ? 0 : leader.current.offsetWidth + ITEM_GAP
            const last = trailer.current === null ? 0 : trailer.current.offsetWidth + ITEM_GAP
            setFit(toolbarSplit(widths, widths, box.clientWidth - lead - last, ITEM_GAP, more).inline.length)
        }
        update()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(update)
        observer.observe(box)
        observer.observe(measure)
        if (leader.current !== null) observer.observe(leader.current)
        if (trailer.current !== null) observer.observe(trailer.current)
        return () => observer.disconnect()
    }, [count, led, primary !== undefined])
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
            <div className={cn('flex min-h-8 min-w-0 items-center gap-x-3 gap-y-2', nowrap ? 'flex-nowrap' : 'flex-wrap')}>
                {search !== undefined && <div className={cn(nowrap ? 'min-w-24 shrink' : 'w-full', '@md/toolbar:w-64')}>{search}</div>}
                {children}
                {(items !== undefined || primary !== undefined) && (
                    <div
                        ref={room}
                        data-slot="toolbar-items"
                        className={cn(
                            'relative flex min-w-0 flex-1 basis-24 items-center gap-2 has-data-[slot=toolbar-title]:basis-64',
                            itemsAlign === 'end' && 'justify-end',
                        )}
                    >
                        {/* Every tool and More at their own widths, out of sight, so what fits is known before it is drawn. */}
                        <div
                            ref={ruler}
                            aria-hidden
                            inert
                            className="pointer-events-none invisible absolute top-0 left-0 flex h-0 w-max items-center gap-2 overflow-hidden"
                        >
                            {(items ?? []).map((item) => (
                                <div key={item.id} className="flex shrink-0 items-center">
                                    <Inline item={item} variant={itemVariant} words={words} icons={icons} />
                                </div>
                            ))}
                            <div className="flex shrink-0 items-center">{moreButton(words.more, itemVariant)}</div>
                        </div>
                        {led && (
                            <div ref={leader} data-slot="toolbar-items-lead" className="flex shrink-0 items-center">
                                {itemsLead}
                            </div>
                        )}
                        {inline.map((item) => (
                            <div key={item.id} className="flex shrink-0 items-center">
                                <Inline item={item} variant={itemVariant} words={words} icons={icons} />
                            </div>
                        ))}
                        {overflow.length > 0 && (
                            <DropdownMenu defaultOpen={defaultMoreOpen}>
                                <DropdownMenuTrigger render={moreButton(words.more, itemVariant)}>
                                    <Ellipsis aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-auto min-w-48">
                                    <Entries items={overflow} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {primary !== undefined && (
                            <div ref={trailer} data-slot="toolbar-primary" className="flex shrink-0 items-center">
                                <Inline item={primary} variant="default" words={words} icons={icons} />
                            </div>
                        )}
                    </div>
                )}
                {end !== undefined && (
                    <div className={cn('ml-auto flex min-w-0 items-center gap-2', nowrap ? 'shrink-0 flex-nowrap' : 'flex-wrap')}>
                        {end}
                    </div>
                )}
            </div>
        </div>
    )
}

export interface ToolbarTitleProps {
    as?: 'h1' | 'h2' | 'h3'
    children: ReactNode
}

/**
 * The title a toolbar names its content by, such as the month a calendar shows; it takes the room
 * the tools leave and truncates. A toolbar with a title keeps room for it, its end moving to a
 * line of its own first, so a phone still reads the date.
 */
export function ToolbarTitle({ as: Heading = 'h2', children }: ToolbarTitleProps) {
    return (
        <Heading data-slot="toolbar-title" className="min-w-0 flex-1 truncate text-detail-title">
            {children}
        </Heading>
    )
}
