import type { Map as MapLibreMap } from 'maplibre-gl'
import { describe, expect, test } from 'vitest'

import { fromOrigin, GlLayer, relativeMesh } from './effects'

/** A WebGL2 context that hands out numbered objects and writes down which it deletes. */
function fakeGl() {
    let next = 0
    const deleted: string[] = []
    const made = (kind: string) => () => ({ kind, id: (next += 1) })
    const gl = {
        ARRAY_BUFFER: 1,
        ELEMENT_ARRAY_BUFFER: 2,
        FLOAT: 3,
        createVertexArray: made('vao'),
        createBuffer: made('buffer'),
        bindVertexArray: () => undefined,
        bindBuffer: () => undefined,
        enableVertexAttribArray: () => undefined,
        vertexAttribPointer: () => undefined,
        deleteVertexArray: (held: { kind: string; id: number }) => deleted.push(`${held.kind} ${String(held.id)}`),
        deleteBuffer: (held: { kind: string; id: number }) => deleted.push(`${held.kind} ${String(held.id)}`),
        deleteProgram: () => undefined,
    }
    return { gl: gl as unknown as WebGL2RenderingContext, deleted }
}

const PROGRAM = { vertex: '', fragment: '', attributes: [['a_pos', 2]] as const }
const MAP = {} as MapLibreMap

describe('a custom layer', () => {
    test('added again without being removed deletes what it held first', () => {
        const { gl, deleted } = fakeGl()
        const layer = new GlLayer('sweep', PROGRAM, () => undefined)
        layer.onAdd(MAP, gl)
        layer.onAdd(MAP, gl)
        expect(deleted).toEqual(['vao 1', 'buffer 2', 'buffer 3'])
        layer.onRemove()
        layer.onRemove()
        expect(deleted).toEqual(['vao 1', 'buffer 2', 'buffer 3', 'vao 4', 'buffer 5', 'buffer 6'])
    })
})

describe('a relative mesh', () => {
    test('stores positions as offsets from the middle of their extent, other attributes as given', () => {
        const mesh = relativeMesh([0.5, 0.25, 7, 0.5000001, 0.2500001, 8], 3, [0], [0, 1, 0])
        expect(mesh.origin[0]).toBeCloseTo(0.50000005, 12)
        expect(mesh.vertices[0]).toBeLessThan(0)
        expect(mesh.vertices[3]).toBeGreaterThan(0)
        expect([mesh.vertices[2], mesh.vertices[5]]).toEqual([7, 8])
    })

    test('is moved to its origin by its matrix, in full precision', () => {
        const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
        expect(Array.from(fromOrigin(identity, [0.5, 0.25]).slice(12))).toEqual([0.5, 0.25, 0, 1])
    })
})
