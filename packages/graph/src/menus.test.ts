import { describe, expect, test } from 'vitest'

import { graphMenu } from './GraphCanvas'

const RUN = { id: 'run', label: 'Run from here', onSelect: () => undefined }

describe("a canvas's menu", () => {
    test('takes the rows alone or with a head', () => {
        expect(graphMenu([RUN])).toEqual({ items: [RUN] })
        expect(graphMenu({ head: 'validate', items: [RUN] })).toEqual({ head: 'validate', items: [RUN] })
    })

    test('opens for no rows, leaving the browser its own menu', () => {
        expect(graphMenu(null)).toBeNull()
        expect(graphMenu([])).toBeNull()
        expect(graphMenu({ head: 'validate', items: [] })).toBeNull()
    })
})
