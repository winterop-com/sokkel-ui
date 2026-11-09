import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { DataTable, type DataColumn } from '../DataTable'
import { formatValue, thresholdColor, tokenVar, type Threshold } from './thresholds'

/** One column of a scorecard: a period or a measure, with its own scale and writing when it differs from the table's. */
export interface ScoreColumn {
    key: string
    label: ReactNode
    thresholds?: readonly Threshold[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    /** Whether a rise is an improvement in this column, for its trend mark. */
    higherIsBetter?: boolean
}

/** One row of a scorecard: what it scores and its value in each column, by column key. */
export interface ScoreRow {
    key: string
    label: ReactNode
    values: Readonly<Record<string, number | null | undefined>>
    /** Rows with the same group are listed under one heading, in the order they come. */
    group?: string
}

export interface ScoreWords {
    name: string
    noData: string
    up: string
    down: string
    same: string
}

const WORDS: ScoreWords = { name: 'Name', noData: 'No data', up: 'Up', down: 'Down', same: 'No change' }

export interface ScoreTableProps {
    columns: readonly ScoreColumn[]
    rows: readonly ScoreRow[]
    thresholds?: readonly Threshold[]
    unit?: string
    decimals?: number
    format?: (value: number) => string
    fill?: 'tint' | 'solid' | 'dot'
    trend?: boolean
    higherIsBetter?: boolean
    /** The first column's header; the `name` word when omitted. */
    nameHeader?: ReactNode
    /** Draws the table in its own bordered, rounded box. */
    framed?: boolean
    words?: Partial<ScoreWords>
    className?: string
}

const known = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value)

/**
 * A scorecard: rows of places, teams or jobs against columns of periods or measures, each value
 * colored by the band it falls in on a threshold scale, drawn by `DataTable`. The scale is the
 * table's, or a column's own when its measure reads differently. `fill` tints the cell, fills it
 * solid, or puts a dot beside the value. `trend` marks each value up or down against the column
 * before it, inked by whether that is an improvement. Rows with a `group` gather under its head.
 * The first column stays put while a narrow box scrolls the rest. `framed={false}` drops the
 * table's own border, for a table filling a panel that frames it.
 */
export function ScoreTable({
    columns,
    rows,
    thresholds,
    unit = '',
    decimals,
    format,
    fill = 'tint',
    trend = false,
    higherIsBetter = true,
    nameHeader,
    framed = true,
    words: given,
    className,
}: ScoreTableProps) {
    const words = { ...WORDS, ...given }
    const grouped = rows.some((row) => row.group !== undefined)
    const table = ((): DataColumn<ScoreRow>[] => {
        const name = nameHeader ?? words.name
        const first: DataColumn<ScoreRow> = {
            id: 'name',
            header: typeof name === 'string' ? name : words.name,
            head: typeof name === 'string' ? undefined : name,
            width: 'minmax(9rem,1.5fr)',
            cell: (row) => <span className="font-medium">{row.label}</span>,
        }
        return [
            first,
            ...columns.map((column, at): DataColumn<ScoreRow> => {
                const scale = column.thresholds ?? thresholds
                const write =
                    column.format ??
                    format ??
                    ((value: number) => `${formatValue(value, column.decimals ?? decimals)}${column.unit ?? unit}`)
                const toneOf = (row: ScoreRow) => {
                    const value = row.values[column.key]
                    return known(value) ? thresholdColor(value, scale) : undefined
                }
                return {
                    id: `score:${column.key}`,
                    header: typeof column.label === 'string' ? column.label : column.key,
                    head: typeof column.label === 'string' ? undefined : column.label,
                    width: 'minmax(5.5rem,1fr)',
                    align: 'end',
                    fill:
                        fill === 'dot'
                            ? undefined
                            : (row) => {
                                  const tone = toneOf(row)
                                  return tone === undefined ? undefined : { color: tokenVar(tone), solid: fill === 'solid' }
                              },
                    cell: (row) => (
                        <ScoreValue
                            value={row.values[column.key]}
                            previous={at === 0 ? undefined : row.values[columns[at - 1].key]}
                            tone={toneOf(row)}
                            write={write}
                            fill={fill}
                            trend={trend}
                            first={at === 0}
                            higherIsBetter={column.higherIsBetter ?? higherIsBetter}
                            words={words}
                        />
                    ),
                }
            }),
        ]
    })()
    return (
        <DataTable
            columns={table}
            rows={rows}
            rowKey={(row) => row.key}
            groupBy={grouped ? (row) => row.group ?? '' : undefined}
            bar={false}
            hover={false}
            stackBelow={false}
            minWidth="auto"
            framed={framed}
            className={className}
        />
    )
}

function ScoreValue({
    value,
    previous,
    tone,
    write,
    fill,
    trend,
    first,
    higherIsBetter,
    words,
}: {
    value: number | null | undefined
    previous: number | null | undefined
    tone: string | undefined
    write: (value: number) => string
    fill: 'tint' | 'solid' | 'dot'
    trend: boolean
    /** The first column, which has nothing before it to compare with. */
    first: boolean
    higherIsBetter: boolean
    words: ScoreWords
}) {
    if (!known(value)) {
        return (
            <span className="text-muted-foreground" title={words.noData}>
                -
            </span>
        )
    }
    const compared = trend && !first && known(previous)
    const change = compared ? Math.sign(value - previous) : 0
    const improved = change === 0 ? undefined : change > 0 === higherIsBetter
    const Arrow = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus
    const solid = fill === 'solid' && tone !== undefined
    return (
        <span className="inline-flex items-center justify-end gap-1 font-mono text-xs">
            {fill === 'dot' && tone !== undefined && (
                <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-mini bg-(--tone)"
                    style={{ '--tone': tokenVar(tone) } as CSSProperties}
                />
            )}
            {write(value)}
            {trend && !compared && <span aria-hidden className="size-3 shrink-0" />}
            {compared && (
                <Arrow
                    role="img"
                    aria-label={change > 0 ? words.up : change < 0 ? words.down : words.same}
                    className={cn(
                        'size-3 shrink-0',
                        solid
                            ? 'text-on-fill/85'
                            : improved === undefined
                              ? 'text-muted-foreground'
                              : improved
                                ? 'text-good-ink'
                                : 'text-critical-ink',
                    )}
                />
            )}
        </span>
    )
}
