/** What every page reads: the world, the person's preferences, the view the address names, money as they read it, and the live stream. */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import { setPrefs, startStream, type StreamState } from './backend'
import { prefs as prefRows } from './collections'
import { DEFAULT_PREFS, RATES, type Person, type Prefs } from './model'
import { hrefOf, readView, useHash, type View } from './view'
import { useWorld, type World } from './world'

export interface AppState {
    world: World | undefined
    error: string | undefined
    prefs: Prefs
    setPrefs: (patch: Partial<Omit<Prefs, 'id'>>) => Promise<unknown>
    /** The page's view: the address, or, while settings are open over a page, that page's. */
    view: View
    /** Whether the address is settings, drawn as a dialog over `view`'s page. */
    settingsOpen: boolean
    /** Changes the range, the comparison or the segment, keeping the page. */
    setView: (patch: Partial<Pick<View, 'range' | 'compare' | 'plan' | 'region'>>) => void
    /** The address of a page in the current view. */
    href: (path: string, extra?: Record<string, string | null>) => string
    /** Who is signed in. */
    me: Person
    /** Dollars written in the person's currency; `short` writes `$571K`. */
    money: (dollars: number, short?: boolean) => string
    stream: StreamState
}

const Context = createContext<AppState | undefined>(undefined)

/** The address's words for the view itself, which `setView` writes anew. */
const VIEW_KEYS = new Set(['range', 'compare', 'plan', 'region'])

/** The clock, read again every `every` milliseconds. */
export function useNow(every = 15_000): number {
    const [now, setNow] = useState(Date.now)
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), every)
        return () => window.clearInterval(timer)
    }, [every])
    return now
}

export function AppProvider({ children }: { children: ReactNode }) {
    const { world, error } = useWorld()
    const { rows } = useCollection(prefRows)
    const prefs = rows?.[0] ?? DEFAULT_PREFS
    const hash = useHash()
    const read = useMemo(() => readView(hash, prefs), [hash, prefs])
    // Settings are a dialog over a page, which keeps its whole view under it: the range, the
    // segment and any saved view or form the page had open.
    const settingsOpen = read.path[0] === 'settings'
    const under = useRef<View | null>(null)
    if (!settingsOpen) under.current = read
    else under.current ??= readView('#/', prefs)
    const view = settingsOpen ? under.current : read
    const [stream, setStream] = useState<StreamState>('live')
    const pace = useRef(prefs.pace)
    pace.current = prefs.pace
    useEffect(() => startStream(() => pace.current, setStream), [])

    const value = useMemo((): AppState => {
        const rate = RATES[prefs.currency]
        const full = new Intl.NumberFormat('en-US', { style: 'currency', currency: prefs.currency, maximumFractionDigits: 0 })
        const short = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: prefs.currency,
            notation: 'compact',
            maximumFractionDigits: 1,
        })
        return {
            world,
            error,
            prefs,
            setPrefs,
            view,
            settingsOpen,
            setView: (patch) => {
                const next = { ...view, ...patch }
                const extra = Object.fromEntries([...view.params].filter(([key]) => !VIEW_KEYS.has(key)))
                window.location.hash = hrefOf(next, view.path.join('/'), extra).slice(1)
            },
            href: (path, extra) => hrefOf(view, path, extra),
            me: 'ada',
            money: (dollars, compact = false) => (compact ? short : full).format(dollars * rate),
            stream,
        }
    }, [world, error, prefs, view, settingsOpen, stream])
    return <Context value={value}>{children}</Context>
}

export function useApp(): AppState {
    const state = useContext(Context)
    if (state === undefined) throw new Error('useApp is used outside AppProvider')
    return state
}

/** The world, once the backend has answered; pages are drawn only after it has. */
export function useLoaded(): AppState & { world: World } {
    const state = useApp()
    if (state.world === undefined) throw new Error('useLoaded is used before the world has loaded')
    return state as AppState & { world: World }
}
