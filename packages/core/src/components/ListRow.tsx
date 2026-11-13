import { Children, type MouseEvent, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Link } from './Link'

export interface ListRowProps {
    /** The row's first line, in the body ink. */
    title: ReactNode
    /** The second line under the title, in the muted ink: what failed, where, a count. */
    detail?: ReactNode
    /** Drawn before the two lines at the icon size, such as a status icon or a dot. */
    icon?: ReactNode
    /** Drawn at the row's end in the muted ink, such as a time or a chip. Plain content only when the row is pressable. */
    aside?: ReactNode
    /** Makes the whole row a button that opens what it names in place: a detail, a sheet. */
    onPress?: (event: MouseEvent<HTMLButtonElement>) => void
    /** Makes the whole row a link to what it names, drawn through the app's `LinkProvider`. */
    href?: string
    /** Marks the row whose detail is open, on the accent's wash. */
    current?: boolean
    className?: string
}

const ROW = 'flex w-full min-w-0 items-center gap-3 rounded-control px-2.5 py-2 text-start'

const PRESS =
    'cursor-pointer outline-none hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-current:bg-accent aria-current:text-accent-foreground'

/**
 * One row of a list that is not a table: a title over a muted second line, an optional `icon`
 * before them and an `aside` at the end. With `onPress` the whole row is a button, with `href` a
 * link, each the full width of the list, for a list whose rows each open their own detail, such as
 * the failed runs of a job. `current` marks the row whose detail is open. Both lines end in an
 * ellipsis inside the room they are given. Rows go in `ListRows`.
 */
export function ListRow({ title, detail, icon, aside, onPress, href, current = false, className }: ListRowProps) {
    const body = (
        <>
            {icon !== undefined && (
                <span aria-hidden className="flex size-4 shrink-0 items-center text-muted-foreground [&_svg]:size-4">
                    {icon}
                </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
                <span data-slot="list-row-title" className="truncate text-sm">
                    {title}
                </span>
                {detail !== undefined && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
            </span>
            {aside !== undefined && <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{aside}</span>}
        </>
    )
    const mark = current ? 'true' : undefined
    if (onPress !== undefined) {
        return (
            <button type="button" data-slot="list-row" aria-current={mark} onClick={onPress} className={cn(ROW, PRESS, className)}>
                {body}
            </button>
        )
    }
    if (href !== undefined) {
        return (
            <Link href={href} data-slot="list-row" aria-current={mark} className={cn(ROW, PRESS, className)}>
                {body}
            </Link>
        )
    }
    return (
        <div data-slot="list-row" className={cn(ROW, className)}>
            {body}
        </div>
    )
}

export interface ListRowsProps {
    /** The rows, each a `ListRow`. */
    children: ReactNode
    /** The list's name, said by a screen reader where no heading names it. */
    label?: string
    className?: string
}

/** A list of `ListRow`s, one under another, each in its own list item. */
export function ListRows({ children, label, className }: ListRowsProps) {
    return (
        <ul aria-label={label} data-slot="list-rows" className={cn('flex min-w-0 flex-col', className)}>
            {Children.map(children, (child) =>
                child === null || child === undefined || child === false ? null : <li className="min-w-0">{child}</li>,
            )}
        </ul>
    )
}
