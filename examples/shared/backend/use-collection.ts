import { useEffect, useState, useSyncExternalStore } from 'react'

import { savingNow, subscribeSaving, type Collection, type Row, type Saving } from './store'

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

/** Where the example's changes stand, followed as it changes: some still on their way, the last one refused, or all kept. */
export function useSaving(): Saving {
    return useSyncExternalStore(subscribeSaving, savingNow, savingNow)
}

/** The words a status line says for where the changes stand, its tone and whether it pulses. */
export function savingNote(saving: Saving): { note: string; tone: 'quiet' | 'error'; live: boolean } {
    if (saving.state === 'saving') return { note: 'Saving', tone: 'quiet', live: true }
    if (saving.state === 'failed') return { note: `Not saved: ${saving.reason}`, tone: 'error', live: false }
    return { note: 'All changes saved', tone: 'quiet', live: false }
}
