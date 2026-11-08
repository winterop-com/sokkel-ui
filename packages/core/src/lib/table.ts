/** A table's head text, from the table-head tokens, so every table, list and section head reads alike. */
export const TABLE_HEAD_TEXT =
    'text-[length:var(--table-head-size)] font-[number:var(--table-head-weight)] tracking-[var(--table-head-tracking)] text-table-head-ink [text-transform:var(--table-head-transform)]'

/** A table's head row: its ground and the rule under it, from the table-head tokens. */
export const TABLE_HEAD_ROW = 'border-b border-table-head-line bg-table-head-ground'

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
