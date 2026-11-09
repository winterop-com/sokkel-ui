import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { FieldRows } from './field-rows'

/**
 * The gaps a layout puts between its cells, smallest to largest. A gap that falls between two steps
 * takes the smaller one, keeping the library's density. `page` is the density's gap
 * between a page's sections, `section` its gap between a section's head and body, and `inspector`
 * its gap between a list and its inspector, so all three tighten with compact density.
 */
export const GAP = {
    none: 'gap-0',
    '3xs': 'gap-0.5',
    '2xs': 'gap-1',
    xs: 'gap-1.5',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
    xl: 'gap-6',
    '2xl': 'gap-8',
    '3xl': 'gap-10',
    page: 'gap-(--density-page-gap)',
    section: 'gap-(--density-section-gap)',
    inspector: 'gap-(--density-inspector-gap)',
} as const

export type Gap = keyof typeof GAP

/** The gap between wrapped lines alone, for a row or a grid whose lines sit further apart than its cells. */
const ROW_GAP: Record<Gap, string> = {
    none: 'gap-y-0',
    '3xs': 'gap-y-0.5',
    '2xs': 'gap-y-1',
    xs: 'gap-y-1.5',
    sm: 'gap-y-2',
    md: 'gap-y-3',
    lg: 'gap-y-4',
    xl: 'gap-y-6',
    '2xl': 'gap-y-8',
    '3xl': 'gap-y-10',
    page: 'gap-y-(--density-page-gap)',
    section: 'gap-y-(--density-section-gap)',
    inspector: 'gap-y-(--density-inspector-gap)',
}

/** The window widths a layout can change at: 40, 48, 64 and 80rem. */
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl'

/**
 * The widths of a room a layout can change at: 24, 28, 32, 36, 42 and 48rem. A room is the nearest
 * layout above marked `room`, so a part answers to the space it is given rather than to the window.
 */
export type RoomSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

/** Hidden below the window width, shown from it: an aside a phone has no room for. */
const FROM: Record<Breakpoint, string> = {
    sm: 'max-sm:hidden',
    md: 'max-md:hidden',
    lg: 'max-lg:hidden',
    xl: 'max-xl:hidden',
}

/** Hidden while the room is narrower than the size. */
const FROM_ROOM: Record<RoomSize, string> = {
    sm: '@max-sm:hidden',
    md: '@max-md:hidden',
    lg: '@max-lg:hidden',
    xl: '@max-xl:hidden',
    '2xl': '@max-2xl:hidden',
    '3xl': '@max-3xl:hidden',
}

/** A row's cells stacked one under the other while the room is narrower than the size. */
const STACK_BELOW_ROOM: Record<RoomSize, string> = {
    sm: '@max-sm:flex-col @max-sm:items-stretch',
    md: '@max-md:flex-col @max-md:items-stretch',
    lg: '@max-lg:flex-col @max-lg:items-stretch',
    xl: '@max-xl:flex-col @max-xl:items-stretch',
    '2xl': '@max-2xl:flex-col @max-2xl:items-stretch',
    '3xl': '@max-3xl:flex-col @max-3xl:items-stretch',
}

/** A row's cells stacked one under the other below the window width, each as wide as the row. */
const STACK_BELOW: Record<Breakpoint, string> = {
    sm: 'max-sm:flex-col max-sm:items-stretch',
    md: 'max-md:flex-col max-md:items-stretch',
    lg: 'max-lg:flex-col max-lg:items-stretch',
    xl: 'max-xl:flex-col max-xl:items-stretch',
}

const ALIGN = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
    stretch: 'items-stretch',
} as const

const JUSTIFY = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
} as const

/** The element a layout draws as, for the document's outline. */
type As = 'div' | 'span' | 'p' | 'label' | 'section' | 'ul' | 'ol' | 'li' | 'dl' | 'nav' | 'header' | 'footer' | 'form' | 'main' | 'aside'

/** A layout passes the element's own attributes through: an id, `dir`, a role, data attributes, a form's submit. */
interface Base extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'> {
    children?: ReactNode
    gap?: Gap
    as?: As
    /** Hidden below this window width, shown from it: for a page's own structure. */
    from?: Breakpoint
    /** Hidden while the room it sits in is narrower than this: for a part inside a component. */
    fromRoom?: RoomSize
    /**
     * Makes this layout a room: the parts inside it that answer to a room's width measure this one.
     * A room takes its width from where it sits, never from its content, so it suits a page body,
     * a panel or a cell that fills its share of a row.
     */
    room?: boolean
    className?: string
}

/** The classes every layout takes from `from`, `fromRoom` and `room`. */
function shown({ from, fromRoom, room }: Pick<Base, 'from' | 'fromRoom' | 'room'>) {
    return cn(from !== undefined && FROM[from], fromRoom !== undefined && FROM_ROOM[fromRoom], room === true && '@container')
}

export type StackProps = Base & { align?: keyof typeof ALIGN; justify?: keyof typeof JUSTIFY; reverse?: boolean }

/**
 * Cells one under the other, each as wide as the stack. The stack itself may shrink below its
 * content's width, so in a row or a grid it gives way instead of pushing its container wider.
 * `justify` places the cells along a stack taller than they are, such as at its foot; `reverse`
 * draws the last cell first, so a scrolling stack opens at its end, as a chat does.
 */
export function Stack({
    children,
    gap = 'md',
    align = 'stretch',
    justify = 'start',
    reverse = false,
    as: Tag = 'div',
    from,
    fromRoom,
    room,
    className,
    ...props
}: StackProps) {
    return (
        <Tag
            {...props}
            className={cn(
                'flex min-w-0',
                reverse ? 'flex-col-reverse' : 'flex-col',
                GAP[gap],
                ALIGN[align],
                justify !== 'start' && JUSTIFY[justify],
                shown({ from, fromRoom, room }),
                className,
            )}
        >
            {children}
        </Tag>
    )
}

export type RowProps = Base & {
    align?: keyof typeof ALIGN
    justify?: keyof typeof JUSTIFY
    wrap?: boolean
    rowGap?: Gap
    inline?: boolean
    /** Stacks the cells below this window width: for a page's own structure. */
    stackBelow?: Breakpoint
    /** Stacks the cells while the room the row sits in is narrower than this: for a part inside a component. */
    stackBelowRoom?: RoomSize
}

/**
 * Cells side by side, centered on one line. `wrap` lets them flow onto more lines when the row runs
 * out of room, `rowGap` setting the space between those lines. Without it, a cell that truncates
 * gives way first while icons, avatars and buttons keep their width. A row that must give way
 * inside another row sets `min-w-0`. `justify="between"` sends the first cell to the start and the
 * last to the end. `stackBelow` stacks the cells below a window width, as a phone wants a page's
 * list and its detail one under the other; `stackBelowRoom` stacks them while the room the row sits
 * in is narrow, for a row inside a component that may be given a side panel or a whole page.
 * `inline` makes the row a run of text's size, inside a sentence.
 */
export function Row({
    children,
    gap = 'sm',
    rowGap,
    align = 'center',
    justify = 'start',
    wrap = false,
    inline = false,
    stackBelow,
    stackBelowRoom,
    as: Tag = 'div',
    from,
    fromRoom,
    room,
    className,
    ...props
}: RowProps) {
    return (
        <Tag
            {...props}
            className={cn(
                inline ? 'inline-flex' : 'flex',
                wrap && 'flex-wrap',
                GAP[gap],
                rowGap !== undefined && ROW_GAP[rowGap],
                ALIGN[align],
                JUSTIFY[justify],
                stackBelow !== undefined && STACK_BELOW[stackBelow],
                stackBelowRoom !== undefined && STACK_BELOW_ROOM[stackBelowRoom],
                shown({ from, fromRoom, room }),
                className,
            )}
        >
            {children}
        </Tag>
    )
}

export type CenterProps = Omit<Base, 'gap'>

/** One cell centered both ways in the room it is given: an icon in its tile, a line in an empty area. */
export function Center({ children, as: Tag = 'div', from, fromRoom, room, className, ...props }: CenterProps) {
    return (
        <Tag {...props} className={cn('flex items-center justify-center', shown({ from, fromRoom, room }), className)}>
            {children}
        </Tag>
    )
}

/** The narrowest a column may get before the grid drops one: short fields, cards, wide panels. */
const MIN = { xs: '7.5rem', sm: '10rem', md: '14rem', lg: '18rem', xl: '28rem' } as const

/** Each gap as a length, for the grid to subtract from its width when it divides it into columns. */
const GAP_LENGTH: Record<Gap, string> = {
    none: '0px',
    '3xs': 'calc(var(--spacing) * 0.5)',
    '2xs': 'calc(var(--spacing) * 1)',
    xs: 'calc(var(--spacing) * 1.5)',
    sm: 'calc(var(--spacing) * 2)',
    md: 'calc(var(--spacing) * 3)',
    lg: 'calc(var(--spacing) * 4)',
    xl: 'calc(var(--spacing) * 6)',
    '2xl': 'calc(var(--spacing) * 8)',
    '3xl': 'calc(var(--spacing) * 10)',
    page: 'var(--density-page-gap)',
    section: 'var(--density-section-gap)',
    inspector: 'var(--density-inspector-gap)',
}

export type ColumnsProps = Base & {
    count?: 2 | 3 | 4 | 6 | 'fill'
    min?: keyof typeof MIN
    align?: 'start' | 'stretch'
    rowGap?: Gap
    /**
     * Lines up the fields in it: each `Field` shares its label, description, control and help
     * rows with the fields beside it, so the controls of a row stand level when one field has a
     * description and its neighbor has none. Every cell is then a field.
     */
    fields?: boolean
}

/**
 * Cells in a grid of equal columns: up to `count` side by side, and fewer as the room narrows,
 * so no column gets narrower than `min`, down to one. `count="fill"` sets no limit: as many
 * columns as fit, for a gallery of tiles. The columns follow the room the grid is
 * given, not the window, so a grid in a side panel stacks while the same grid on a page spreads
 * out. With `fields` the fields in a row line up their controls.
 */
export function Columns({
    children,
    count = 2,
    min = 'md',
    gap = 'xl',
    rowGap,
    align = 'stretch',
    as: Tag = 'div',
    from,
    fromRoom,
    room,
    fields = false,
    className,
    style,
    ...props
}: ColumnsProps) {
    const track =
        count === 'fill'
            ? `minmax(min(${MIN[min]}, 100%), 1fr)`
            : `minmax(max(min(${MIN[min]}, 100%), calc((100% - ${String(count - 1)} * ${GAP_LENGTH[gap]}) / ${String(count)})), 1fr)`
    // Lined-up fields keep the room between their rows as their own foot, since the grid's row gap
    // would also fall between the rows each field spans.
    const between = GAP_LENGTH[rowGap ?? gap]
    const grid = (
        <Tag
            {...props}
            style={{
                gridTemplateColumns: `repeat(auto-fill, ${track})`,
                ...(fields ? { rowGap: 0, marginBottom: `calc(-1 * ${between})` } : undefined),
                ...style,
            }}
            className={cn(
                'grid min-w-0 [:where(&>*)]:min-w-0',
                GAP[gap],
                rowGap !== undefined && ROW_GAP[rowGap],
                align === 'start' && 'items-start',
                shown({ from, fromRoom, room }),
                className,
            )}
        >
            {children}
        </Tag>
    )
    // A grid inside lined-up fields that lines up none of its own leaves its fields as they are.
    return <FieldRows.Provider value={fields ? between : null}>{grid}</FieldRows.Provider>
}

/** The aside's width: a fixed width, or `third`, a third of the room beside two thirds of main content. */
const ASIDE = {
    sm: '@3xl:grid-cols-[minmax(0,1fr)_16rem]',
    md: '@3xl:grid-cols-[minmax(0,1fr)_20rem]',
    lg: '@3xl:grid-cols-[minmax(0,1fr)_24rem]',
    third: '@3xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]',
} as const

const ASIDE_START = {
    sm: '@3xl:grid-cols-[16rem_minmax(0,1fr)]',
    md: '@3xl:grid-cols-[20rem_minmax(0,1fr)]',
    lg: '@3xl:grid-cols-[24rem_minmax(0,1fr)]',
    third: '@3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
} as const

export interface SplitProps {
    children: ReactNode
    aside: ReactNode
    side?: 'start' | 'end'
    width?: keyof typeof ASIDE
    gap?: Gap
    align?: 'start' | 'stretch'
    className?: string
}

/**
 * The main content with an aside beside it: details, help, a summary. When the container is too
 * narrow for both, the aside goes under the main content, or above it when it stands at the start.
 * Side by side the two keep their own heights, unless `align="stretch"` makes them as tall as each
 * other, as two boxes on a page want.
 */
export function Split({ children, aside, side = 'end', width = 'md', gap = 'xl', align = 'start', className }: SplitProps) {
    return (
        <div className="@container min-w-0">
            <div
                className={cn(
                    'grid grid-cols-1 [:where(&>*)]:min-w-0',
                    align === 'start' ? 'items-start' : '*:flex *:*:flex-1 *:flex-col',
                    side === 'end' ? ASIDE[width] : ASIDE_START[width],
                    GAP[gap],
                    className,
                )}
            >
                {side === 'start' && <aside>{aside}</aside>}
                <div>{children}</div>
                {side === 'end' && <aside>{aside}</aside>}
            </div>
        </div>
    )
}

export type FillProps = Omit<Base, 'gap'> & { scroll?: boolean }

/**
 * The cell that takes the room left in a stack or a row: a list under a header, an editor beside a
 * toolbar. `scroll` scrolls what does not fit inside it, so the page around it stays still.
 */
export function Fill({ children, scroll = false, as: Tag = 'div', from, fromRoom, room, className, ...props }: FillProps) {
    return (
        <Tag {...props} className={cn('min-h-0 min-w-0 flex-1', scroll && 'overflow-y-auto', shown({ from, fromRoom, room }), className)}>
            {children}
        </Tag>
    )
}
