import { useRef, useState } from 'react'

import { RESTART_AFTER } from './chapters'
import {
    createQueue,
    queueAdd,
    queueEnded,
    queueIndex,
    queueItem,
    queueMove,
    queueNext,
    queuePlay,
    queuePrevious,
    queueRemove,
    queueRepeat,
    queueShuffle,
    seededRandom,
    type Queue,
    type QueueOptions,
    type RepeatMode,
} from './queue'

export interface QueueControls<T> {
    /** The whole state, to keep and give back as `order` and `start` another time. */
    queue: Queue<T>
    /** The current item's index in the list, or -1 in an empty queue. */
    index: number
    item: T | undefined
    shuffle: boolean
    repeat: RepeatMode
    /** Whether next and previous have somewhere to go, for a player to draw them enabled. */
    hasNext: boolean
    hasPrevious: boolean
    /** Goes to the next item; false when there is none. */
    next: () => boolean
    /**
     * Goes to the item before, or says to start this one again: past the first `RESTART_AFTER`
     * seconds of it, given its `position`, and at the start of a queue that does not repeat.
     */
    previous: (position?: number) => 'moved' | 'restart'
    /** Moves on once the current item has played to its end: to another item, the same one again, or nowhere. */
    ended: () => 'moved' | 'again' | 'finished'
    /** Makes the item at `index` in the list current. */
    play: (index: number) => void
    setShuffle: (shuffle: boolean, options?: { seed?: number | string; order?: readonly number[] }) => void
    setRepeat: (repeat: RepeatMode) => void
    add: (items: readonly T[], where?: 'next' | 'end') => void
    remove: (indexes: number | readonly number[]) => void
    /** Moves the item at position `from` in the play order to `to`. */
    move: (from: number, to: number) => void
    /** Starts a new queue, such as an album played from its third track. */
    load: (items: readonly T[], options?: QueueOptions) => void
}

/**
 * A queue held in state: the list, the order it plays in, shuffle and repeat, and the steps a
 * player takes through it, over the pure helpers in `queue`. A shuffle is drawn from `seed` when
 * one is given, so the same seed shuffles the same way every time. It answers what the player
 * should do (play another item, the same again, or stop) and leaves playing to the app.
 */
export function useQueue<T>(items: readonly T[], options: QueueOptions = {}): QueueControls<T> {
    const [queue, setQueue] = useState(() => createQueue(items, options))
    // The latest queue, so several steps in one event each start where the last one left it.
    const latest = useRef(queue)
    const random = useRef<() => number>(options.seed === undefined ? Math.random : seededRandom(options.seed))

    const commit = (next: Queue<T>) => {
        if (next === latest.current) return
        latest.current = next
        setQueue(next)
    }

    return {
        queue,
        index: queueIndex(queue),
        item: queueItem(queue),
        shuffle: queue.shuffle,
        repeat: queue.repeat,
        hasNext: queueNext(queue) !== undefined,
        hasPrevious: queuePrevious(queue) !== undefined,
        next: () => {
            const next = queueNext(latest.current)
            if (next === undefined) return false
            commit(next)
            return true
        },
        previous: (position = 0) => {
            const before = queuePrevious(latest.current)
            if (position > RESTART_AFTER || before === undefined) return 'restart'
            commit(before)
            return 'moved'
        },
        ended: () => {
            const now = latest.current
            const next = queueEnded(now)
            if (next === undefined) return 'finished'
            commit(next)
            return next.at === now.at ? 'again' : 'moved'
        },
        play: (index) => commit(queuePlay(latest.current, index)),
        setShuffle: (shuffle, given = {}) => commit(queueShuffle(latest.current, shuffle, { random: random.current, ...given })),
        setRepeat: (repeat) => commit(queueRepeat(latest.current, repeat)),
        add: (added, where) => commit(queueAdd(latest.current, added, where)),
        remove: (indexes) => commit(queueRemove(latest.current, indexes)),
        move: (from, to) => commit(queueMove(latest.current, from, to)),
        load: (next, given = {}) => {
            if (given.seed !== undefined) random.current = seededRandom(given.seed)
            // Drawn from the hook's own generator, so a seeded queue shuffles the same way each time.
            const seed = given.shuffle === true && given.order === undefined ? Math.floor(random.current() * 4_294_967_296) : undefined
            commit(createQueue(next, { ...given, seed }))
        },
    }
}
