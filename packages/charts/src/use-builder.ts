import { useEffect, useState } from 'react'

import type { ChartKind } from './kinds'
import { loadKind } from './kinds/load'
import type { ChartBuilder } from './kinds/spec'

const loading = new Map<ChartKind, Promise<ChartBuilder>>()
const loaded = new Map<ChartKind, ChartBuilder>()

/** Fetches a kind's builder once, shared by every chart of that kind after; a failed fetch is tried again by the next chart. */
function loadBuilder(kind: ChartKind): Promise<ChartBuilder> {
    let known = loading.get(kind)
    if (known === undefined) {
        known = loadKind(kind).then(
            (build) => {
                loaded.set(kind, build)
                return build
            },
            (error: unknown) => {
                loading.delete(kind)
                throw error
            },
        )
        loading.set(kind, known)
    }
    return known
}

/**
 * The option builder of one kind, fetched the first time a chart of that kind is drawn, beside the
 * engine: undefined until it arrives.
 */
export function useBuilder(kind: ChartKind): ChartBuilder | undefined {
    const [held, setHeld] = useState<{ kind: ChartKind; build: ChartBuilder | undefined }>(() => ({ kind, build: loaded.get(kind) }))
    const build = held.kind === kind ? held.build : loaded.get(kind)
    useEffect(() => {
        if (build !== undefined) return
        let live = true
        loadBuilder(kind).then(
            (next) => {
                if (live) setHeld({ kind, build: next })
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [kind, build])
    return build
}
