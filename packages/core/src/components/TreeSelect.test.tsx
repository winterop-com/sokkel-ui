import { describe, expect, it } from 'vitest'

import { TREE_SELECT_WORDS } from './TreeSelect'

describe("a tree select's words", () => {
    it('hold only what it says: its tree has no row actions', () => {
        expect('actions' in TREE_SELECT_WORDS).toBe(false)
        expect(TREE_SELECT_WORDS.selected(1200)).toBe('1,200 chosen')
    })
})
