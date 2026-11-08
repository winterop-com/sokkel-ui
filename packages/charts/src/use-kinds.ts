import { useEffect, useState } from 'react'

type Kinds = (typeof import('./kinds'))['KINDS']

let loading: Promise<Kinds> | undefined
let loaded: Kinds | undefined

function loadKinds(): Promise<Kinds> {
    loading ??= import('./kinds').then(
        (module) => {
            loaded = module.KINDS
            return module.KINDS
        },
        (error: unknown) => {
            loading = undefined
            throw error
        },
    )
    return loading
}

/**
 * Every kind's option builder, fetched with the first chart drawn, beside the engine, and shared by
 * every chart after: undefined until it arrives.
 */
export function useKinds(): Kinds | undefined {
    const [kinds, setKinds] = useState(loaded)
    useEffect(() => {
        if (kinds !== undefined) return
        let live = true
        loadKinds().then(
            (next) => {
                if (live) setKinds(next)
            },
            () => undefined,
        )
        return () => {
            live = false
        }
    }, [kinds])
    return kinds
}
