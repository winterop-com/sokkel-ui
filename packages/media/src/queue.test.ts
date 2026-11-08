import { describe, expect, it } from 'vitest'

import {
    createQueue,
    nextRepeat,
    queueAdd,
    queueEnded,
    queueIndex,
    queueItem,
    queueMove,
    queueNext,
    queueOrdered,
    queuePlay,
    queuePrevious,
    queueRemove,
    queueRepeat,
    queueShuffle,
    seededRandom,
    shuffledOrder,
    type Queue,
} from './queue'

const ITEMS = ['a', 'b', 'c', 'd', 'e']

/** The items in the order they play. */
const played = (queue: Queue<string>) => queue.order.map((index) => queue.items[index]).join('')

describe('repeat', () => {
    it('steps from off to all to one and back', () => {
        expect(nextRepeat('off')).toBe('all')
        expect(nextRepeat('all')).toBe('one')
        expect(nextRepeat('one')).toBe('off')
    })
})

describe('a seeded shuffle', () => {
    it('gives the same run for the same seed, a string seed hashed', () => {
        const first = seededRandom('harbor')
        const second = seededRandom('harbor')
        const runs = [0, 1, 2, 3].map(() => [first(), second()])
        for (const [one, two] of runs) expect(one).toBe(two)
        expect(seededRandom('juniper')()).not.toBe(seededRandom('harbor')())
        for (const value of runs.flat()) expect(value >= 0 && value < 1).toBe(true)
    })

    it('puts the given item first and every other once after it', () => {
        const order = shuffledOrder(8, 5, seededRandom(7))
        expect(order[0]).toBe(5)
        expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
        expect(shuffledOrder(8, 5, seededRandom(7))).toEqual(order)
        expect(shuffledOrder(0, 0)).toEqual([])
        expect(shuffledOrder(3, 9, seededRandom(1))[0]).toBe(2)
    })
})

describe('a new queue', () => {
    it('plays the list in its own order from the start', () => {
        const queue = createQueue(ITEMS, { start: 2 })
        expect(queue.order).toEqual([0, 1, 2, 3, 4])
        expect(queueIndex(queue)).toBe(2)
        expect(queueItem(queue)).toBe('c')
    })

    it('shuffled, leads with the start and leaves the list alone', () => {
        const queue = createQueue(ITEMS, { start: 3, shuffle: true, seed: 'harbor' })
        expect(queue.at).toBe(0)
        expect(queueItem(queue)).toBe('d')
        expect(queue.items).toEqual(ITEMS)
        expect(createQueue(ITEMS, { start: 3, shuffle: true, seed: 'harbor' }).order).toEqual(queue.order)
    })

    it('takes an order given whole, and draws one in place of an order that is not', () => {
        const kept = createQueue(ITEMS, { order: [4, 2, 0, 1, 3], start: 0 })
        expect(kept.shuffle).toBe(true)
        expect(kept.at).toBe(2)
        expect(createQueue(ITEMS, { order: [0, 1, 2, 3, 4] }).shuffle).toBe(false)
        const broken = createQueue(ITEMS, { order: [0, 0, 1], shuffle: true, start: 1, seed: 1 })
        expect(broken.order).toHaveLength(5)
        expect(queueItem(broken)).toBe('b')
    })

    it('holds nothing when empty', () => {
        const queue = createQueue<string>([])
        expect(queue.at).toBe(-1)
        expect(queueItem(queue)).toBeUndefined()
        expect(queueNext(queue)).toBeUndefined()
        expect(queuePrevious(queue)).toBeUndefined()
        expect(queueEnded(queue)).toBeUndefined()
    })
})

describe('next, previous and the end of an item', () => {
    it('steps along the play order', () => {
        const queue = createQueue(ITEMS, { order: [2, 0, 4, 1, 3] })
        expect(queueItem(queueNext(queue)!)).toBe('a')
        expect(queueItem(queueNext(queueNext(queue)!)!)).toBe('e')
        expect(queueItem(queuePrevious(queueNext(queue)!)!)).toBe('c')
    })

    it('stops at the ends without repeat', () => {
        const last = createQueue(ITEMS, { start: 4 })
        expect(queueNext(last)).toBeUndefined()
        expect(queueEnded(last)).toBeUndefined()
        expect(queuePrevious(createQueue(ITEMS))).toBeUndefined()
    })

    it('goes round the order while it repeats all', () => {
        const last = createQueue(ITEMS, { start: 4, repeat: 'all' })
        expect(queueIndex(queueNext(last)!)).toBe(0)
        expect(queueIndex(queueEnded(last)!)).toBe(0)
        expect(queueIndex(queuePrevious(createQueue(ITEMS, { repeat: 'all' }))!)).toBe(4)
    })

    it('plays one item again at its end, but moves on at a press of next', () => {
        const queue = createQueue(ITEMS, { start: 1, repeat: 'one' })
        expect(queueEnded(queue)).toBe(queue)
        expect(queueIndex(queueNext(queue)!)).toBe(2)
        expect(queueIndex(queueNext(createQueue(ITEMS, { start: 4, repeat: 'one' }))!)).toBe(0)
    })

    it('jumps to an item where it stands in the play order', () => {
        const queue = createQueue(ITEMS, { order: [2, 0, 4, 1, 3] })
        const jumped = queuePlay(queue, 1)
        expect(jumped.at).toBe(3)
        expect(queueItem(queueNext(jumped)!)).toBe('d')
        expect(queuePlay(queue, 9)).toBe(queue)
    })
})

describe('shuffle and repeat changed while playing', () => {
    it('keeps the current item and puts it first when shuffled', () => {
        const queue = queueShuffle(createQueue(ITEMS, { start: 3 }), true, { seed: 4 })
        expect(queue.at).toBe(0)
        expect(queueItem(queue)).toBe('d')
        expect(queue.items).toEqual(ITEMS)
    })

    it('carries on from the item in the list once unshuffled', () => {
        const shuffled = createQueue(ITEMS, { order: [2, 0, 4, 1, 3], start: 4 })
        const back = queueShuffle(shuffled, false)
        expect(back.order).toEqual([0, 1, 2, 3, 4])
        expect(queueItem(back)).toBe('e')
        expect(back.at).toBe(4)
    })

    it('takes a shuffled order given whole', () => {
        const queue = queueShuffle(createQueue(ITEMS, { start: 1 }), true, { order: [3, 1, 0, 2, 4] })
        expect(queue.at).toBe(1)
        expect(queueItem(queue)).toBe('b')
    })

    it('changes how it repeats and nothing else', () => {
        const queue = createQueue(ITEMS)
        expect(queueRepeat(queue, 'off')).toBe(queue)
        expect(queueRepeat(queue, 'all')).toEqual({ ...queue, repeat: 'all' })
    })
})

describe('adding', () => {
    it('in order, puts items after the current one or at the end', () => {
        const queue = createQueue(ITEMS, { start: 1 })
        const next = queueAdd(queue, ['x', 'y'], 'next')
        expect(next.items.join('')).toBe('abxycde')
        expect(queueItem(next)).toBe('b')
        expect(queueItem(queueNext(next)!)).toBe('x')
        expect(queueAdd(queue, ['x']).items.join('')).toBe('abcdex')
        expect(queueAdd(queue, [])).toBe(queue)
    })

    it('shuffled, plays the added next or last, keeping the current item', () => {
        const queue = createQueue(ITEMS, { order: [2, 0, 4, 1, 3], start: 0 })
        const next = queueAdd(queue, ['x'], 'next')
        expect(next.items.join('')).toBe('axbcde')
        expect(played(next)).toBe('caxebd')
        expect(queueItem(next)).toBe('a')
        const last = queueAdd(queue, ['x'])
        expect(played(last)).toBe('caebdx')
        expect(queueItem(last)).toBe('a')
    })

    it('starts an empty queue on the first added', () => {
        const queue = queueAdd(createQueue<string>([]), ['x', 'y'])
        expect(queue.at).toBe(0)
        expect(queueItem(queue)).toBe('x')
    })
})

describe('removing', () => {
    it('keeps the current item current', () => {
        const queue = queueRemove(createQueue(ITEMS, { start: 3 }), [0, 4])
        expect(queue.items.join('')).toBe('bcd')
        expect(queueItem(queue)).toBe('d')
        expect(queue.order).toEqual([0, 1, 2])
    })

    it('moves on to the next in the play order when the current item goes', () => {
        const queue = createQueue(ITEMS, { order: [2, 0, 4, 1, 3], start: 0 })
        const removed = queueRemove(queue, 0)
        expect(played(removed)).toBe('cebd')
        expect(queueItem(removed)).toBe('e')
        const lastGone = queueRemove(createQueue(ITEMS, { start: 4 }), 4)
        expect(queueItem(lastGone)).toBe('d')
    })

    it('holds nothing once everything goes, and ignores indexes it does not have', () => {
        const queue = createQueue(ITEMS)
        expect(queueRemove(queue, [0, 1, 2, 3, 4]).at).toBe(-1)
        expect(queueRemove(queue, 9)).toBe(queue)
    })
})

describe('moving', () => {
    it('in order, moves the list with the play order', () => {
        const queue = queueMove(createQueue(ITEMS, { start: 2 }), 4, 1)
        expect(queue.items.join('')).toBe('aebcd')
        expect(queueItem(queue)).toBe('c')
        expect(queue.at).toBe(3)
    })

    it('shuffled, moves only the play order', () => {
        const queue = createQueue(ITEMS, { order: [2, 0, 4, 1, 3], start: 0 })
        const moved = queueMove(queue, 4, 2)
        expect(moved.items).toEqual(ITEMS)
        expect(played(moved)).toBe('cadeb')
        expect(queueItem(moved)).toBe('a')
    })

    it('moves the current item too, keeping it current', () => {
        const queue = queueMove(createQueue(ITEMS, { start: 0 }), 0, 3)
        expect(queue.items.join('')).toBe('bcdae')
        expect(queueItem(queue)).toBe('a')
        expect(queueMove(queue, 1, 9)).toBe(queue)
    })

    it('lists what plays with its place in the list and in the order', () => {
        const queue = createQueue(ITEMS, { order: [2, 0, 4, 1, 3], start: 0 })
        expect(queueOrdered(queue).slice(queue.at + 1)).toEqual([
            { item: 'e', index: 4, position: 2 },
            { item: 'b', index: 1, position: 3 },
            { item: 'd', index: 3, position: 4 },
        ])
    })
})
