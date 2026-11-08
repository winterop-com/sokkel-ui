/**
 * A queue: the items in the list's own order, as an album or a playlist draws them, and the order
 * they play in, kept apart as indexes into the list. Shuffle rearranges only the play order, with
 * the item playing first, so turning it off carries on from that item's place in the list; repeat
 * says what the end of the order does. Every change keeps the current item current. Pure, so
 * `useQueue` and an app's own store share the same arithmetic.
 */
import { seedHash } from './cover-seed'

/** How a queue repeats: not at all, the whole queue, or the one item playing. */
export type RepeatMode = 'off' | 'all' | 'one'

/** The modes in the order a repeat button steps through them. */
export const REPEAT_MODES: readonly RepeatMode[] = ['off', 'all', 'one']

/** The mode after `mode`: off, then the whole queue, then the one item, then off again. */
export function nextRepeat(mode: RepeatMode): RepeatMode {
    return REPEAT_MODES[(REPEAT_MODES.indexOf(mode) + 1) % REPEAT_MODES.length]
}

export interface Queue<T> {
    /** The items in the list's own order. */
    readonly items: readonly T[]
    /** The play order, each entry an index into `items`: the list's own order unless shuffled. */
    readonly order: readonly number[]
    /** Where the current item stands in `order`, or -1 in an empty queue. */
    readonly at: number
    readonly shuffle: boolean
    readonly repeat: RepeatMode
}

/** One item of a queue with its index in the list and its position in the play order. */
export interface QueueEntry<T> {
    item: T
    index: number
    position: number
}

export interface QueueOptions {
    /** The index in the list of the item to start on, the first in the play order by default. */
    start?: number
    shuffle?: boolean
    repeat?: RepeatMode
    /** What a shuffle is drawn from, so the same seed gives the same order; a random one by default. */
    seed?: number | string
    /** A play order given whole, each entry an index into the list, such as one kept from before. */
    order?: readonly number[]
}

/**
 * A generator of numbers from 0 up to 1 that gives the same run for the same seed (mulberry32), so
 * a shuffle can be told again. A string seed is hashed first.
 */
export function seededRandom(seed: number | string): () => number {
    let state = (typeof seed === 'string' ? seedHash(seed) : Math.floor(seed)) >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
    }
}

/** The indexes 0 up to `count`, in order. */
function inOrder(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index)
}

/**
 * A shuffled play order of `count` items with `first` leading it and the rest in a Fisher-Yates
 * shuffle drawn from `random`: shuffle says what comes after the item playing, not what plays.
 */
export function shuffledOrder(count: number, first: number, random: () => number = Math.random): number[] {
    if (count <= 0) return []
    const lead = Math.min(Math.max(0, Math.floor(first)), count - 1)
    const rest = inOrder(count).filter((index) => index !== lead)
    for (let index = rest.length - 1; index > 0; index -= 1) {
        const other = Math.floor(random() * (index + 1))
        ;[rest[index], rest[other]] = [rest[other], rest[index]]
    }
    return [lead, ...rest]
}

/** Whether `order` holds each index from 0 up to `count` once. */
function isOrder(order: readonly number[], count: number): boolean {
    if (order.length !== count) return false
    const seen = new Set(order)
    return seen.size === count && order.every((index) => Number.isInteger(index) && index >= 0 && index < count)
}

function isInOrder(order: readonly number[]): boolean {
    return order.every((index, position) => index === position)
}

function randomOf(seed: number | string | undefined): () => number {
    return seed === undefined ? Math.random : seededRandom(seed)
}

/**
 * A queue of `items`. Shuffled, the play order is drawn from `seed` with the `start` item first,
 * unless `order` gives it whole; a given order that is not one of the items is drawn instead.
 */
export function createQueue<T>(items: readonly T[], options: QueueOptions = {}): Queue<T> {
    const count = items.length
    const repeat = options.repeat ?? 'off'
    if (count === 0) return { items, order: [], at: -1, shuffle: options.shuffle ?? false, repeat }
    const given = options.order !== undefined && isOrder(options.order, count) ? [...options.order] : undefined
    const shuffle = options.shuffle ?? (given !== undefined && !isInOrder(given))
    const start = options.start === undefined ? undefined : Math.min(Math.max(0, Math.floor(options.start)), count - 1)
    if (shuffle) {
        const order = given ?? shuffledOrder(count, start ?? 0, randomOf(options.seed))
        return { items, order, at: start === undefined ? 0 : order.indexOf(start), shuffle, repeat }
    }
    return { items, order: inOrder(count), at: start ?? 0, shuffle, repeat }
}

/** The current item's index in the list, or -1 in an empty queue. */
export function queueIndex<T>(queue: Queue<T>): number {
    return queue.order[queue.at] ?? -1
}

/** The current item, or nothing in an empty queue. */
export function queueItem<T>(queue: Queue<T>): T | undefined {
    const index = queueIndex(queue)
    return index < 0 ? undefined : queue.items[index]
}

/** The items in the order they play, as a view of what comes next draws them; slice after `at` for the ones to come. */
export function queueOrdered<T>(queue: Queue<T>): QueueEntry<T>[] {
    return queue.order.map((index, position) => ({ item: queue.items[index], index, position }))
}

/** The queue with the item at `index` in the list current, where it stands in the play order. */
export function queuePlay<T>(queue: Queue<T>, index: number): Queue<T> {
    const at = queue.order.indexOf(index)
    return at < 0 || at === queue.at ? queue : { ...queue, at }
}

/**
 * The queue after a press of next: the item after this one in the play order. At its end the
 * order starts over while it repeats, and there is nowhere to go when it does not. Repeating one
 * item does not hold next on it: a press means enough of this one.
 */
export function queueNext<T>(queue: Queue<T>): Queue<T> | undefined {
    const { at, order, repeat } = queue
    if (at < 0) return undefined
    if (at + 1 < order.length) return { ...queue, at: at + 1 }
    return repeat === 'off' ? undefined : { ...queue, at: 0 }
}

/**
 * The queue after a press of previous: the item before this one in the play order. At its start
 * the order goes round to its end while it repeats, and there is nowhere to go when it does not,
 * which a player takes as starting this item again.
 */
export function queuePrevious<T>(queue: Queue<T>): Queue<T> | undefined {
    const { at, order, repeat } = queue
    if (at < 0) return undefined
    if (at > 0) return { ...queue, at: at - 1 }
    return repeat === 'off' ? undefined : { ...queue, at: order.length - 1 }
}

/**
 * The queue once the current item has played to its end: the same item again while it repeats
 * one, the next in the play order, the first again at the end while it repeats all, and nothing
 * when it is finished.
 */
export function queueEnded<T>(queue: Queue<T>): Queue<T> | undefined {
    const { at, order, repeat } = queue
    if (at < 0) return undefined
    if (repeat === 'one') return queue
    if (at + 1 < order.length) return { ...queue, at: at + 1 }
    return repeat === 'all' ? { ...queue, at: 0 } : undefined
}

/**
 * The queue shuffled or put back in the list's order, the current item playing on. Shuffled, the
 * current item leads an order drawn from `seed` (or `random`), unless `order` gives it whole;
 * unshuffled, the order is the list's and the current item keeps its place in it.
 */
export function queueShuffle<T>(
    queue: Queue<T>,
    shuffle: boolean,
    options: { seed?: number | string; order?: readonly number[]; random?: () => number } = {},
): Queue<T> {
    const count = queue.items.length
    const current = queueIndex(queue)
    if (!shuffle) return { ...queue, order: inOrder(count), at: current, shuffle }
    if (count === 0) return { ...queue, shuffle }
    const given = options.order !== undefined && isOrder(options.order, count) ? [...options.order] : undefined
    const order = given ?? shuffledOrder(count, current, options.random ?? randomOf(options.seed))
    return { ...queue, order, at: order.indexOf(current), shuffle }
}

/** The queue repeating by `repeat`. */
export function queueRepeat<T>(queue: Queue<T>, repeat: RepeatMode): Queue<T> {
    return repeat === queue.repeat ? queue : { ...queue, repeat }
}

/**
 * The queue with `added` put in: right after the current item, in the list and in the play order,
 * when `where` is `next`, or at the end of both. In an empty queue the first added becomes current.
 */
export function queueAdd<T>(queue: Queue<T>, added: readonly T[], where: 'next' | 'end' = 'end'): Queue<T> {
    const count = added.length
    if (count === 0) return queue
    const current = queueIndex(queue)
    const next = where === 'next' && current >= 0
    const place = next ? current + 1 : queue.items.length
    const items = [...queue.items.slice(0, place), ...added, ...queue.items.slice(place)]
    // What is added goes after the current item, so it keeps its place; an empty queue starts on the first added.
    const at = Math.max(0, queue.at)
    if (!queue.shuffle) return { ...queue, items, order: inOrder(items.length), at }
    const moved = queue.order.map((index) => (index >= place ? index + count : index))
    const fresh = inOrder(count).map((index) => place + index)
    const order = next ? [...moved.slice(0, queue.at + 1), ...fresh, ...moved.slice(queue.at + 1)] : [...moved, ...fresh]
    return { ...queue, items, order, at }
}

/**
 * The queue without the items at `indexes` in the list. The current item stays current; when it is
 * removed, the item after it in the play order takes its place, or the one before it at the end.
 */
export function queueRemove<T>(queue: Queue<T>, indexes: number | readonly number[]): Queue<T> {
    const gone = new Set((typeof indexes === 'number' ? [indexes] : indexes).filter((index) => index >= 0 && index < queue.items.length))
    if (gone.size === 0) return queue
    // Each kept index moves down by the removed ones before it.
    const shift: number[] = []
    let removed = 0
    for (let index = 0; index < queue.items.length; index += 1) {
        shift.push(index - removed)
        if (gone.has(index)) removed += 1
    }
    const items = queue.items.filter((_, index) => !gone.has(index))
    const order = queue.order.filter((index) => !gone.has(index)).map((index) => shift[index])
    if (order.length === 0) return { ...queue, items, order, at: -1 }
    const current = queueIndex(queue)
    if (!gone.has(current)) return { ...queue, items, order, at: order.indexOf(shift[current]) }
    const before = queue.order.slice(0, queue.at).filter((index) => !gone.has(index)).length
    return { ...queue, items, order, at: Math.min(before, order.length - 1) }
}

/** `list` with the entry at `from` taken out and put back at `to`. */
function moved<V>(list: readonly V[], from: number, to: number): V[] {
    const next = [...list]
    const [entry] = next.splice(from, 1)
    next.splice(to, 0, entry)
    return next
}

/**
 * The queue with the item at position `from` in the play order moved to position `to`, as a view
 * of what comes next reorders it. In the list's order the list moves with it; shuffled, only the
 * play order does. The current item stays current.
 */
export function queueMove<T>(queue: Queue<T>, from: number, to: number): Queue<T> {
    const count = queue.order.length
    if (from === to || from < 0 || to < 0 || from >= count || to >= count) return queue
    const current = queueIndex(queue)
    if (queue.shuffle) {
        const order = moved(queue.order, from, to)
        return { ...queue, order, at: order.indexOf(current) }
    }
    const places = moved(inOrder(count), from, to)
    return { ...queue, items: places.map((index) => queue.items[index]), at: places.indexOf(current) }
}
