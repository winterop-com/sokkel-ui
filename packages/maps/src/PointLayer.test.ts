import { describe, expect, test } from 'vitest'

import { pointRadius } from './PointLayer'

/** The stops of an interpolation, input then output. */
const stopsOf = (expression: unknown) => (Array.isArray(expression) ? expression.slice(3) : [])

describe('sizing points', () => {
    test('draws one radius without a size', () => {
        expect(pointRadius(undefined, 5)).toBe(5)
    })

    test('grows a point by the square root of its value across the domain', () => {
        expect(stopsOf(pointRadius({ value: 'count', domain: [0, 100] }, 5))).toEqual([0, 3, 10, 14])
        expect(stopsOf(pointRadius({ value: 'count', domain: [100, 0], range: [2, 20] }, 5))).toEqual([0, 20, 10, 2])
    })

    test('draws one radius where the domain has no width, as an interpolation needs rising stops', () => {
        expect(pointRadius({ value: 'count', domain: [5, 5] }, 5)).toBe(14)
        expect(pointRadius({ value: 'count', domain: [-4, -1], range: [2, 9] }, 5)).toBe(9)
    })
})
