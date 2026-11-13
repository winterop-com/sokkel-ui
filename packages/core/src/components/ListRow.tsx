import { Children, createContext, useContext, type MouseEvent, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Link } from './Link'

export interface ListRowProps {
    /** The row's first line, in the body ink. */
    title: ReactNode
    /** The second line under the title, in the muted ink: what failed, where, a count. */
    detail?: ReactNode
    /** Drawn before the two lines at the icon size, such as a status icon, a dot, or a dot and a mark side by side. */
    icon?: ReactNode
    /** Drawn at the row's end in the muted ink, such as a time or a chip. Plain content only when the row is pressable. */
    aside?: ReactNode
    /** Makes the whole row a button that opens what it names in place: a detail, a sheet. */
    onPress?: (event: MouseEvent<HTMLButtonElement>) => void
    /** Makes the whole row a link to what it names, drawn through the app's `LinkProvider`. */
    href?: string
    /** Marks the row whose detail is open, on the accent's wash. */
    current?: boolean
    /** Said on hover over the whole row: the whole of a title or detail cut short, or what a press opens. */
    tooltip?: string
    /** Lets the title and the detail wrap onto more lines rather than end in an ellipsis. */
    wrap?: boolean
    /**
     * One line and shorter: the detail beside the title rather than under it, for a dense list such as a
     * health panel's. A dense row that presses still stands a finger tall on a phone.
     */
    dense?: boolean
    /** Sets the title in the code face, for a code value: a job, a host, a key. */
    mono?: boolean
    className?: string
}

/** How the rows sit, from their `ListRows`: boxed, or flush at a panel's inset or at a card's. */
const FlushContext = createContext<false | ListRowsInset>(false)

const ROW = 'flex w-full min-w-0 items-center gap-3 text-start'
const BOXED = 'rounded-control px-2.5'
const FLUSH: Record<ListRowsInset, string> = {
    panel: 'px-(--density-panel-pad)',
    card: 'px-[var(--card-spacing,--spacing(4))]',
}

const PRESS =
    'cursor-pointer outline-none hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-current:bg-accent aria-current:text-accent-foreground'

/**
 * One row of a list that is not a table: a title over a muted second line, an optional `icon`
 * before them and an `aside` at the end. With `onPress` the whole row is a button, with `href` a
 * link, each the full width of the list, for a list whose rows each open their own detail, such as
 * the failed runs of a job. `current` marks the row whose detail is open. Both lines end in an
 * ellipsis inside the room they are given, or wrap with `wrap`; `tooltip` says something on hover
 * over the row. `dense` makes it one shorter line, the detail beside the title, a finger tall below
 * `md` when it presses, and `mono` sets a title that is a code in the code face; `icon` may hold a
 * dot and a mark side by side. Rows go in `ListRows`, which sets them flush in a panel with `flush`.
 */
export function ListRow({
    title,
    detail,
    icon,
    aside,
    onPress,
    href,
    current = false,
    tooltip,
    wrap = false,
    dense = false,
    mono = false,
    className,
}: ListRowProps) {
    const flush = useContext(FlushContext)
    const pressable = onPress !== undefined || href !== undefined
    const row = cn(ROW, dense ? ['min-h-8 py-1', pressable && 'max-md:min-h-finger'] : 'py-2', flush === false ? BOXED : FLUSH[flush])
    const line = wrap ? 'break-words' : 'truncate'
    const body = (
        <>
            {icon !== undefined && (
                <span aria-hidden className="flex h-4 min-w-4 shrink-0 items-center gap-1.5 text-muted-foreground [&_svg]:size-4">
                    {icon}
                </span>
            )}
            <span className={cn('flex min-w-0 flex-1', dense ? 'items-baseline gap-2' : 'flex-col')}>
                <span
                    data-slot="list-row-title"
                    className={cn(line, mono ? 'font-mono text-xs' : 'text-sm', dense && 'max-w-full shrink-0')}
                >
                    {title}
                </span>
                {detail !== undefined && <span className={cn(line, 'min-w-0 text-xs text-muted-foreground')}>{detail}</span>}
            </span>
            {aside !== undefined && <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{aside}</span>}
        </>
    )
    const mark = current ? 'true' : undefined
    if (onPress !== undefined) {
        return (
            <button
                type="button"
                data-slot="list-row"
                aria-current={mark}
                title={tooltip}
                onClick={onPress}
                className={cn(row, PRESS, className)}
            >
                {body}
            </button>
        )
    }
    if (href !== undefined) {
        return (
            <Link href={href} data-slot="list-row" aria-current={mark} title={tooltip} className={cn(row, PRESS, className)}>
                {body}
            </Link>
        )
    }
    return (
        <div data-slot="list-row" title={tooltip} className={cn(row, className)}>
            {body}
        </div>
    )
}

/** The inset flush rows line up with: a panel's (`--density-panel-pad`), or a card's, as wide as a `Card`'s or a dashboard panel's padding. */
export type ListRowsInset = 'panel' | 'card'

export interface ListRowsProps {
    /** The rows, each a `ListRow`. */
    children: ReactNode
    /** The list's name, said by a screen reader where no heading names it. */
    label?: string
    /**
     * Sets the rows flush in the panel or section that holds the list: square, padded to the
     * panel's own inset, with a hairline between each two.
     */
    flush?: boolean
    /** Which padding flush rows line up with: the panel's by default, or a card's wider one. */
    inset?: ListRowsInset
    className?: string
}

/**
 * A list of `ListRow`s, one under another, each in its own list item. `flush` sets them edge to
 * edge in a panel, lined up with its padding and parted by hairlines.
 */
export function ListRows({ children, label, flush = false, inset = 'panel', className }: ListRowsProps) {
    return (
        <FlushContext value={flush && inset}>
            <ul
                aria-label={label}
                data-slot="list-rows"
                data-flush={flush ? '' : undefined}
                className={cn('flex min-w-0 flex-col', flush && 'divide-y divide-border', className)}
            >
                {Children.map(children, (child) =>
                    child === null || child === undefined || child === false ? null : <li className="min-w-0">{child}</li>,
                )}
            </ul>
        </FlushContext>
    )
}
