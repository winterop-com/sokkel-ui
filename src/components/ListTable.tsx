import type { KeyboardEvent, ReactNode } from 'react'

import { cn } from '../lib/cn'

/** One column: its header, how wide it is, and how a row draws its cell. */
export interface Column<T> {
    id: string
    header: ReactNode
    /** A CSS grid track: `8rem`, `minmax(0,1fr)`, `auto`. */
    width: string
    cell: (row: T) => ReactNode
    align?: 'start' | 'end'
}

/**
 * A listing in its box, its column headers as the box's head bar.
 *
 * The head bar stays put while the rows scroll under it. A row is selectable with a click, Enter
 * or Space, and the selected one is marked for assistive technology as well as drawn. A row the
 * pointer is over is tinted, more strongly when it can be selected; `hover={false}` turns that off. With no
 * rows it says so in one line; the foot counts the rows loaded, never a total it does not know.
 *
 * When the listing's own box is narrower than its columns need, it becomes cards: the first
 * column is each card's title and every other column a labeled line under it. The box decides,
 * not the window, so a listing beside an open panel turns into cards as soon as it is squeezed.
 */
export function ListTable<T>({
    columns,
    rows,
    rowKey,
    selected,
    onSelect,
    empty = 'Nothing here.',
    foot,
    maxHeight,
    headerCase = 'theme',
    hover = true,
    className,
}: {
    columns: Column<T>[]
    rows: T[]
    rowKey: (row: T) => string
    selected?: (row: T) => boolean
    onSelect?: (row: T) => void
    /** What an empty listing says. */
    empty?: ReactNode
    /** The foot line, such as how many rows are loaded; nothing when absent. */
    foot?: ReactNode
    /** Caps the listing's height, after which its rows scroll inside it. */
    maxHeight?: string
    /** How the column names are written: as the theme says (uppercase by default), or set here. */
    headerCase?: 'theme' | 'upper' | 'sentence'
    /** Tints the row under the pointer. */
    hover?: boolean
    className?: string
}) {
    const template = columns.map((column) => column.width).join(' ')
    const [first, ...rest] = columns
    const press = (row: T) =>
        onSelect === undefined
            ? {}
            : {
                  tabIndex: 0,
                  'aria-selected': selected?.(row) === true,
                  onClick: () => onSelect(row),
                  onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelect(row)
                      }
                  },
              }
    return (
        <div
            className={cn(
                '@container flex min-h-0 flex-col overflow-hidden rounded-surface border border-border-strong bg-card',
                className,
            )}
        >
            {rows.length > 0 && (
                <ul className="divide-y divide-border @xl:hidden">
                    {rows.map((row) => (
                        <li
                            key={rowKey(row)}
                            {...press(row)}
                            className={cn(
                                'flex flex-col gap-1 px-(--density-panel-pad) py-2.5 text-sm',
                                onSelect !== undefined && 'cursor-pointer outline-none focus-visible:bg-secondary',
                                hover && (onSelect !== undefined ? 'hover:bg-secondary/60' : 'hover:bg-muted/50'),
                                selected?.(row) === true && 'bg-secondary',
                            )}
                        >
                            {first !== undefined && <div className="min-w-0 truncate font-medium">{first.cell(row)}</div>}
                            {rest.map((column) => (
                                <div key={column.id} className="flex min-w-0 items-baseline gap-2 text-xs">
                                    <span className="w-20 shrink-0 text-muted-foreground">{column.header}</span>
                                    <span className="min-w-0 truncate">{column.cell(row)}</span>
                                </div>
                            ))}
                        </li>
                    ))}
                </ul>
            )}
            <div
                className={cn('min-h-0 overflow-y-auto', rows.length > 0 && 'hidden @xl:block')}
                style={maxHeight === undefined ? undefined : { maxHeight }}
            >
                <div
                    role="row"
                    className={cn(
                        'sticky top-0 z-10 grid h-(--density-panel-head) items-center gap-3 border-b border-border-strong bg-panel-ground px-(--density-panel-pad) font-[number:var(--table-head-weight)] text-muted-foreground',
                        headerCase === 'upper'
                            ? 'text-[length:var(--table-head-size)] tracking-[var(--table-head-tracking)] uppercase'
                            : headerCase === 'sentence'
                              ? 'text-xs normal-case'
                              : 'text-[length:var(--table-head-size)] tracking-[var(--table-head-tracking)] [text-transform:var(--table-head-transform)]',
                    )}
                    style={{ gridTemplateColumns: template }}
                >
                    {columns.map((column) => (
                        <span key={column.id} role="columnheader" className={cn('truncate', column.align === 'end' && 'text-right')}>
                            {column.header}
                        </span>
                    ))}
                </div>
                {rows.length === 0 ? (
                    <p className="px-(--density-panel-pad) py-3 text-sm text-muted-foreground">{empty}</p>
                ) : (
                    rows.map((row) => {
                        const chosen = selected?.(row) === true
                        return (
                            <div
                                key={rowKey(row)}
                                role="row"
                                tabIndex={onSelect === undefined ? undefined : 0}
                                aria-selected={onSelect === undefined ? undefined : chosen}
                                className={cn(
                                    'grid h-(--density-row) items-center gap-3 border-b border-border px-(--density-panel-pad) text-sm last:border-b-0',
                                    onSelect !== undefined && 'cursor-pointer outline-none focus-visible:bg-secondary',
                                    hover && (onSelect !== undefined ? 'hover:bg-secondary/60' : 'hover:bg-muted/50'),
                                    chosen && 'bg-secondary',
                                )}
                                style={{ gridTemplateColumns: template }}
                                onClick={onSelect === undefined ? undefined : () => onSelect(row)}
                                onKeyDown={
                                    onSelect === undefined
                                        ? undefined
                                        : (event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                  event.preventDefault()
                                                  onSelect(row)
                                              }
                                          }
                                }
                            >
                                {columns.map((column) => (
                                    <span
                                        key={column.id}
                                        role="cell"
                                        className={cn('min-w-0 truncate', column.align === 'end' && 'text-right')}
                                    >
                                        {column.cell(row)}
                                    </span>
                                ))}
                            </div>
                        )
                    })
                )}
            </div>
            {foot !== undefined && (
                <div className="border-t border-border-strong px-(--density-panel-pad) py-1.5 font-mono text-xs text-muted-foreground">
                    {foot}
                </div>
            )}
        </div>
    )
}
