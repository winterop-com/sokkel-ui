import { ArrowUpRight, ChevronDown, X } from 'lucide-react'
import type { ComponentProps, KeyboardEvent, MouseEvent, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { KIND_CHIP, type KindColor } from '../lib/kind'
import { Link } from './Link'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'

/**
 * A chip's tone: neutral, a semantic color drawn as a faint wash with its own ink, `outline`, a
 * hairline edge with no wash, or `absent`, a dashed edge around muted words for a value that is not
 * there.
 */
export type ChipTone = 'neutral' | 'good' | 'critical' | 'warning' | 'info' | 'outline' | 'absent'

// Each look's `data-selected` wash is the stronger one a chosen toggle wears.
const TONE: Record<ChipTone, string> = {
    neutral: 'bg-faint/15 text-muted-foreground data-selected:bg-faint/35 data-selected:text-foreground',
    good: 'bg-good/15 text-good-ink data-selected:bg-good/30',
    critical: 'bg-critical/15 text-critical-ink data-selected:bg-critical/30',
    warning: 'bg-warning/15 text-warning-ink data-selected:bg-warning/30',
    info: 'bg-info/15 text-info-ink data-selected:bg-info/30',
    outline: 'border-border text-foreground data-selected:bg-faint/25',
    absent: 'border-dashed border-border-strong text-muted-foreground',
}

/**
 * A category's hue, for a chip that tells kinds apart rather than says how something is: a block's
 * category, a tag's group. One of the chart palette's five (1 to 5), set by a theme with the
 * charts', or a kind color by name (`blue`, `violet`, `green`, `pink`, `teal`, `jade`), the one a
 * label, a calendar or a person wears.
 */
export type ChipHue = 1 | 2 | 3 | 4 | 5 | KindColor

const HUE: Record<ChipHue, string> = {
    1: 'border-chart-1/30 bg-chart-1/12 text-chart-1',
    2: 'border-chart-2/30 bg-chart-2/12 text-chart-2',
    3: 'border-chart-3/30 bg-chart-3/12 text-chart-3',
    4: 'border-chart-4/30 bg-chart-4/12 text-chart-4',
    5: 'border-chart-5/30 bg-chart-5/12 text-chart-5',
    ...KIND_CHIP,
}

/** A hue's chosen wash, the stronger one a toggle wears while on. */
const HUE_SELECTED = 'data-selected:bg-current/20'

/**
 * How tall a chip is: `default` sits in a line of text or a table cell; `control` stands alone as
 * a control does, as tall as a field or a button and a finger tall below md.
 */
export type ChipSize = 'default' | 'control'

// An icon given its own size class keeps it, so a 16px mark is not drawn at 14px.
const SIZE: Record<ChipSize, string> = {
    default: "h-5 text-badge [&_svg:not([class*='size-'])]:size-3",
    control: "h-(--density-control) text-xs max-md:h-finger [&_svg:not([class*='size-'])]:size-3.5",
}

/** Where a chip's menu lines up with the chip. */
export type ChipMenuAlign = 'start' | 'center' | 'end'

const RING = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring focus-visible:outline-solid'

export interface ChipWords {
    /** The remove button's name and tooltip, or a function of the chip's words ("Remove harbor"). */
    remove: string | ((text: string) => string)
    /** Read after an external link chip's words, for a screen reader. */
    newTab: string
}

const WORDS: ChipWords = { remove: 'Remove', newTab: 'opens in a new tab' }

/** The chip's words as text, for a name that says them; empty when they are not plain text. */
function textOf(children: ReactNode): string {
    if (typeof children === 'string' || typeof children === 'number') return String(children)
    if (Array.isArray(children)) return children.map(textOf).join('')
    return ''
}

/** Keeps a press of a chip's button from also pressing a row or a card around the chip. */
function holdKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
}

/** Keeps a press inside a chip's menu, which React bubbles through the portal, from pressing a row around the chip. */
function holdPress(event: MouseEvent<HTMLElement>) {
    event.stopPropagation()
}

/** One thing a chip's menu does: filter by the chip, copy it, open what it names. */
export interface ChipMenuItem {
    label: ReactNode
    icon?: ReactNode
    onSelect: () => void
    disabled?: boolean
    destructive?: boolean
}

/**
 * A chip's props. Any other attribute of a `span` (`data-*`, `aria-*`, a handler) and `ref` go to
 * the chip's root, so a chip can be the `render` target of a tooltip's or a popover's trigger.
 */
export interface ChipProps extends Omit<ComponentProps<'span'>, 'children' | 'title' | 'onSelect' | 'className'> {
    children: ReactNode
    /** Neutral by default. */
    tone?: ChipTone
    /**
     * A category's hue, from the chart palette or a kind color, worn in place of the tone: a wash
     * with its ink, edged faintly in the color, as a kind badge is.
     */
    hue?: ChipHue
    /** The words in the code face, for an id, a tag or a key. */
    mono?: boolean
    /** `default` for a chip in a line or a cell, `control` for one that stands alone as a control. */
    size?: ChipSize
    /** Drawn before the words, at the chip's icon size, or at its own where it carries a `size-*` class. */
    icon?: ReactNode
    /** Said on hover: the whole value when the chip cuts it short, or what it means. */
    title?: string
    /**
     * Makes the chip a button, pressed to open or filter by what it says. The press stops there, so
     * a row or a card around the chip is not pressed too.
     */
    onSelect?: (event: MouseEvent<HTMLButtonElement>) => void
    /** The select button's or the link's name and tooltip, saying what a press does ("Filter by harbor"); the chip's words by default. */
    selectLabel?: string
    /**
     * A toggle chip's state: the select button says it is pressed, and the chip wears an edge in its
     * own ink over a stronger wash. Given with `onSelect`, for one of many chips each turned on and off by itself.
     */
    selected?: boolean
    /**
     * Makes the chip a menu's trigger: a press opens these items under it, and a chevron after the
     * words says so. It takes the place of `onSelect`. The press and the items' presses stop there.
     */
    menu?: readonly ChipMenuItem[]
    /** Where the menu lines up under the chip: its start edge by default, its center or its end. */
    menuAlign?: ChipMenuAlign
    /**
     * Makes the chip a link to what it names, drawn through the app's `LinkProvider`. It takes the
     * place of `onSelect`; `menu` takes the place of it.
     */
    href?: string
    /** Opens `href` in a new tab, safely, with a trailing mark and words saying so, as `TextLink` does. */
    external?: boolean
    /** The menu open, held by the app; leave it out and the chip holds it. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /** Gives the chip a remove button at its end, named by `words.remove`. The press stops there, as `onSelect`'s does. */
    onRemove?: (event: MouseEvent<HTMLButtonElement>) => void
    words?: Partial<ChipWords>
    className?: string
}

/**
 * A short value as a chip: a tag on a job, a state that has no run color, a value that is absent.
 * Its tone is neutral, a semantic color's wash with its own ink, `outline`, a hairline edge, or
 * `absent`, dashed; `hue` gives it a category's color instead, edged faintly, from the chart
 * palette or a kind color. `mono` sets the words in the code face and `icon` goes before them.
 * `size="control"` makes a chip that stands alone as a control as tall as one, a finger tall on a
 * phone. With `onSelect` the chip is a button, named by `selectLabel` where a press does more than
 * its words say; with `href` it is a link, through the app's `LinkProvider`, and `external` opens
 * it in a new tab with a trailing mark; with `onRemove` it ends in a remove button, its own stop in
 * the tab order with its own focus ring. No press reaches a row or card around the chip. `selected`
 * makes a select chip a toggle, pressed, edged in its ink and on a stronger wash while on. With
 * `menu` the chip is a menu's trigger, opening its items under it at `menuAlign`. A long value ends
 * in an ellipsis inside the room it is given. Any other `span` attribute and `ref` go to its root,
 * so it can stand as a tooltip trigger's `render` target, and an icon with its own `size-*` class keeps it.
 */
export function Chip({
    children,
    tone = 'neutral',
    hue,
    mono = false,
    size = 'default',
    icon,
    title,
    onSelect,
    selectLabel,
    selected,
    menu,
    menuAlign = 'start',
    href,
    external = false,
    open,
    defaultOpen,
    onOpenChange,
    onRemove,
    words: given,
    className,
    ...rest
}: ChipProps) {
    const words = { ...WORDS, ...given }
    const remove = typeof words.remove === 'function' ? words.remove(textOf(children)) : words.remove
    const control = size === 'control'
    const start = control ? 'pl-2.5' : 'pl-1.5'
    const end = onRemove === undefined && (control ? 'pr-2.5' : 'pr-1.5')
    // Over the chip's 1px edge too, so a control chip's link or button is as tall as the chip.
    const press = cn(
        '-my-px flex h-[calc(100%+2px)] min-w-0 cursor-pointer items-center gap-1 rounded-chip hover:underline hover:underline-offset-2',
        start,
        end,
        RING,
    )
    const face = (
        <>
            {icon}
            <span className="min-w-0 truncate">{children}</span>
        </>
    )
    return (
        <span
            {...rest}
            data-slot="chip"
            data-selected={selected === true ? '' : undefined}
            title={title}
            className={cn(
                'inline-flex max-w-full min-w-0 shrink-0 items-center rounded-chip border border-transparent whitespace-nowrap [&_svg]:shrink-0',
                SIZE[size],
                mono && 'font-mono',
                hue === undefined ? TONE[tone] : [HUE[hue], HUE_SELECTED],
                selected === true && 'border-current',
                className,
            )}
        >
            {menu !== undefined ? (
                <DropdownMenu open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
                    <DropdownMenuTrigger
                        data-slot="chip-select"
                        aria-label={selectLabel}
                        title={selectLabel}
                        onClick={holdPress}
                        onKeyDown={holdKeys}
                        className={press}
                    >
                        {face}
                        <ChevronDown aria-hidden className="opacity-70" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={menuAlign} className="w-auto" onClick={holdPress} onKeyDown={holdKeys}>
                        {menu.map((item, index) => (
                            <DropdownMenuItem
                                key={index}
                                disabled={item.disabled}
                                variant={item.destructive === true ? 'destructive' : 'default'}
                                onClick={item.onSelect}
                            >
                                {item.icon}
                                {item.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : href !== undefined ? (
                <Link
                    href={href}
                    data-slot="chip-link"
                    title={selectLabel}
                    aria-label={selectLabel}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    onClick={holdPress}
                    onKeyDown={holdKeys}
                    className={press}
                >
                    {face}
                    {external && (
                        <>
                            <ArrowUpRight data-slot="external-mark" aria-hidden className="opacity-70" />
                            <span className="sr-only"> ({words.newTab})</span>
                        </>
                    )}
                </Link>
            ) : onSelect === undefined ? (
                <span className={cn('flex min-w-0 items-center gap-1', start, end)}>{face}</span>
            ) : (
                <button
                    type="button"
                    data-slot="chip-select"
                    aria-label={selectLabel}
                    aria-pressed={selected}
                    title={selectLabel}
                    onClick={(event) => {
                        event.stopPropagation()
                        onSelect(event)
                    }}
                    onKeyDown={holdKeys}
                    className={press}
                >
                    {face}
                </button>
            )}
            {onRemove !== undefined && (
                <button
                    type="button"
                    data-slot="chip-remove"
                    aria-label={remove}
                    title={remove}
                    onClick={(event) => {
                        event.stopPropagation()
                        onRemove(event)
                    }}
                    onKeyDown={holdKeys}
                    className={cn(
                        'mx-0.5 flex shrink-0 cursor-pointer items-center rounded-mini p-0.5 opacity-70 hover:bg-hover hover:opacity-100',
                        RING,
                    )}
                >
                    <X aria-hidden />
                </button>
            )}
        </span>
    )
}
