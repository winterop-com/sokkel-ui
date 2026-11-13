/**
 * A table's head text: the head role (`text-head`, the table-head tokens' size, weight and tracking
 * at the small line height), its ink and its case, so every table, list and section head reads alike.
 */
export const TABLE_HEAD_TEXT = 'text-head text-table-head-ink [text-transform:var(--table-head-transform)]'

/** A table's head row: its ground and the rule under it, from the table-head tokens. */
export const TABLE_HEAD_ROW = 'border-b border-table-head-line bg-table-head-ground'

/** A column's name where it stands alone, as in a stacked card's line: its band before its header. */
export function columnName(column: { header: string; band?: string }): string {
    return column.band === undefined ? column.header : `${column.band} · ${column.header}`
}

/** A run of side-by-side columns under one band head, or under none: the band, where the run starts, and how many columns it spans. */
export interface ColumnBand {
    band: string | undefined
    start: number
    span: number
}

/** The columns as runs under their band heads: neighbors with the same band share one run. */
export function columnBands(columns: readonly { band?: string }[]): ColumnBand[] {
    const runs: ColumnBand[] = []
    columns.forEach((column, index) => {
        const last = runs.at(-1)
        if (last !== undefined && last.band !== undefined && last.band === column.band) last.span += 1
        else runs.push({ band: column.band, start: index, span: 1 })
    })
    return runs
}

/**
 * Column ids in the order a table draws them: those `order` names first, once each, then the rest
 * in their given order, the first column staying first whatever the order says, as each row's title.
 */
export function columnOrder(order: readonly string[], columns: readonly string[]): string[] {
    if (columns.length < 2) return [...columns]
    const [first, ...rest] = columns
    const named = order.filter((id, index) => id !== first && rest.includes(id) && order.indexOf(id) === index)
    return [first, ...named, ...rest.filter((id) => !named.includes(id))]
}
