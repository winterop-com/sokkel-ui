import type { ExpressionSpecification } from 'maplibre-gl'
import { describe, expect, test } from 'vitest'

import type { PixelBox, RenderedPoint } from './layer'
import { placeNames, pointFill, pointLabelBox, pointRadius, radiusOf } from './PointLayer'

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

    test('reckons the radius the map draws a value at, for what is written beside the point', () => {
        expect(radiusOf(undefined, 5, 40)).toBe(5)
        const size = { value: 'count', domain: [0, 100] as [number, number] }
        expect(radiusOf(size, 5, 0)).toBe(3)
        expect(radiusOf(size, 5, 25)).toBe(8.5)
        expect(radiusOf(size, 5, 100)).toBe(14)
        expect(radiusOf(size, 5, 400)).toBe(14)
        expect(radiusOf(size, 5, 'many')).toBe(3)
        expect(radiusOf({ value: 'count', domain: [100, 0], range: [2, 20] }, 5, 100)).toBe(2)
        expect(radiusOf({ value: 'count', domain: [5, 5] }, 5, 5)).toBe(14)
    })
})

describe('coloring points', () => {
    const selected = ['boolean', ['feature-state', 'selected'], false]
    const highlighted = ['boolean', ['feature-state', 'highlighted'], false]

    const classes: ExpressionSpecification = ['match', ['get', '__class'], 0, 'pale', 1, 'deep', 'gray']

    test('fills a layer of one color in the selection and highlight colors where a point is either', () => {
        expect(pointFill('blue', 'amber', 'cyan', true)).toEqual(['case', selected, 'amber', highlighted, 'cyan', 'blue'])
    })

    test("keeps a scale's class colors where the ring carries the emphasis", () => {
        expect(pointFill(classes, 'amber', 'cyan', false)).toEqual(classes)
    })

    test('lays the selection and the highlight over the class colors of lights, which have no ring', () => {
        expect(pointFill(classes, 'amber', 'cyan', true)).toEqual(['case', selected, 'amber', highlighted, 'cyan', classes])
    })
})

const at = (key: string, x: number, y: number, text: string): RenderedPoint => ({ key, x, y, text })

describe('naming points', () => {
    const box = (point: RenderedPoint) => pointLabelBox(point, 10)
    const anywhere = () => true

    test('writes a name right of its point, as wide as its letters', () => {
        expect(pointLabelBox(at('oslo', 100, 50, 'Oslo'), 10)).toEqual([110, 42, 142, 58])
    })

    test('takes the names in the order given, and leaves out one that would crowd a name taken before it', () => {
        const points = [at('tokyo', 100, 100, 'Tokyo'), at('yokohama', 108, 104, 'Yokohama'), at('osaka', 100, 140, 'Osaka')]
        expect(placeNames(points, box, null, [], anywhere).map((point) => point.key)).toEqual(['tokyo', 'osaka'])
    })

    test('keeps room between two names on one line', () => {
        const near = [at('bergen', 100, 100, 'Bergen'), at('voss', 150, 100, 'Voss')]
        expect(placeNames(near, box, null, [], anywhere).map((point) => point.key)).toEqual(['bergen'])
        const apart = [at('bergen', 100, 100, 'Bergen'), at('voss', 200, 100, 'Voss')]
        expect(placeNames(apart, box, null, [], anywhere).map((point) => point.key)).toEqual(['bergen', 'voss'])
    })

    test("always writes the selected point's name, and first", () => {
        const points = [at('tokyo', 100, 100, 'Tokyo'), at('yokohama', 108, 104, 'Yokohama')]
        expect(placeNames(points, box, 'yokohama', [], anywhere).map((point) => point.key)).toEqual(['yokohama'])
    })

    test('keeps clear of what other layers wrote', () => {
        const taken: PixelBox[] = [[90, 90, 200, 110]]
        const points = [at('tokyo', 100, 100, 'Tokyo'), at('osaka', 100, 140, 'Osaka')]
        expect(placeNames(points, box, null, taken, anywhere).map((point) => point.key)).toEqual(['osaka'])
    })

    test("leaves out a name whose far end is off the ground, past a globe's rim", () => {
        const points = [at('lima', 100, 100, 'Lima'), at('quito', 300, 100, 'Quito')]
        const onGround = (x: number) => x < 200
        expect(placeNames(points, box, null, [], onGround).map((point) => point.key)).toEqual(['lima'])
        expect(placeNames(points, box, 'quito', [], onGround).map((point) => point.key)).toEqual(['quito', 'lima'])
    })
})
