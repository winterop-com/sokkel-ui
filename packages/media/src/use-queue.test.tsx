import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { QueueOptions } from './queue'
import { useQueue, type QueueControls } from './use-queue'

const ITEMS = ['a', 'b', 'c', 'd', 'e']

/** The controls `useQueue` gives on its first draw. */
function controls(options: QueueOptions): QueueControls<string> {
    let seen: QueueControls<string> | undefined
    function Probe() {
        seen = useQueue(ITEMS, options)
        return null
    }
    renderToStaticMarkup(<Probe />)
    if (seen === undefined) throw new Error('useQueue was not drawn')
    return seen
}

describe('useQueue at the ends of the order', () => {
    it('repeating one, starts the first item again on previous and goes round on next from the last', () => {
        const first = controls({ repeat: 'one' })
        expect(first.hasPrevious).toBe(false)
        expect(first.previous(0)).toBe('restart')
        expect(controls({ start: 4, repeat: 'one' }).hasNext).toBe(true)
    })

    it('repeating all, goes round both ways; repeating none, neither', () => {
        expect(controls({ repeat: 'all' }).hasPrevious).toBe(true)
        expect(controls({ start: 4, repeat: 'all' }).hasNext).toBe(true)
        const off = controls({})
        expect(off.hasPrevious).toBe(false)
        expect(off.previous(0)).toBe('restart')
        expect(controls({ start: 4 }).hasNext).toBe(false)
    })
})
