/**
 * The parts `DataTable` draws only for some tables: the pager's page size select, the rows'
 * right-click menus, and the own search's field and finding. A table fetches them once it pages, has
 * row actions or a `searchBy`, so a plain table never does.
 */
export { NativeSelect, NativeSelectOption } from './ui/native-select'
export { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu'
export { SearchField } from './SearchField'

import { queryWords } from '../lib/search'

/** The rows whose text (`text`) holds every word of `query`, in any case; all of them for a blank query. */
export function searchRows<T>(rows: readonly T[], text: (row: T) => string, query: string): readonly T[] {
    const words = queryWords(query.trim())
    if (words.length === 0) return rows
    return rows.filter((row) => {
        const said = text(row).toLowerCase()
        return words.every((word) => said.includes(word))
    })
}
