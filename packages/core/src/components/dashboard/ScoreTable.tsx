import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { Fragment, type CSSProperties, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
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

const FILL = {
    tint: 'bg-[color-mix(in_oklab,var(--tone)_24%,var(--card))]',
    solid: 'bg-(--tone) text-on-fill',
    dot: '',
}

/**
 * A scorecard: rows of places, teams or jobs against columns of periods or measures, each value
 * colored by the band it falls in on a threshold scale. The scale is the table's, or a column's
 * own when its measure reads differently. `fill` tints the cell, fills it solid, or puts a dot
 * beside the value. `trend` marks each value up or down against the column before it, inked by
 * whether that is an improvement. The first column stays put while a narrow box scrolls the rest.
 * `framed={false}` drops the table's own border, for a table filling a panel that frames it.
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
    words = WORDS,
    className,
}: {
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
    words?: ScoreWords
    className?: string
}) {
    const width = columns.length + 1
    return (
        <div
            className={cn(
                'min-w-0 overflow-hidden bg-card text-card-foreground',
                framed && 'rounded-surface border border-border',
                className,
            )}
        >
            <Table className="border-separate border-spacing-0 text-xs tabular-nums">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="sticky left-0 z-10 h-8 border-b border-border bg-card pl-3">
                            {nameHeader ?? words.name}
                        </TableHead>
                        {columns.map((column) => (
                            <TableHead key={column.key} className="h-8 border-b border-border text-right">
                                {column.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, index) => {
                        const heading = row.group !== undefined && row.group !== rows[index - 1]?.group
                        return (
                            <Fragment key={row.key}>
                                {heading && (
                                    <TableRow className="border-0 hover:bg-transparent">
                                        <TableCell
                                            colSpan={width}
                                            className="h-7 border-b border-border bg-muted/50 py-0 pl-3 font-medium text-muted-foreground"
                                        >
                                            {row.group}
                                        </TableCell>
                                    </TableRow>
                                )}
                                <TableRow className="border-0">
                                    <TableCell className="sticky left-0 z-10 border-b border-border bg-card py-1.5 pl-3 font-medium [tr:last-child>&]:border-b-0">
                                        {row.label}
                                    </TableCell>
                                    {columns.map((column, at) => (
                                        <ScoreCell
                                            key={column.key}
                                            value={row.values[column.key]}
                                            previous={at === 0 ? undefined : row.values[columns[at - 1].key]}
                                            thresholds={column.thresholds ?? thresholds}
                                            write={
                                                column.format ??
                                                format ??
                                                ((value) => `${formatValue(value, column.decimals ?? decimals)}${column.unit ?? unit}`)
                                            }
                                            fill={fill}
                                            trend={trend}
                                            first={at === 0}
                                            higherIsBetter={column.higherIsBetter ?? higherIsBetter}
                                            words={words}
                                        />
                                    ))}
                                </TableRow>
                            </Fragment>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

function ScoreCell({
    value,
    previous,
    thresholds,
    write,
    fill,
    trend,
    first,
    higherIsBetter,
    words,
}: {
    value: number | null | undefined
    previous: number | null | undefined
    thresholds: readonly Threshold[] | undefined
    write: (value: number) => string
    fill: 'tint' | 'solid' | 'dot'
    trend: boolean
    /** The first column, which has nothing before it to compare with. */
    first: boolean
    higherIsBetter: boolean
    words: ScoreWords
}) {
    const known = typeof value === 'number' && Number.isFinite(value)
    const tone = known ? thresholdColor(value, thresholds) : undefined
    const style = tone === undefined ? undefined : ({ '--tone': tokenVar(tone) } as CSSProperties)
    const compared = trend && !first && known && typeof previous === 'number' && Number.isFinite(previous)
    const change = compared ? Math.sign(value - previous) : 0
    const improved = change === 0 ? undefined : change > 0 === higherIsBetter
    const Arrow = change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus
    const solid = fill === 'solid' && tone !== undefined
    return (
        <TableCell
            style={style}
            className={cn(
                'border-b border-l border-border py-1.5 text-right font-mono [tr:last-child>&]:border-b-0',
                tone !== undefined && FILL[fill],
                tone !== undefined && fill !== 'dot' && 'border-card',
            )}
        >
            {known ? (
                <span className="inline-flex items-center justify-end gap-1">
                    {fill === 'dot' && tone !== undefined && <span aria-hidden className="size-2 shrink-0 rounded-mini bg-(--tone)" />}
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
            ) : (
                <span className="text-muted-foreground" title={words.noData}>
                    -
                </span>
            )}
        </TableCell>
    )
}
