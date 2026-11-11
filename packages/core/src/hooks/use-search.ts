import { useEffect, useRef, useState } from 'react'

import { SEARCH_IDLE, searchFor, type SearchSource, type SearchState } from '../lib/search'

/** Where a search stands, and the way to ask its query again after a failure. */
export type SearchAnswer = SearchState & { retry: () => void }

/**
 * Runs an app's `search` for a query and keeps where it stands. The first query is asked at once
 * and each change after a pause in typing; an answer given at once lands without a wait. Older
 * answers are dropped and their signal aborted. Results belong to the query they answer: while
 * the next query waits, the last results stay only as stale (`loading`), and a failure keeps none;
 * emptying the query or closing the list (`enabled` false) drops them, so the next query starts from nothing.
 * `retry` asks the query again at once. Below `minQuery` characters, or while `enabled` is false,
 * nothing is asked.
 */
export function useSearch(
    search: SearchSource | undefined,
    query: string,
    { debounce = 150, minQuery = 1, enabled = true }: { debounce?: number; minQuery?: number; enabled?: boolean } = {},
): SearchAnswer {
    const [held, setHeld] = useState(SEARCH_IDLE)
    const [tries, setTries] = useState(0)
    const searchRef = useRef(search)
    const asked = useRef(-1)
    useEffect(() => {
        searchRef.current = search
    }, [search])

    const trimmed = query.trim()
    const active = enabled && search !== undefined && trimmed.length >= minQuery

    useEffect(() => {
        if (!active) {
            asked.current = -1
            // Emptied or closed, the search lets its results go, so a query after it starts from nothing.
            return setHeld(SEARCH_IDLE)
        }
        const controller = new AbortController()
        const land = (next: SearchState) => {
            if (!controller.signal.aborted) setHeld(next)
        }
        const fail = (reason: unknown) =>
            land({ state: 'failed', query: trimmed, groups: [], reason: reason instanceof Error ? reason.message : String(reason) })
        const done = (groups: SearchState['groups']) => land({ state: 'done', query: trimmed, groups })
        const ask = () => {
            const source = searchRef.current
            if (source === undefined) return
            setHeld((last) => searchFor(last, trimmed, true))
            try {
                const given = source(trimmed, controller.signal)
                if (given instanceof Promise) given.then(done, fail)
                else done(given)
            } catch (reason) {
                fail(reason)
            }
        }
        // The first query, and one asked again, go at once; a changed one after a pause in typing.
        const now = asked.current !== tries
        asked.current = tries
        if (now) ask()
        const timer = now ? undefined : setTimeout(ask, debounce)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [active, trimmed, debounce, tries])

    return { ...(active ? searchFor(held, trimmed) : SEARCH_IDLE), retry: () => setTries((count) => count + 1) }
}
