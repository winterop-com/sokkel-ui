/** A list a person puts in order, as a funnel's steps or a report's panels: each row dragged by its grip to its place, or taken out. */

import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { XIcon } from 'lucide-react'
import type { ReactNode } from 'react'

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
    /** Why an order cannot stand, when it cannot; the move is put back and the reason said. */
    refuse?: (items: readonly T[]) => string | undefined
    /** What the list is called, in its buttons' names: a step, a panel. */
    noun: string
    empty: ReactNode
}

/** The items in order, numbered, each dragged by its grip (or moved with Alt and the arrows) and taken out with its button. */
export function OrderList<T extends string>({ items, onChange, name, figure, refuse, noun, empty }: OrderListProps<T>) {
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
            id: 'remove',
            header: '',
            width: '2.5rem',
            align: 'end',
            resizable: false,
            cell: (row) => (
                <IconButton
                    label={`Take ${name(row.item)} out`}
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => onChange(items.filter((_, index) => index !== row.index))}
                >
                    <XIcon aria-hidden />
                </IconButton>
            ),
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
            rowLabel={(row) => name(row.item)}
            onReorder={(from, to) => {
                const next = moveItem(items, from, to)
                const why = refuse?.(next)
                if (why === undefined) onChange(next)
                else toast.add({ type: 'warning', title: `${name(items[from] as T)} stays where it was`, description: why })
            }}
            empty={empty}
        />
    )
}
