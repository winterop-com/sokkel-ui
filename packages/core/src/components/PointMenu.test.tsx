import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PointMenu, menuPoint, pointAnchor } from './PointMenu'

describe('menuPoint', () => {
    it('is where the pointer was', () => {
        expect(menuPoint({ clientX: 120, clientY: 48 })).toEqual({ x: 120, y: 48 })
    })

    it('opens a menu from the keyboard at the bottom-left corner of the element', () => {
        const element = {
            getBoundingClientRect: () => ({ x: 40, y: 10, width: 80, height: 24, top: 10, left: 40, right: 120, bottom: 34 }),
        }
        expect(menuPoint({ clientX: 0, clientY: 0, currentTarget: element })).toEqual({ x: 40, y: 34 })
    })
})

describe('pointAnchor', () => {
    it('is a box of no size at the point', () => {
        const box = pointAnchor({ x: 12, y: 30 }).getBoundingClientRect()
        expect([box.x, box.y, box.width, box.height]).toEqual([12, 30, 0, 0])
    })
})

describe('PointMenu', () => {
    it('draws nothing while shut', () => {
        expect(renderToStaticMarkup(<PointMenu at={null} onClose={() => undefined} items={[]} />)).toBe('')
    })
})
