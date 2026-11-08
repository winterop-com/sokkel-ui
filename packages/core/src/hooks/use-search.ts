import { useEffect, useRef, useState } from 'react'

import type { SearchSource, SearchState } from '../lib/search'

const IDLE: SearchState = { state: 'idle', groups: [] }

/**
 * Runs an app's `search` for a query and keeps where it stands. The first query is asked at once
 * and each change after a pause in typing; an answer given at once lands without a wait. Older
 * answers are dropped and their signal aborted, and the last results stay while the next are
 * asked. Below `minQuery` characters, or while `enabled` is false, nothing is asked.
 */
export function useSearch(
    search: SearchSource | undefined,
    query: string,
    { debounce = 150, minQuery = 1, enabled = true }: { debounce?: number; minQuery?: number; enabled?: boolean } = {},
): SearchState {
    const [answer, setAnswer] = useState<SearchState>(IDLE)
    const searchRef = useRef(search)
    const asked = useRef(false)
    useEffect(() => {
        searchRef.current = search
    }, [search])

    const trimmed = query.trim()
    const active = enabled && search !== undefined && trimmed.length >= minQuery

    useEffect(() => {
        if (!active) {
            asked.current = false
            return
        }
        const controller = new AbortController()
        const ask = () => {
            const source = searchRef.current
            if (source === undefined) return
            let given: ReturnType<SearchSource>
            try {
                given = source(trimmed, controller.signal)
            } catch (reason) {
                setAnswer((last) => ({ state: 'failed', groups: last.groups, reason: String(reason) }))
                return
            }
            if (!(given instanceof Promise)) {
                setAnswer({ state: 'done', groups: given })
                return
            }
            setAnswer((last) => ({ state: 'loading', groups: last.groups }))
            given.then(
                (groups) => {
                    if (!controller.signal.aborted) setAnswer({ state: 'done', groups })
                },
                (reason: unknown) => {
                    if (controller.signal.aborted) return
                    setAnswer((last) => ({
                        state: 'failed',
                        groups: last.groups,
                        reason: reason instanceof Error ? reason.message : String(reason),
                    }))
                },
            )
        }
        const first = !asked.current
        asked.current = true
        if (first) {
            ask()
            return () => controller.abort()
        }
        const timer = setTimeout(ask, debounce)
        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [active, trimmed, debounce])

    return active ? answer : IDLE
}
