import { describe, expect, test } from 'vitest'

import { graphNodeSize, NODE_MAX_WIDTH, NODE_MIN_WIDTH } from './GraphNode'
import {
    edgePath,
    elkOptions,
    GRAPH_SPACING,
    layoutGraph,
    setElkEngine,
    polylinePath,
    rankLayout,
    roughRoute,
    shapeSignature,
    splinePath,
    toElk,
    type GraphShape,
} from './layout'
import { miniGraphShape, placeMiniGraph, MINI_NODE } from './MiniGraph'
import type { Measure } from './measure'

const box = (id: string) => ({ id, width: 100, height: 40 })
const edge = (source: string, target: string) => ({ id: `${source}->${target}`, source, target })

const PIPELINE: GraphShape = {
    nodes: [box('fetch'), box('transform'), box('validate'), box('upload'), box('notify')],
    edges: [edge('fetch', 'transform'), edge('transform', 'validate'), edge('validate', 'upload'), edge('validate', 'notify')],
}

/** Ten pixels a character, in every face. */
const tens: Measure = (text) => text.length * 10

describe('routing and spacing', () => {
    test('asks elk for the routing and the gaps of the spacing given', () => {
        expect(elkOptions('right')['elk.edgeRouting']).toBe('ORTHOGONAL')
        expect(elkOptions('right', { routing: 'polyline' })['elk.edgeRouting']).toBe('POLYLINE')
        expect(elkOptions('right', { routing: 'splines' })['elk.edgeRouting']).toBe('SPLINES')
        const roomy = toElk(PIPELINE, 'down', { spacing: 'roomy' }).layoutOptions
        expect(roomy['elk.layered.spacing.nodeNodeBetweenLayers']).toBe(String(GRAPH_SPACING.roomy.rank))
        expect(roomy['elk.spacing.nodeNode']).toBe(String(GRAPH_SPACING.roomy.node))
    })

    test('the rank layout keeps the gaps of its spacing', () => {
        const gapAfterFetch = (spacing: 'compact' | 'normal' | 'roomy') => {
            const placed = new Map(rankLayout(PIPELINE, 'right', spacing).nodes.map((node) => [node.id, node]))
            return (placed.get('transform')?.x ?? 0) - 100
        }
        expect(gapAfterFetch('compact')).toBe(GRAPH_SPACING.compact.rank)
        expect(gapAfterFetch('normal')).toBe(GRAPH_SPACING.normal.rank)
        expect(gapAfterFetch('roomy')).toBe(GRAPH_SPACING.roomy.rank)
    })

    test('a signature changes with the routing and the spacing', () => {
        const plain = shapeSignature(PIPELINE, 'right')
        expect(shapeSignature(PIPELINE, 'right', { routing: 'orthogonal', spacing: 'normal' })).toBe(plain)
        expect(shapeSignature(PIPELINE, 'right', { routing: 'splines' })).not.toBe(plain)
        expect(shapeSignature(PIPELINE, 'right', { spacing: 'compact' })).not.toBe(plain)
    })

    test('elk itself routes in each routing, and roomy spreads the ranks wider than compact', async () => {
        for (const routing of ['orthogonal', 'polyline', 'splines'] as const) {
            const placed = await layoutGraph(PIPELINE, 'right', undefined, { routing })
            expect(placed.edges.every((each) => (each.points?.length ?? 0) >= 2)).toBe(true)
        }
        const right = async (spacing: 'compact' | 'roomy') =>
            Math.max(...(await layoutGraph(PIPELINE, 'right', undefined, { spacing })).nodes.map((node) => node.x))
        expect(await right('roomy')).toBeGreaterThan(await right('compact'))
    })
})

describe('edge paths', () => {
    const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
        { x: 30, y: 20 },
    ]

    test('a polyline is straight runs, an orthogonal route turns its corners', () => {
        expect(polylinePath(points)).toBe('M 0 0 L 10 0 L 10 20 L 30 20')
        expect(edgePath(points, 'polyline')).toBe(polylinePath(points))
        expect(edgePath(points)).toContain('Q')
    })

    test("a spline reads elk's runs of three points as cubic curves, and curves through any other run", () => {
        expect(splinePath(points)).toBe('M 0 0 C 10 0 10 20 30 20')
        const five = [...points, { x: 40, y: 40 }]
        expect(splinePath(five).match(/C/g)).toHaveLength(4)
        expect(splinePath(points.slice(0, 2))).toBe('M 0 0 L 10 0')
        expect(splinePath([])).toBe('')
    })

    test('a rough route leaves the far side of the source and arrives at the near side of the target', () => {
        const source = { x: 0, y: 0, width: 20, height: 10 }
        const target = { x: 40, y: 30, width: 20, height: 10 }
        expect(roughRoute(source, target, 'right', 'polyline')).toEqual([
            { x: 20, y: 5 },
            { x: 40, y: 35 },
        ])
        expect(roughRoute(source, target, 'right')).toEqual([
            { x: 20, y: 5 },
            { x: 30, y: 5 },
            { x: 30, y: 35 },
            { x: 40, y: 35 },
        ])
        expect(roughRoute(source, target, 'down')[0]).toEqual({ x: 10, y: 10 })
        expect(roughRoute(source, target, 'down').at(-1)).toEqual({ x: 50, y: 30 })
    })
})

describe('node width from words', () => {
    test('sizes a box from its words between the default bounds', () => {
        expect(graphNodeSize({ code: 'ab' }, tens).width).toBe(NODE_MIN_WIDTH)
        expect(graphNodeSize({ code: 'fetch-inventory' }, tens).width).toBe(150 + 22)
        expect(graphNodeSize({ code: 'x'.repeat(60) }, tens).width).toBe(NODE_MAX_WIDTH)
    })

    test('holds to the bounds it is given, and draws every box at one width when they meet', () => {
        const long = { code: 'x'.repeat(60) }
        expect(graphNodeSize(long, tens, { max: 360 }).width).toBe(360)
        expect(graphNodeSize({ code: 'ab' }, tens, { min: 140 }).width).toBe(140)
        expect(graphNodeSize({ code: 'ab' }, tens, { min: 160, max: 160 }).width).toBe(160)
        expect(graphNodeSize(long, tens, { min: 160, max: 160 }).width).toBe(160)
    })
})

describe('the elk an app sets', () => {
    test('places every graph after it is set, and the bundled one again once cleared', async () => {
        let asked = 0
        setElkEngine(() => ({
            layout: (graph: { children: { id: string }[] }) => {
                asked += 1
                return Promise.resolve({ children: graph.children.map((child, index) => ({ id: child.id, x: index * 10, y: 0 })) })
            },
        }))
        try {
            const placed = await layoutGraph({ nodes: [box('a'), box('b')], edges: [] })
            expect(asked).toBe(1)
            expect(placed.nodes.map((node) => node.x)).toEqual([0, 10])
        } finally {
            setElkEngine(null)
        }
    })
})

describe('the mini graph', () => {
    test('a box of one size per step, and one edge per need it knows', () => {
        const shape = miniGraphShape([
            { code: 'fetch', needs: [] },
            { code: 'transform', needs: ['fetch', 'fetch', 'missing'] },
            { code: 'upload', needs: ['transform', 'upload'] },
        ])
        expect(shape.nodes.every((node) => node.width === MINI_NODE.width && node.height === MINI_NODE.height)).toBe(true)
        expect(shape.edges.map((each) => each.id)).toEqual(['fetch->transform', 'transform->upload'])
    })

    test('reduced, an edge another path implies is left out', () => {
        const steps = [
            { code: 'fetch', needs: [] },
            { code: 'split', needs: ['fetch'] },
            { code: 'transform', needs: ['split'] },
            { code: 'notify', needs: ['fetch', 'split', 'transform'] },
            { code: 'audit', needs: ['fetch'] },
        ]
        expect(miniGraphShape(steps).edges).toHaveLength(6)
        expect(miniGraphShape(steps, true).edges.map((each) => each.id)).toEqual([
            'fetch->split',
            'split->transform',
            'transform->notify',
            'fetch->audit',
        ])
    })

    test('asks elk once for many graphs of one shape', async () => {
        let asked = 0
        const fake = {
            layout: (graph: { children: { id: string }[] }) => {
                asked += 1
                return Promise.resolve({ children: graph.children.map((child, index) => ({ id: child.id, x: index * 40, y: 0 })) })
            },
        }
        const shape = miniGraphShape([
            { code: 'fetch', needs: [] },
            { code: 'validate', needs: ['fetch'] },
            { code: 'notify', needs: ['validate'] },
        ])
        const all = await Promise.all([1, 2, 3].map(() => placeMiniGraph(shape, 'right', 'splines', fake)))
        await placeMiniGraph(shape, 'right', 'splines', fake)
        expect(asked).toBe(1)
        expect(all[2]?.nodes.map((node) => node.x)).toEqual([0, 40, 80])
    })
})
