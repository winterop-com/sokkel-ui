import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { comparisons, conversations, downloads, events, loaded, models, prefs, runner, views, type LibraryView } from './data/backend'
import {
    DEFAULT_PREFS,
    type Comparison,
    type Conversation,
    type Download,
    type Loaded,
    type LogEvent,
    type Model,
    type Prefs,
    type Runner,
} from './data/model'

/** Everything the pages read, kept current as the backend changes. */
export interface AppData {
    models: Model[]
    conversations: Conversation[]
    downloads: Download[]
    runner: Runner | undefined
    loaded: Loaded[]
    events: LogEvent[]
    comparisons: Comparison[]
    views: LibraryView[]
    prefs: Prefs
    setPrefs: (patch: Partial<Omit<Prefs, 'id'>>) => Promise<unknown>
    /** The library has not answered yet. */
    loading: boolean
    modelOf: (id: string) => Model | undefined
}

const Context = createContext<AppData | undefined>(undefined)

export function AppDataProvider({ children }: { children: ReactNode }) {
    const library = useCollection(models)
    const talks = useCollection(conversations)
    const pulls = useCollection(downloads)
    const runners = useCollection(runner)
    const memory = useCollection(loaded)
    const log = useCollection(events)
    const compared = useCollection(comparisons)
    const saved = useCollection(views)
    const kept = useCollection(prefs)
    const value = useMemo((): AppData => {
        const all = library.rows ?? []
        return {
            models: all,
            conversations: talks.rows ?? [],
            downloads: pulls.rows ?? [],
            runner: runners.rows?.[0],
            loaded: memory.rows ?? [],
            events: log.rows ?? [],
            comparisons: compared.rows ?? [],
            views: saved.rows ?? [],
            prefs: kept.rows?.[0] ?? DEFAULT_PREFS,
            setPrefs: (patch) => prefs.update('prefs', patch),
            loading: library.rows === undefined,
            modelOf: (id) => all.find((model) => model.id === id),
        }
    }, [library.rows, talks.rows, pulls.rows, runners.rows, memory.rows, log.rows, compared.rows, saved.rows, kept.rows])
    return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useApp(): AppData {
    const value = useContext(Context)
    if (value === undefined) throw new Error('useApp outside AppDataProvider')
    return value
}
