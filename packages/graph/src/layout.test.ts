import { describe, expect, test } from 'vitest'

import {
    FIT_MAX_ZOOM,
    FIT_MIN_ZOOM,
    NARROW_FIT_MIN_ZOOM,
    fittedHeight,
    fittedZoom,
    fromElk,
    layoutGraph,
    layoutNetwork,
    MAX_ZOOM,
    MIN_ZOOM,
    rankLayout,
    ranksOf,
    shapeSignature,
    spiralLayout,
    startOfOverflow,
    steppedZoom,
    toElk,
    wheelZoomFactor,
    type ElkEngine,
    type GraphShape,
} from './layout'

const box = (id: string) => ({ id, width: 100, height: 40 })
const edge = (source: string, target: string) => ({ id: `${source}->${target}`, source, target })

const PIPELINE: GraphShape = {
    nodes: [box('fetch'), box('transform'), box('validate'), box('upload'), box('notify')],
    edges: [edge('fetch', 'transform'), edge('transform', 'validate'), edge('validate', 'upload'), edge('validate', 'notify')],
}

describe('the rank layout', () => {
    test('ranks a node one past the deepest node it comes after', () => {
        expect(Object.fromEntries(ranksOf(PIPELINE))).toEqual({ fetch: 0, transform: 1, validate: 2, upload: 3, notify: 3 })
    })

    test('leaves out an edge that closes a cycle rather than walking it forever', () => {
        const loop: GraphShape = {
            nodes: [box('queued'), box('running'), box('failed')],
            edges: [edge('queued', 'running'), edge('running', 'failed'), edge('failed', 'queued')],
        }
        expect(Object.fromEntries(ranksOf(loop))).toEqual({ queued: 0, running: 1, failed: 2 })
    })

    test('places each rank right of the one before, and stacks a rank down the canvas', () => {
        const placed = new Map(rankLayout(PIPELINE).nodes.map((node) => [node.id, node]))
        expect(placed.get('transform')?.x).toBeGreaterThan((placed.get('fetch')?.x ?? 0) + 100)
        expect(placed.get('upload')?.x).toBe(placed.get('notify')?.x)
        expect(placed.get('notify')?.y).toBeGreaterThan(placed.get('upload')?.y ?? 0)
    })

    test('drawn down, ranks run down the canvas instead', () => {
        const placed = new Map(rankLayout(PIPELINE, 'down').nodes.map((node) => [node.id, node]))
        expect(placed.get('transform')?.y).toBeGreaterThan((placed.get('fetch')?.y ?? 0) + 40)
        expect(placed.get('upload')?.y).toBe(placed.get('notify')?.y)
    })

    test('drops an edge to a node the shape does not carry', () => {
        const shape: GraphShape = { nodes: [box('fetch')], edges: [edge('fetch', 'missing')] }
        expect(rankLayout(shape).edges).toEqual([])
        expect(toElk(shape).edges).toEqual([])
    })
})

describe('the elk conversation', () => {
    test('asks for a layered layout in the direction given, with every label carrying words', () => {
        const shape: GraphShape = {
            nodes: [box('a'), box('b')],
            edges: [{ ...edge('a', 'b'), label: { text: '', width: 30, height: 17 } }],
        }
        const graph = toElk(shape, 'down')
        expect(graph.layoutOptions['elk.direction']).toBe('DOWN')
        expect(graph.edges[0]?.labels?.[0]?.text).toBe(' ')
    })

    test('reads routes and label centers back, and keeps a node elk did not place', () => {
        const shape: GraphShape = {
            nodes: [box('a'), box('b')],
            edges: [{ ...edge('a', 'b'), label: { text: 'go', width: 30, height: 10 } }],
        }
        const placed = fromElk(shape, {
            children: [{ id: 'a', x: 12, y: 12 }],
            edges: [
                {
                    id: 'a->b',
                    sections: [{ startPoint: { x: 112, y: 32 }, bendPoints: [{ x: 130, y: 32 }], endPoint: { x: 150, y: 32 } }],
                    labels: [{ x: 115, y: 35, width: 30, height: 10 }],
                },
            ],
        })
        expect(placed.nodes.map((node) => [node.id, node.x, node.y])).toEqual([
            ['a', 12, 12],
            ['b', 0, 0],
        ])
        expect(placed.edges[0]?.points).toHaveLength(3)
        expect(placed.edges[0]?.labelAt).toEqual({ x: 130, y: 40 })
    })

    test('places a graph with the engine it is given, and an empty one without asking', async () => {
        let asked = 0
        const fake: ElkEngine = {
            layout: (graph) => {
                asked += 1
                return Promise.resolve({ children: graph.children.map((child, index) => ({ id: child.id, x: index * 200, y: 0 })) })
            },
        }
        expect((await layoutGraph(PIPELINE, 'right', fake)).nodes.map((node) => node.x)).toEqual([0, 200, 400, 600, 800])
        expect(await layoutGraph({ nodes: [], edges: [] }, 'right', fake)).toEqual({ nodes: [], edges: [] })
        expect(asked).toBe(1)
    })

    test('places a real graph left to right with elk itself', async () => {
        const placed = new Map((await layoutGraph(PIPELINE)).nodes.map((node) => [node.id, node]))
        expect(placed.get('transform')?.x).toBeGreaterThan(placed.get('fetch')?.x ?? 0)
        expect(placed.get('upload')?.x).toBeGreaterThan(placed.get('validate')?.x ?? 0)
    })

    test('a signature changes with the shape and the direction, and not with anything else', () => {
        expect(shapeSignature(PIPELINE, 'right')).toBe(shapeSignature({ ...PIPELINE, nodes: [...PIPELINE.nodes] }, 'right'))
        expect(shapeSignature(PIPELINE, 'right')).not.toBe(shapeSignature(PIPELINE, 'down'))
        expect(shapeSignature(PIPELINE, 'right')).not.toBe(
            shapeSignature({ ...PIPELINE, nodes: [{ ...box('fetch'), width: 120 }, ...PIPELINE.nodes.slice(1)] }, 'right'),
        )
    })
})

describe('the fit', () => {
    test('holds a fit between its two bounds', () => {
        expect(fittedZoom(3)).toBe(FIT_MAX_ZOOM)
        expect(fittedZoom(0.1)).toBe(FIT_MIN_ZOOM)
        expect(fittedZoom(0.9)).toBe(0.9)
    })

    test('a fitted frame is the drawing at its fit zoom with ground around it, and never a sliver', () => {
        expect(fittedHeight({ width: 400, height: 100 }, 1000)).toBe(140)
        // A tall drawing keeps the same ground, not a share of its height.
        expect(fittedHeight({ width: 400, height: 3000 }, 1000)).toBe(3040)
        expect(fittedHeight({ width: 0, height: 0 }, 1000)).toBe(120)
        expect(fittedHeight({ width: 4000, height: 400 }, 800)).toBe(400 * FIT_MIN_ZOOM + 40)
    })

    test("a fitted frame is sized at the fit's own floor: the view's least zoom, or a narrow canvas's", () => {
        expect(fittedHeight({ width: 4000, height: 400 }, 800, 0.8)).toBe(400 * 0.8 + 40)
        expect(fittedHeight({ width: 4000, height: 400 }, 400, 0.8, false)).toBe(400 * 0.8 + 40)
        expect(fittedHeight({ width: 4000, height: 400 }, 400, 0.8)).toBe(400 * NARROW_FIT_MIN_ZOOM + 40)
    })

    test('hangs what does not fit off the far edge with its start in view, and leaves what fits centered', () => {
        const view = { x: -200, y: 100, zoom: 0.75 }
        const placed = startOfOverflow(view, { x: 0, y: 0, width: 2000, height: 200 }, { width: 800, height: 600 })
        expect(placed).toEqual({ x: 24, y: 100, zoom: 0.75 })
    })

    test('a zoom step and a wheel stay inside their bounds', () => {
        expect(steppedZoom(MAX_ZOOM, 'in')).toBe(MAX_ZOOM)
        expect(steppedZoom(MIN_ZOOM, 'out')).toBe(MIN_ZOOM)
        expect(wheelZoomFactor(-1000)).toBeCloseTo(1.15)
        expect(wheelZoomFactor(1, 1)).toBeLessThan(1)
    })
})

describe('a network', () => {
    const NETWORK: GraphShape = {
        nodes: [box('lone'), box('hub'), box('a'), box('b'), box('c')],
        edges: [edge('hub', 'a'), edge('hub', 'b'), edge('hub', 'c'), edge('a', 'b')],
    }

    test('is placed at once along a spiral, the node with the most edges in the middle', () => {
        const placed = spiralLayout(NETWORK)
        expect(placed.nodes.map((node) => node.id)).toEqual(['lone', 'hub', 'a', 'b', 'c'])
        expect(placed.nodes[1]).toMatchObject({ x: 0, y: 0 })
        expect(new Set(placed.nodes.map((node) => `${String(node.x)},${String(node.y)}`)).size).toBe(5)
    })

    test('is laid out by elk with straight edges, an engine handed in', async () => {
        const fake: ElkEngine = {
            layout: (graph) => {
                expect(graph.layoutOptions['elk.algorithm']).toBe('stress')
                return Promise.resolve({
                    children: graph.children.map((child, index) => ({ id: child.id, x: index * 10, y: 5 })),
                    edges: graph.edges.map((one) => ({ id: one.id, sections: [{ startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } }] })),
                })
            },
        }
        const placed = await layoutNetwork(NETWORK, fake)
        expect(placed.nodes.map((node) => node.x)).toEqual([0, 10, 20, 30, 40])
        expect(placed.edges.every((one) => one.points === undefined)).toBe(true)
    })
})
