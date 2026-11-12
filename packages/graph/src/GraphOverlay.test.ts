import { describe, expect, it } from 'vitest'

import { placeOverlay } from './GraphOverlay'

const CANVAS = { width: 800, height: 500 }
const PICKER = { width: 280, height: 320 }

describe('placeOverlay', () => {
    it('opens below and to the right of a point, and turns where it would leave the canvas', () => {
        expect(placeOverlay({ kind: 'point', x: 100, y: 50 }, PICKER, CANVAS)).toMatchObject({ left: 108, top: 58 })
        expect(placeOverlay({ kind: 'point', x: 700, y: 400 }, PICKER, CANVAS)).toMatchObject({ left: 412, top: 72 })
    })

    it('opens below a box, lined up with its start', () => {
        const button = { kind: 'box' as const, x: 40, y: 20, width: 28, height: 28 }
        expect(placeOverlay(button, PICKER, CANVAS)).toEqual({ left: 40, top: 56, room: 436 })
    })

    it('opens above a box with no room below, never over it', () => {
        const button = { kind: 'box' as const, x: 740, y: 450, width: 28, height: 28 }
        const placed = placeOverlay(button, PICKER, CANVAS)
        expect(placed.top + PICKER.height).toBeLessThanOrEqual(button.y - 8)
        expect(placed.left).toBe(button.x + button.width - PICKER.width)
    })

    it('takes the side with more room when neither holds it, and holds its content to that room', () => {
        const button = { kind: 'box' as const, x: 40, y: 150, width: 28, height: 28 }
        const placed = placeOverlay(button, { width: 280, height: 400 }, CANVAS)
        expect(placed.top).toBe(186)
        expect(placed.room).toBe(306)
    })

    it('opens below a button above the canvas, inside the canvas', () => {
        const head = { kind: 'box' as const, x: 600, y: -36, width: 28, height: 28 }
        expect(placeOverlay(head, PICKER, CANVAS)).toMatchObject({ left: 348, top: 8 })
    })

    it('stands in the middle of the canvas for its center', () => {
        expect(placeOverlay({ kind: 'center' }, PICKER, CANVAS)).toMatchObject({ left: 260, top: 90 })
    })
})
