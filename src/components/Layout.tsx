import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn'

/**
 * The gaps a layout puts between its cells, smallest to largest. `page` is the density's gap
 * between a page's sections, so it tightens with compact density.
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
} as const

export type Gap = keyof typeof GAP

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
    className?: string
}

/**
 * Cells one under the other. Each cell may shrink below its content's width, so a long line
 * truncates or wraps inside it instead of pushing the stack wider than its container.
 */
export function Stack({
    children,
    gap = 'md',
    align = 'stretch',
    as: Tag = 'div',
    className,
    ...props
}: Base & { align?: keyof typeof ALIGN }) {
    return (
        <Tag {...props} className={cn('flex min-w-0 flex-col [:where(&>*)]:min-w-0', GAP[gap], ALIGN[align], className)}>
            {children}
        </Tag>
    )
}

/**
 * Cells side by side, centered on one line. `wrap` lets them flow onto more lines when the row runs
 * out of room; without it, each cell may shrink so the row never grows wider than its container.
 * `justify="between"` sends the first cell to the start and the last to the end.
 */
export function Row({
    children,
    gap = 'sm',
    align = 'center',
    justify = 'start',
    wrap = false,
    as: Tag = 'div',
    className,
    ...props
}: Base & { align?: keyof typeof ALIGN; justify?: keyof typeof JUSTIFY; wrap?: boolean }) {
    return (
        <Tag
            {...props}
            className={cn('flex min-w-0 [:where(&>*)]:min-w-0', wrap && 'flex-wrap', GAP[gap], ALIGN[align], JUSTIFY[justify], className)}
        >
            {children}
        </Tag>
    )
}

/** How many columns at each width of the container, up to `count`; four short cells already pair up on a phone. */
const COLUMNS = {
    2: '@lg:grid-cols-2',
    3: '@lg:grid-cols-2 @4xl:grid-cols-3',
    4: '@2xs:grid-cols-2 @4xl:grid-cols-4',
} as const

/**
 * Cells in a grid of equal columns that drops to fewer as its container narrows, down to one. The
 * columns follow the container's width, not the window's, so a grid in a side panel stacks while
 * the same grid on a page spreads out.
 */
export function Columns({
    children,
    count = 2,
    gap = 'xl',
    align = 'stretch',
    as: Tag = 'div',
    className,
}: Base & { count?: keyof typeof COLUMNS; align?: 'start' | 'stretch' }) {
    return (
        <div className="@container min-w-0">
            <Tag
                className={cn(
                    'grid grid-cols-1 [:where(&>*)]:min-w-0',
                    COLUMNS[count],
                    GAP[gap],
                    align === 'start' && 'items-start',
                    className,
                )}
            >
                {children}
            </Tag>
        </div>
    )
}

const ASIDE = {
    sm: '@3xl:grid-cols-[minmax(0,1fr)_16rem]',
    md: '@3xl:grid-cols-[minmax(0,1fr)_20rem]',
    lg: '@3xl:grid-cols-[minmax(0,1fr)_24rem]',
} as const

const ASIDE_START = {
    sm: '@3xl:grid-cols-[16rem_minmax(0,1fr)]',
    md: '@3xl:grid-cols-[20rem_minmax(0,1fr)]',
    lg: '@3xl:grid-cols-[24rem_minmax(0,1fr)]',
} as const

/**
 * The main content with an aside beside it: details, help, a summary. When the container is too
 * narrow for both, the aside goes under the main content, or above it when it stands at the start.
 */
export function Split({
    children,
    aside,
    side = 'end',
    width = 'md',
    gap = 'xl',
    className,
}: {
    children: ReactNode
    aside: ReactNode
    side?: 'start' | 'end'
    width?: keyof typeof ASIDE
    gap?: Gap
    className?: string
}) {
    return (
        <div className="@container min-w-0">
            <div
                className={cn(
                    'grid grid-cols-1 items-start [:where(&>*)]:min-w-0',
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

/**
 * The cell that takes the room left in a stack or a row: a list under a header, an editor beside a
 * toolbar. `scroll` scrolls what does not fit inside it, so the page around it stays still.
 */
export function Fill({ children, scroll = false, as: Tag = 'div', className }: Omit<Base, 'gap'> & { scroll?: boolean }) {
    return <Tag className={cn('min-h-0 min-w-0 flex-1', scroll && 'overflow-y-auto', className)}>{children}</Tag>
}
