/**
 * Undo and redo over an edit: each change keeps the edit before it, and changes made in quick turn
 * under one `merge` key (the keys typed into one field) are one step.
 */

import { useCallback, useRef, useState } from 'react'

import type { Edit } from './model'

/** How many steps back undo reaches. */
const DEPTH = 200

/** How long after a change another under the same key joins it, in milliseconds. */
const JOIN = 1200

interface History {
    past: Edit[]
    present: Edit
    future: Edit[]
}

export interface EditHistory {
    edit: Edit
    /** Makes a change: the next edit, or what a function makes of the present one (undefined for no change). */
    apply: (change: Edit | ((edit: Edit) => Edit | undefined), merge?: string) => void
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
}

export function useEditHistory(initial: Edit): EditHistory {
    const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] })
    const last = useRef<{ key: string; at: number } | undefined>(undefined)

    const apply = useCallback((change: Edit | ((edit: Edit) => Edit | undefined), merge?: string) => {
        const now = Date.now()
        const joins = merge !== undefined && last.current?.key === merge && now - last.current.at < JOIN
        last.current = merge === undefined ? undefined : { key: merge, at: now }
        setHistory((current) => {
            const next = typeof change === 'function' ? change(current.present) : change
            if (next === undefined || next === current.present) return current
            if (joins) return { ...current, present: next, future: [] }
            return { past: [...current.past, current.present].slice(-DEPTH), present: next, future: [] }
        })
    }, [])

    const undo = useCallback(() => {
        last.current = undefined
        setHistory((current) => {
            const previous = current.past.at(-1)
            if (previous === undefined) return current
            return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] }
        })
    }, [])

    const redo = useCallback(() => {
        last.current = undefined
        setHistory((current) => {
            const [next, ...rest] = current.future
            if (next === undefined) return current
            return { past: [...current.past, current.present], present: next, future: rest }
        })
    }, [])

    return {
        edit: history.present,
        apply,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
    }
}
