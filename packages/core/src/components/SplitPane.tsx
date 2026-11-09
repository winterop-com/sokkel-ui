import {
    createContext,
    useCallback,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type ReactNode,
} from 'react'

import { cn } from '../lib/cn'
import { parseStored, readStored, storedKey, subscribeStored, writeStored } from '../lib/stored'
import { ResizeHandle } from './ResizeHandle'

/** The words a split says. */
export interface SplitPaneWords {
    /** The name of the edge between the panes, which drags to resize them. */
    resize: string
}

const WORDS: SplitPaneWords = { resize: 'Resize the panes' }

/** How a split lays out its two panes: side by side, or one over the other. */
export type SplitPaneDirection = 'across' | 'down'

/** What a split does once it is narrow: stack its panes one over the other, or show only one of them. */
export type SplitPaneNarrow = 'stack' | 'first' | 'second'

/** What a pane can ask of the split around it, through `useSplitPane`. */
export interface SplitPaneState {
    /** Whether the split is narrower than its `narrowBelow`. */
    narrow: boolean
    /** The pane shown alone, by `only` or while the split is narrow, or null while both are shown. */
    alone: 'first' | 'second' | null
}

const SplitPaneContext = createContext<SplitPaneState | null>(null)

/**
 * The split a pane is drawn in, or null outside one: whether it is narrow and which pane it shows
 * alone, so the pane shown alone can offer a way back to the other.
 */
export function useSplitPane(): SplitPaneState | null {
    return useContext(SplitPaneContext)
}

/** A share held within its bounds, the bounds themselves held within 0 and 1; a share that is not a number takes the lower bound. */
export function clampShare(share: number, min = 0, max = 1): number {
    const low = Math.min(1, Math.max(0, min))
    const high = Math.max(low, Math.min(1, max))
    if (Number.isNaN(share)) return low
    return Math.min(high, Math.max(low, share))
}

/** The key a split's share is kept under: the app's prefix, then `split-pane.` and the split's id. */
export function shareKey(id: string): string {
    return storedKey(`split-pane.${id}`)
}

/** A kept share read back: a number from 0 to 1, or undefined when nothing is kept or what is kept is not one. */
export function parseShare(raw: string | null): number | undefined {
    return parseStored<number | undefined>(raw, undefined, (value) => typeof value === 'number' && value >= 0 && value <= 1)
}

/** The share a split remembers under `id`, read back as it starts; undefined when it remembers none. */
export function keptShare(id: string): number | undefined {
    return parseShare(readStored(shareKey(id)))
}

/** Remembers a split's share under `id`, or forgets it with undefined. */
export function keepShare(id: string, share: number | undefined): void {
    writeStored(shareKey(id), share === undefined ? null : JSON.stringify(Math.round(share * 10_000) / 10_000))
}

/**
 * The share a split holds itself: kept in storage under `id` when it has one, and following a change
 * made under the same key elsewhere, such as another tab; in state otherwise.
 */
function useOwnShare(id: string | undefined): [number | undefined, (share: number | undefined) => void] {
    const key = id === undefined ? null : shareKey(id)
    const subscribe = useCallback((listener: () => void) => (key === null ? () => undefined : subscribeStored(key, listener)), [key])
    const raw = useSyncExternalStore(
        subscribe,
        () => (key === null ? null : readStored(key)),
        () => null,
    )
    const [own, setOwn] = useState<number | undefined>(undefined)
    const set = (share: number | undefined) => {
        if (id === undefined) setOwn(share)
        else keepShare(id, share)
    }
    return [key === null ? own : parseShare(raw), set]
}

/** The split's own size in pixels, measured as it is drawn and again whenever it resizes; null until then. */
function useRoom() {
    const root = useRef<HTMLDivElement>(null)
    const [room, setRoom] = useState<{ width: number; height: number } | null>(null)
    useLayoutEffect(() => {
        const element = root.current
        if (element === null) return
        const measure = () => {
            const width = element.clientWidth
            const height = element.clientHeight
            setRoom((previous) => (previous?.width === width && previous.height === height ? previous : { width, height }))
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])
    return { root, room }
}

export interface SplitPaneProps {
    /** The pane at the start, or on top. */
    first: ReactNode
    /** The pane at the end, or underneath. */
    second: ReactNode
    /** `across` sets the panes side by side, `down` one over the other. */
    direction?: SplitPaneDirection
    /** The first pane's share of the split, from 0 to 1, held from outside with `onShareChange`. */
    share?: number
    onShareChange?: (share: number) => void
    /** The share the first pane starts at and a double click on the edge returns to. */
    defaultShare?: number
    /** The least share the first pane can be given, from 0 to 1. */
    minShare?: number
    /** The most share the first pane can be given, from 0 to 1. */
    maxShare?: number
    /** Remembers the share under this name in the browser's storage, so it outlasts a reload; unused while `share` holds it. */
    id?: string
    /** Whether the edge between the panes drags to resize them. */
    resizable?: boolean
    /** What the split does once it is narrow: stacks its panes, or shows only the first or the second. */
    narrow?: SplitPaneNarrow
    /** Shows one pane alone at any width, the other kept as it was, such as an editor while its preview is off. */
    only?: 'first' | 'second'
    /** The width in pixels below which the split is narrow. */
    narrowBelow?: number
    className?: string
    words?: Partial<SplitPaneWords>
}

/**
 * Two panes side by side (`across`) or one over the other (`down`), filling the box they are given,
 * with a rule between them. The edge between them drags to share the room differently, within
 * `minShare` and `maxShare` of the first pane, moves by the arrow keys, and goes back to
 * `defaultShare` on a double click or Enter.
 *
 * Left to itself the split holds its own share from `defaultShare`, and with an `id` remembers it in
 * the browser's storage (in memory where storage is refused); `share` with `onShareChange` holds it
 * from outside, and `resizable={false}` keeps it fixed. A share is a part of the split's length, so
 * the panes keep their proportions as the window resizes.
 *
 * Narrower than `narrowBelow` pixels, measured on the split itself rather than the window so it
 * holds in any container, a split across stacks its panes one over the other with the same share
 * of the height (`narrow="stack"`), or shows only the pane `narrow` names, as a phone shows a list
 * or the message opened from it. `only` shows one pane alone at any width, as a reader turns the
 * other off; the hidden pane stays mounted, so it comes back as it was left. `useSplitPane` tells a
 * pane whether it is shown alone.
 *
 * What a pane is given as one element fills the pane's height, as a cell of a row does, and each pane
 * scrolls what does not fit in it. The rule between the panes lies where a rule of the first pane's
 * own, such as a column's edge, would fall, so the two are one line.
 */
export function SplitPane({
    first,
    second,
    direction = 'across',
    share,
    onShareChange,
    defaultShare = 0.5,
    minShare = 0.2,
    maxShare = 0.8,
    id,
    resizable = true,
    narrow: whenNarrow = 'stack',
    only,
    narrowBelow = 640,
    className,
    words: given,
}: SplitPaneProps) {
    const words = { ...WORDS, ...given }
    const held = share !== undefined
    const [own, setOwn] = useOwnShare(held ? undefined : id)
    const clamp = (value: number) => clampShare(value, minShare, maxShare)
    const current = clamp(held ? share : (own ?? defaultShare))
    const changeable = !held || onShareChange !== undefined
    const set = (next: number) => {
        const value = clamp(next)
        if (!held) setOwn(value)
        onShareChange?.(value)
    }
    const reset = () => {
        if (!held) setOwn(undefined)
        onShareChange?.(clamp(defaultShare))
    }

    const { root, room } = useRoom()
    const firstPane = useRef<HTMLDivElement>(null)
    const narrow = room !== null && room.width < narrowBelow
    const alone = only ?? (narrow && whenNarrow !== 'stack' ? whenNarrow : null)
    const across = direction === 'across' && !(narrow && whenNarrow === 'stack')
    const length = room === null ? 0 : across ? room.width : room.height
    const pixels = (value: number) => Math.round(value * length)
    const size: CSSProperties | undefined = alone === null ? { [across ? 'width' : 'height']: `${current * 100}%` } : undefined

    // A pane's one child fills its height, as a cell of a row stretches; what overflows it scrolls in the pane.
    const pane = 'min-h-0 min-w-0 flex-col overflow-auto [&>:only-child]:min-h-0 [&>:only-child]:flex-1'
    return (
        <SplitPaneContext.Provider value={{ narrow, alone }}>
            <div
                ref={root}
                data-slot="split-pane"
                data-direction={across ? 'across' : 'down'}
                data-narrow={narrow || undefined}
                className={cn('flex h-full min-h-0 w-full min-w-0 flex-1', across ? 'flex-row' : 'flex-col', className)}
            >
                <div
                    ref={firstPane}
                    data-slot="split-pane-first"
                    style={size}
                    className={cn(pane, alone === 'second' ? 'hidden' : 'flex', alone === null ? 'shrink-0' : 'flex-1')}
                >
                    {first}
                </div>
                {alone === null && (
                    // The rule lies over the first pane's last line of pixels, where a rule its content draws at its own edge falls too.
                    <span
                        aria-hidden
                        data-slot="split-pane-rule"
                        className={cn('z-1 shrink-0 bg-border-strong', across ? '-ml-px w-px' : '-mt-px h-px')}
                    />
                )}
                {alone === null && resizable && changeable && room !== null && (
                    <ResizeHandle
                        target={firstPane}
                        size={pixels(current)}
                        onSize={(next) => set(length === 0 ? current : next / length)}
                        onReset={reset}
                        min={pixels(clamp(0))}
                        max={pixels(clamp(1))}
                        axis={across ? 'x' : 'y'}
                        follow={false}
                        label={words.resize}
                    />
                )}
                <div data-slot="split-pane-second" className={cn(pane, 'flex-1', alone === 'first' ? 'hidden' : 'flex')}>
                    {second}
                </div>
            </div>
        </SplitPaneContext.Provider>
    )
}
