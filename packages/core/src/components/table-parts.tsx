/**
 * The parts `DataTable` draws only for some tables: the pager's page size select and the rows'
 * right-click menus. A table fetches them once it pages or has row actions, so a plain table never
 * does.
 */
export { NativeSelect, NativeSelectOption } from './ui/native-select'
export { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from './ui/context-menu'
