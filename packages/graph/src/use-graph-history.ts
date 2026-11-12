import { useCallback, useEffect, useReducer, useRef } from 'react'

/** A value with what it was before and what an undo took back. */
export interface HistoryState<T> {
    past: readonly T[]
    present: T
    future: readonly T[]
    /** The group the last change belongs to; a change in the same group joins it rather than adding a step. */
    group: string | null
    /** Counts undos, redos and resets, so anything holding a copy of the value knows to take it again. */
    revision: number
}

export type HistoryAction<T> =
    | { type: 'set'; update: T | ((current: T) => T); group: string; limit: number }
    | { type: 'undo' }
    | { type: 'redo' }
    | { type: 'reset'; value: T }

/** One change to a history. A change that leaves the value as it was adds nothing. */
export function historyStep<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
    switch (action.type) {
        case 'set': {
            const next = typeof action.update === 'function' ? (action.update as (current: T) => T)(state.present) : action.update
            if (Object.is(next, state.present)) return state
            if (action.group === state.group) return { ...state, present: next, future: [] }
            return {
                ...state,
                past: [...state.past, state.present].slice(-action.limit),
                present: next,
                future: [],
                group: action.group,
            }
        }
        case 'undo': {
            const previous = state.past[state.past.length - 1]
            if (state.past.length === 0) return state
            return {
                past: state.past.slice(0, -1),
                present: previous as T,
                future: [state.present, ...state.future],
                group: null,
                revision: state.revision + 1,
            }
        }
        case 'redo': {
            if (state.future.length === 0) return state
            const [next, ...rest] = state.future
            return {
                past: [...state.past, state.present],
                present: next as T,
                future: rest,
                group: null,
                revision: state.revision + 1,
            }
        }
        case 'reset':
            return { past: [], present: action.value, future: [], group: null, revision: state.revision + 1 }
    }
}

/** What `useGraphHistory` gives back. */
export interface GraphHistory<T> {
    value: T
    /**
     * Changes the value as one step to undo. Every change made in the same task, such as the
     * removal of several chosen nodes, is one step; so is a run of changes given the same `merge`
     * key, such as the keystrokes typed into one field.
     */
    set: (update: T | ((current: T) => T), options?: { merge?: string }) => void
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
    /** Starts over from `value`, with nothing to undo. */
    reset: (value: T) => void
    /** Changes on every undo, redo and reset: a form keyed on it shows the value they brought back. */
    revision: number
}

/** Whether a key press belongs to a field that keeps its own undo. */
function typing(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]') !== null
}

/** The keys of a press, as a keyboard event carries them. */
export interface HistoryKeyPress {
    key: string
    metaKey: boolean
    ctrlKey: boolean
    shiftKey: boolean
    altKey: boolean
}

/** What a key press asks of a history: Cmd or Ctrl with Z undoes, with Shift and Z or Ctrl with Y redoes; null for anything else. */
export function historyKey(press: HistoryKeyPress): 'undo' | 'redo' | null {
    if (!(press.metaKey || press.ctrlKey) || press.altKey) return null
    const key = press.key.toLowerCase()
    if (key === 'z') return press.shiftKey ? 'redo' : 'undo'
    if (key === 'y' && press.ctrlKey && !press.shiftKey) return 'redo'
    return null
}

/**
 * The undo and redo keys for a history kept elsewhere, such as the text a graph is drawn from:
 * Cmd or Ctrl with Z calls `undo`, and with Shift and Z, or Ctrl with Y, `redo`, anywhere on the
 * page but in a field, which keeps its own undo. Off while `enabled` is false.
 */
export function useHistoryKeys(undo: () => void, redo: () => void, { enabled = true }: { enabled?: boolean } = {}): void {
    const calls = useRef({ undo, redo })
    useEffect(() => {
        calls.current = { undo, redo }
    })
    useEffect(() => {
        if (!enabled) return
        const onKey = (event: KeyboardEvent) => {
            const which = historyKey(event)
            if (which === null || event.defaultPrevented || typing(event.target)) return
            event.preventDefault()
            calls.current[which]()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [enabled])
}

/**
 * The value an editor works on, with undo and redo. Cmd or Ctrl with Z undoes, and with Shift and
 * Z, or Ctrl with Y, redoes, unless `keys` is false or the key is pressed in a field, which keeps
 * its own undo.
 */
export function useGraphHistory<T>(
    initial: T,
    {
        past = [],
        limit = 100,
        keys = true,
    }: {
        /** Earlier values to start with, oldest first, as when a document is reopened with its history. */
        past?: readonly T[]
        /** The most steps kept to undo. */
        limit?: number
        keys?: boolean
    } = {},
): GraphHistory<T> {
    const [state, dispatch] = useReducer(historyStep<T>, null, () => ({
        past,
        present: initial,
        future: [],
        group: null,
        revision: 0,
    }))
    const tick = useRef({ count: 0, open: false })

    const set = useCallback(
        (update: T | ((current: T) => T), options?: { merge?: string }) => {
            const now = tick.current
            if (!now.open) {
                now.count += 1
                now.open = true
                queueMicrotask(() => {
                    now.open = false
                })
            }
            dispatch({ type: 'set', update, group: options?.merge ?? `tick:${String(now.count)}`, limit })
        },
        [limit],
    )
    const undo = useCallback(() => dispatch({ type: 'undo' }), [])
    const redo = useCallback(() => dispatch({ type: 'redo' }), [])
    const reset = useCallback((value: T) => dispatch({ type: 'reset', value }), [])

    useHistoryKeys(undo, redo, { enabled: keys })

    return {
        value: state.present,
        set,
        undo,
        redo,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
        reset,
        revision: state.revision,
    }
}
