import { cn } from '../lib/cn'
import { formatPercent } from '../lib/percent'

/** One bar of a bar list: what it is called and its share, from 0 to 1. */
export interface BarListItem {
    /** What names the bar to `active`; the label when left out. */
    id?: string
    label: string
    /** The share, from 0 to 1. */
    value: number
    /** The bar the answer is: drawn in the accent, the others quiet. */
    chosen?: boolean
}

/**
 * Labeled bars, each a share from 0 to 1, such as how likely each class is, with the chosen one in
 * the accent and the rest quiet. Each value is written beside its bar, as a percent unless `format`
 * says otherwise. The labels, bars and values line up in three columns; a label too long for its
 * room is cut short, as the bars keep at least two fifths of the width.
 *
 * `active` and `onActiveChange` tie the list to something beside it, such as the boxes over an
 * image: the bar under the pointer is reported, and the active one is drawn on a wash.
 */
export function BarList({
    items,
    format = formatPercent,
    label,
    active,
    onActiveChange,
    className,
}: {
    items: readonly BarListItem[]
    /** How a value is written; a whole percent by default. */
    format?: (value: number) => string
    /** What the list is called, for a screen reader. */
    label?: string
    /** The id of the bar to draw as active. */
    active?: string
    /** The bar under the pointer, or `undefined` when the pointer leaves it. */
    onActiveChange?: (id: string | undefined) => void
    className?: string
}) {
    return (
        <ul aria-label={label} className={cn('grid grid-cols-[minmax(0,max-content)_minmax(40%,1fr)_auto] gap-x-3 text-sm', className)}>
            {items.map((item) => {
                const id = item.id ?? item.label
                const chosen = item.chosen === true
                const share = Number.isFinite(item.value) ? Math.min(1, Math.max(0, item.value)) : 0
                return (
                    <li
                        key={id}
                        aria-current={chosen || undefined}
                        data-active={active === id || undefined}
                        onPointerEnter={onActiveChange === undefined ? undefined : () => onActiveChange(id)}
                        onPointerLeave={onActiveChange === undefined ? undefined : () => onActiveChange(undefined)}
                        className="col-span-3 grid grid-cols-subgrid items-center rounded-mini px-1.5 py-1 data-active:bg-hover"
                    >
                        <span
                            title={item.label}
                            className={cn('truncate', chosen ? 'font-medium text-foreground' : 'text-muted-foreground')}
                        >
                            {item.label}
                        </span>
                        <span className="h-1.5 overflow-hidden rounded-mini bg-muted">
                            <span
                                className={cn('block h-full rounded-mini', chosen ? 'bg-primary' : 'bg-muted-foreground/40')}
                                style={{ width: `${String(share * 100)}%` }}
                            />
                        </span>
                        <span
                            className={cn(
                                'text-right text-xs tabular-nums',
                                chosen ? 'font-medium text-foreground' : 'text-muted-foreground',
                            )}
                        >
                            {format(item.value)}
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}
