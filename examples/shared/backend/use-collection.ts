import { useEffect, useState } from 'react'

import type { Collection, Row } from './store'

/** A collection's rows, undefined until the first answer, kept current as they change. */
export function useCollection<T extends Row>(source: Collection<T>): { rows: T[] | undefined; error: string | undefined } {
    const [rows, setRows] = useState<T[] | undefined>(undefined)
    const [error, setError] = useState<string | undefined>(undefined)
    useEffect(() => {
        let live = true
        source.list().then(
            (answer) => {
                if (live) setRows(answer)
            },
            (failure: unknown) => {
                if (live) setError(failure instanceof Error ? failure.message : String(failure))
            },
        )
        const stop = source.subscribe((next) => {
            if (live) setRows(next)
        })
        return () => {
            live = false
            stop()
        }
    }, [source])
    return { rows, error }
}
