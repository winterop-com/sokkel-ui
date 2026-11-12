import { describe, expect, test } from 'vitest'

import { graphNodeSize, LINE_GAP, NODE_MAX_WIDTH, NODE_MIN_WIDTH } from './GraphNode'
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
    placedBounds,
    type GraphShape,
} from './layout'
import { wrapFor } from './GraphCanvas'
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

describe('wrapping', () => {
    const long: GraphShape = {
        nodes: Array.from({ length: 12 }, (_, at) => box(`s${String(at)}`)),
        edges: Array.from({ length: 11 }, (_, at) => edge(`s${String(at)}`, `s${String(at + 1)}`)),
    }

    test("keeps a graph in one row while elk's own layout fits the width, and cuts it into rows that fit when not", async () => {
        const flat = placedBounds(await layoutGraph(long, 'right'))
        const kept = await layoutGraph(long, 'right', undefined, { wrapWidth: Math.ceil(flat.width) + 1 })
        expect(placedBounds(kept).width).toBe(flat.width)
        const limit = Math.ceil(flat.width / 3)
        const cut = placedBounds(await layoutGraph(long, 'right', undefined, { wrapWidth: limit }))
        expect(cut.width).toBeLessThanOrEqual(limit)
        expect(cut.width).toBeGreaterThan(limit * 0.5)
        expect(cut.height).toBeGreaterThan(flat.height)
    })

    test('lays out again only when the width moves a step, or could cut the graph', () => {
        const at = (wrapWidth: number) => shapeSignature(long, 'right', { wrapWidth })
        expect(at(480)).toBe(at(481))
        expect(at(480)).not.toBe(at(720))
        expect(at(100_000)).toBe(at(200_000))
    })

    test('wraps to the room the canvas holds at the least zoom, in steps, beside a given width', () => {
        expect(wrapFor(1120, undefined, { width: 800, height: 400 })).toEqual({ wrapWidth: 1120 })
        expect(wrapFor(undefined, true, undefined)).toEqual({ wrapWidth: undefined })
        const room = wrapFor(1120, true, { width: 1000, height: 400 }, 0.8).wrapRoom
        expect(room).toEqual({ width: 912, height: 336 })
        expect(wrapFor(1120, true, { width: 1005, height: 395 }, 0.8).wrapRoom).toEqual(room)
        // A fit goes under its least zoom only for height, so tallFit gives the room height and never width.
        expect(wrapFor(1120, true, { width: 1000, height: 400 }, 0.8, { tallFit: 0.7 }).wrapRoom).toEqual({ width: 912, height: 432 })
        expect(wrapFor(1120, true, { width: 390, height: 400 }, 0.8).wrapRoom?.width).toBe(480)
        expect(wrapFor(1120, true, { width: 390, height: 400 }, 0.8, { narrowFit: false }).wrapRoom?.width).toBe(336)
    })

    test('keeps a graph whole when cutting it only adds height, and cuts one too wide for its room', async () => {
        const flat = placedBounds(await layoutGraph(long, 'right'))
        const short = await layoutGraph(long, 'right', undefined, { wrapRoom: { width: flat.width - 50, height: flat.height + 10 } })
        expect(placedBounds(short).width).toBe(flat.width)
        const tall = await layoutGraph(long, 'right', undefined, { wrapRoom: { width: flat.width / 3, height: flat.height * 6 } })
        expect(placedBounds(tall).width).toBeLessThan(flat.width)
    })

    test('a cut fits across its room, down to one column when the room holds no more', async () => {
        const fan: GraphShape = {
            nodes: ['fetch', 'transform', 'a', 'b', 'c', 'validate', 'upload', 'notify', 'done'].map(box),
            edges: [
                edge('fetch', 'transform'),
                ...['a', 'b', 'c'].flatMap((part) => [edge('transform', part), edge(part, 'validate')]),
                edge('validate', 'upload'),
                edge('upload', 'notify'),
                edge('notify', 'done'),
            ],
        }
        for (const shape of [long, fan]) {
            const one = placedBounds(await layoutGraph({ nodes: [shape.nodes[0]], edges: [] }, 'right'))
            for (const width of [one.width * 2.5, one.width * 4]) {
                const room = { width, height: placedBounds(await layoutGraph(shape, 'right')).height * 8 }
                const cut = await layoutGraph(shape, 'right', undefined, { wrapWidth: 1120, wrapRoom: room })
                expect(placedBounds(cut).width).toBeLessThanOrEqual(room.width)
            }
        }
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

    test('keeps the same size as a step runs, ends, and says its other words', () => {
        const queued = graphNodeSize({ code: 'reply', kind: 'email', status: 'queued', reserve: ['email · not sent'] }, tens)
        const done = graphNodeSize(
            { code: 'reply', kind: 'email · sent', status: 'succeeded', duration_ms: 1840, reserve: ['email · not sent'] },
            tens,
        )
        expect(done).toEqual(queued)
    })

    test('keeps room in a chip for its widest note, so a countdown moves nothing', () => {
        const chip = (note: string) =>
            graphNodeSize({ code: 'split', status: 'running', items: [{ id: 'west', label: 'west', note, reserve: 'retry in 99s' }] }, tens)
        expect(chip('retry in 9s')).toEqual(chip('retry in 12s'))
    })

    test('keeps room for the badges and the issue mark a box may come to wear', () => {
        const room = { reserveBadges: ['edited', 'not installed'], reserveIssue: true }
        const plain = graphNodeSize({ code: 'transform', ...room }, tens)
        const edited = graphNodeSize({ code: 'transform', ...room, badge: { label: 'not installed', tone: 'critical' } }, tens)
        const flagged = graphNodeSize({ code: 'transform', ...room, issues: [{ tone: 'critical' as const, text: 'needs a query' }] }, tens)
        expect(edited).toEqual(plain)
        expect(flagged).toEqual(plain)
        expect(graphNodeSize({ code: 'transform' }, tens).width).toBeLessThan(plain.width)
    })

    test('keeps room for a count and its glyph on the line it is placed on', () => {
        const Glyph = () => null
        const titled = graphNodeSize({ code: 'split', kind: 'python', count: '×4' }, tens)
        const glyphed = graphNodeSize({ code: 'split', kind: 'python', count: '×4', countIcon: Glyph }, tens)
        expect(glyphed.width).toBe(titled.width + 12 + 2)
        const short = graphNodeSize({ code: 'split', count: '×4' }, tens)
        const onLine = graphNodeSize({ code: 'split', count: '×4', countPlacement: 'line' }, tens)
        expect(short.height).toBe(30)
        expect(onLine.height).toBe(44)
        const wide = { code: 'split', kind: 'python', status: 'running', count: '64 items' }
        expect(graphNodeSize({ ...wide, countPlacement: 'line' }, tens).width).toBeGreaterThan(graphNodeSize(wide, tens).width)
    })

    test('counts the gap the code line is drawn with before a count placed on it', () => {
        // The class is a step of the spacing scale, a quarter of a rem (4px) each.
        expect(Number(LINE_GAP.className.replace('gap-', '')) * 4).toBe(LINE_GAP.px)
        const counted = { code: 'transform', kind: 'python-script', count: '×4', countPlacement: 'line' as const }
        expect(graphNodeSize(counted, tens).width).toBe(130 + LINE_GAP.px + 20 + 22)
        const timed = { ...counted, status: 'running', duration_ms: 1000 }
        expect(graphNodeSize(timed, tens).width).toBe(130 + LINE_GAP.px + 70 + 6 + 20 + 22)
    })

    test('grows a fan-out taller as its chips wrap, and wider only up to the strip', () => {
        const items = Array.from({ length: 12 }, (_, at) => ({ id: String(at), label: `region-${String(at)}`, status: 'succeeded' }))
        const one = graphNodeSize({ code: 'fetch', status: 'running', items: items.slice(0, 1) }, tens)
        const many = graphNodeSize({ code: 'fetch', status: 'running', items }, tens)
        expect(many.height).toBeGreaterThan(one.height)
        expect(many.width).toBeLessThanOrEqual(240 + 22)
        expect(graphNodeSize({ code: 'fetch', status: 'running', itemsSummary: '9 succeeded · 3 failed' }, tens).height).toBe(one.height)
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
