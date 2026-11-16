import { describe, expect, it, vi } from 'vitest'

import { hasBox, linkHandler } from './host'

/** A box as far as a fit reads one: the boxes it is laid out in, and its width. */
const box = (rects: number, clientWidth: number) => ({ getClientRects: () => ({ length: rects }) as DOMRectList, clientWidth })

describe('a terminal host', () => {
    it('has a box to fit to only while it is laid out with a width', () => {
        expect(hasBox(box(1, 640))).toBe(true)
        expect(hasBox(box(0, 0))).toBe(false)
        expect(hasBox(box(1, 0))).toBe(false)
    })

    it('opens a link the program marked through the same call as the links in the text', () => {
        const open = vi.fn()
        const event = { button: 0 } as MouseEvent
        linkHandler(open).activate(event, 'https://ci.example.org/runs/nightly-export', {
            start: { x: 1, y: 1 },
            end: { x: 10, y: 1 },
        })
        expect(open).toHaveBeenCalledWith('https://ci.example.org/runs/nightly-export', event)
    })
})
