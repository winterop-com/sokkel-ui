import type { Collection, Row } from 'tidevann-shared/backend'

/** A collection's rows held in memory for the engines, which read them at once and write through the backend. */
export interface Mirror<T> {
    rows: () => readonly T[]
    /** Resolves once the first answer is in. */
    ready: Promise<void>
}

export function mirror<T extends Row>(source: Collection<T>): Mirror<T> {
    let rows: readonly T[] = []
    source.subscribe((next) => {
        rows = next
    })
    const ready = source.list().then((first) => {
        rows = first
    })
    return { rows: () => rows, ready }
}
