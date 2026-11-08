/** A table's head text, from the table-head tokens, so every table, list and section head reads alike. */
export const TABLE_HEAD_TEXT =
    'text-[length:var(--table-head-size)] font-[number:var(--table-head-weight)] tracking-[var(--table-head-tracking)] text-table-head-ink [text-transform:var(--table-head-transform)]'

/** A table's head row: its ground and the rule under it, from the table-head tokens. */
export const TABLE_HEAD_ROW = 'border-b border-table-head-line bg-table-head-ground'
