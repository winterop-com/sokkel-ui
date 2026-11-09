/**
 * The app's server, faked in the page: every collection the Models app keeps, through the shared
 * backend, so each change is kept and answered after a short delay as a server would.
 */

import type { SavedView } from '@winterop-com/sokkel-ui/SavedViews'
import { EMPTY_VIEW } from '@winterop-com/sokkel-ui/lib/list-views'
import { collection } from 'tidevann-shared/backend'

import type { Comparison, Conversation, Download, Loaded, LogEvent, Model, Prefs, Runner } from './model'
import { DEFAULT_PREFS } from './model'
import { seedComparisons, seedConversations, seedEvents, seedLoaded, seedModels, seedRunner } from './seed'

export const models = collection<Model>('library', () => seedModels())
export const conversations = collection<Conversation>('conversations', () => seedConversations(seedModels()))
export const downloads = collection<Download>('downloads', () => [])
export const runner = collection<Runner>('runner', () => seedRunner())
export const loaded = collection<Loaded>('loaded', () => seedLoaded(seedModels()))
export const events = collection<LogEvent>('events', () => seedEvents())
export const comparisons = collection<Comparison>('comparisons', () => seedComparisons(seedModels()))
export const prefs = collection<Prefs>('prefs', () => [{ ...DEFAULT_PREFS }])

/** A view of the library: its filters, sort and columns under a name. */
export type LibraryView = SavedView

export const views = collection<LibraryView>('views', () => [
    { id: 'all', name: 'All models', state: EMPTY_VIEW, locked: true },
    {
        id: 'small',
        name: 'Fits a laptop',
        state: {
            ...EMPTY_VIEW,
            filters: [{ field: 'size', operator: 'atMost', values: ['6'] }],
            sort: { column: 'size', direction: 'asc' },
        },
    },
    {
        id: 'code',
        name: 'For code',
        state: { ...EMPTY_VIEW, filters: [{ field: 'capabilities', operator: 'oneOf', values: ['code'] }], hidden: ['context'] },
    },
])

let made = 0

/** Writes a line to the runner's log. */
export function log(level: LogEvent['level'], source: LogEvent['source'], text: string): void {
    made += 1
    void events.create({ time: Date.now(), level, source, text }, `e-${Date.now().toString(36)}-${String(made)}`)
}
