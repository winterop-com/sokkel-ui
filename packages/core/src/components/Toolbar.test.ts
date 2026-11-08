import { describe, expect, it } from 'vitest'

import { toolbarSplit } from './Toolbar'

const ITEMS = ['run', 'export', 'share', 'archive']

describe('toolbarSplit', () => {
    it('keeps every tool in the row when all fit, with no More', () => {
        // 60 + 8 + 70 + 8 + 50 + 8 + 80 = 284.
        expect(toolbarSplit(ITEMS, [60, 70, 50, 80], 284, 8, 28)).toEqual({ inline: ITEMS, overflow: [] })
    })

    it('moves the tools past the room into More, in order, keeping room for More', () => {
        // 28 for More, then 8 + 60 + 8 + 70 = 174; the third would need 232.
        expect(toolbarSplit(ITEMS, [60, 70, 50, 80], 200, 8, 28)).toEqual({ inline: ['run', 'export'], overflow: ['share', 'archive'] })
    })

    it('never skips a tool that does not fit to show a later one that would', () => {
        expect(toolbarSplit(ITEMS, [60, 200, 10, 10], 120, 8, 28)).toEqual({ inline: ['run'], overflow: ['export', 'share', 'archive'] })
    })

    it('moves every tool into More when only More fits', () => {
        expect(toolbarSplit(ITEMS, [60, 70, 50, 80], 40, 8, 28)).toEqual({ inline: [], overflow: ITEMS })
    })

    it('reads no width past the tools it is given', () => {
        expect(toolbarSplit(['run'], [60, 500], 70, 8, 28)).toEqual({ inline: ['run'], overflow: [] })
    })
})
