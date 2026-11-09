/** A list a person puts in order, as a funnel's steps or a report's panels: each row moved up or down, or taken out. */

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { ArrowDown, ArrowUp, XIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Moves the item at `from` one place up or down. */
export function moved<T>(items: readonly T[], from: number, by: -1 | 1): T[] {
    const to = from + by
    if (to < 0 || to >= items.length) return [...items]
    const next = [...items]
    const [item] = next.splice(from, 1)
    if (item !== undefined) next.splice(to, 0, item)
    return next
}

interface Ordered<T> {
    item: T
    index: number
}

export interface OrderListProps<T extends string> {
    items: readonly T[]
    onChange: (items: T[]) => void
    /** What an item is called. */
    name: (item: T) => string
    /** A column of figures after the name, such as how many reached a step. */
    figure?: { header: string; cell: (item: T, index: number) => ReactNode }
    /** Why an item cannot move up now, when it cannot. */
    stuck?: (item: T, index: number, by: -1 | 1) => string | undefined
    /** What the list is called, in its buttons' names: a step, a panel. */
    noun: string
    empty: ReactNode
}

/** The items in order, numbered, each with buttons that move it up and down and take it out. */
export function OrderList<T extends string>({ items, onChange, name, figure, stuck, noun, empty }: OrderListProps<T>) {
    const rows: Ordered<T>[] = items.map((item, index) => ({ item, index }))
    const columns: DataColumn<Ordered<T>>[] = [
        {
            id: 'index',
            header: '#',
            width: '2.5rem',
            // Stacked on a phone, the number leads each row's name.
            stack: 'lead',
            cell: (row) => <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>,
        },
        { id: 'name', header: noun, width: 'minmax(9rem,1fr)', cell: (row) => name(row.item) },
        ...(figure === undefined
            ? []
            : [
                  {
                      id: 'figure',
                      header: figure.header,
                      width: '7rem',
                      align: 'end' as const,
                      cell: (row: Ordered<T>) => figure.cell(row.item, row.index),
                  },
              ]),
        {
            id: 'move',
            header: 'Order',
            width: '6.5rem',
            align: 'end',
            resizable: false,
            cell: (row) => {
                const up = row.index === 0 ? 'It is first.' : stuck?.(row.item, row.index, -1)
                const down = row.index === items.length - 1 ? 'It is last.' : stuck?.(row.item, row.index, 1)
                return (
                    <Row gap="none" inline>
                        <IconButton
                            label={`Move ${name(row.item)} up`}
                            size="icon-xs"
                            variant="ghost"
                            reason={up}
                            onClick={() => onChange(moved(items, row.index, -1))}
                        >
                            <ArrowUp aria-hidden />
                        </IconButton>
                        <IconButton
                            label={`Move ${name(row.item)} down`}
                            size="icon-xs"
                            variant="ghost"
                            reason={down}
                            onClick={() => onChange(moved(items, row.index, 1))}
                        >
                            <ArrowDown aria-hidden />
                        </IconButton>
                        <IconButton
                            label={`Take ${name(row.item)} out`}
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => onChange(items.filter((_, index) => index !== row.index))}
                        >
                            <XIcon aria-hidden />
                        </IconButton>
                    </Row>
                )
            },
        },
    ]
    return (
        <DataTable
            variant="list"
            minWidth="auto"
            stackLayout="compact"
            stackBelow={360}
            columns={columns}
            rows={rows}
            rowKey={(row) => row.item}
            empty={empty}
        />
    )
}
