import type { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { GraphPoint, GraphShape, LayoutNode, PlacedGraph } from './layout'

/** d3-force, the one force engine, loaded the first time a live layout is drawn. */
export type ForceEngine = Pick<
    typeof import('d3-force'),
    'forceSimulation' | 'forceLink' | 'forceManyBody' | 'forceCollide' | 'forceX' | 'forceY'
>

let engine: Promise<ForceEngine> | undefined

/** Loads d3-force once; a load that fails is tried again the next time. */
export function loadForce(): Promise<ForceEngine> {
    engine ??= import('d3-force').catch((error: unknown) => {
        engine = undefined
        throw error
    })
    return engine
}

/** One body in the simulation: a node by its id, held apart from the others by `radius`. */
export interface ForceBody extends SimulationNodeDatum {
    id: string
    radius: number
}

/** How long a link pulls toward, between the two bodies' middles. */
export const FORCE_LINK = 110

/** Ticks run at once before the first drawing, so it already shows the network's shape; the rest settle live. */
export const FORCE_WARM_TICKS = 150

/** The most ticks run at once with motion reduced, where the whole settling happens before it is drawn. */
const FORCE_MOST_TICKS = 600

/** How warm a drag keeps the simulation while a body is held, so the rest follow it. */
const DRAG_HEAT = 0.3

/**
 * A simulation of the bodies and their links, stopped: links pull linked bodies to `FORCE_LINK`
 * apart, every body pushes the others away, none overlaps another, and a weak pull toward the
 * middle keeps parts with no link between them in view. d3-force starts bodies with no place on a
 * spiral and jiggles them from a seeded source, so the same network settles the same way each time.
 */
export function forceSimulation(
    using: ForceEngine,
    bodies: ForceBody[],
    links: readonly { source: string; target: string }[],
): Simulation<ForceBody, SimulationLinkDatum<ForceBody>> {
    return using
        .forceSimulation(bodies)
        .force(
            'link',
            using
                .forceLink<ForceBody, SimulationLinkDatum<ForceBody>>(links.map((link) => ({ ...link })))
                .id((body) => body.id)
                .distance(FORCE_LINK),
        )
        .force('charge', using.forceManyBody<ForceBody>().strength(-380).distanceMax(600))
        .force(
            'collide',
            using.forceCollide<ForceBody>((body) => body.radius),
        )
        .force('x', using.forceX<ForceBody>(0).strength(0.07))
        .force('y', using.forceY<ForceBody>(0).strength(0.07))
        .alphaMin(0.004)
        .stop()
}

/** Ticks a simulation until it settles or `most` ticks have run. */
export function settle(simulation: Simulation<ForceBody, SimulationLinkDatum<ForceBody>>, most: number): void {
    for (let tick = 0; tick < most && simulation.alpha() >= simulation.alphaMin(); tick += 1) simulation.tick()
}

/** What a live layout hands back: where each node stands, and the hands that drag one. */
export interface ForceLayout {
    placed: PlacedGraph & { settled: boolean }
    /** A node was taken at its top-left corner `at`: it follows the pointer and the rest react. */
    grab: (id: string, at: GraphPoint) => void
    /** The held node is at `at`. */
    drag: (id: string, at: GraphPoint) => void
    /** The held node was let go, and the network settles again around it. */
    drop: (id: string) => void
}

/** Where each body's middle stands, read off the simulation, and whether it has settled. */
interface Frame {
    signature: string
    points: ReadonlyMap<string, GraphPoint> | null
    settled: boolean
}

/**
 * A network laid out by a live force simulation (d3-force, loaded on first use). `anchor` is the
 * point of a node the simulation moves, from its top-left corner, such as the middle of its dot;
 * `radius` how far the node keeps the others from that point. `rough` holds the first frame until
 * the engine is there, and stands for good if it cannot load. Most of the settling is run at once
 * and the rest is drawn as it goes, or all at once with motion reduced. A node dragged is held
 * where the pointer has it while the rest move around it, and let go to settle again; a network
 * that changes keeps the places of the nodes it had.
 */
export function useForceLayout(
    shape: GraphShape,
    signature: string,
    {
        enabled = true,
        anchor,
        radius,
        rough,
        reduced,
    }: {
        /** False asks nothing of the engine and moves nothing. */
        enabled?: boolean
        anchor: (node: LayoutNode) => GraphPoint
        radius: (node: LayoutNode) => number
        rough: () => PlacedGraph
        reduced: boolean
    },
): ForceLayout {
    const [frame, setFrame] = useState<Frame | null>(null)
    const live = useRef<{ simulation: Simulation<ForceBody, SimulationLinkDatum<ForceBody>>; bodies: Map<string, ForceBody> } | null>(null)
    const held = useRef<string | null>(null)
    const given = useRef({ shape, anchor, radius, reduced })
    given.current = { shape, anchor, radius, reduced }

    useEffect(() => {
        if (!enabled) return
        let current = true
        let made: Simulation<ForceBody, SimulationLinkDatum<ForceBody>> | undefined
        loadForce().then(
            (using) => {
                if (!current) return
                const { shape: now, radius: room, reduced: still } = given.current
                const before = live.current?.bodies
                const bodies = now.nodes.map((node): ForceBody => {
                    const was = before?.get(node.id)
                    return { id: node.id, radius: room(node), ...(was === undefined ? {} : { x: was.x, y: was.y }) }
                })
                const kept = bodies.some((body) => body.x !== undefined)
                made = forceSimulation(using, bodies, now.edges)
                // A network that changed starts from where it stood, cooler, so it moves only where it must.
                if (kept) made.alpha(0.3)
                settle(made, still ? FORCE_MOST_TICKS : kept ? 0 : FORCE_WARM_TICKS)
                const simulation = made
                live.current = { simulation, bodies: new Map(bodies.map((body) => [body.id, body])) }
                const publish = () =>
                    setFrame({
                        signature,
                        points: new Map(bodies.map((body) => [body.id, { x: body.x ?? 0, y: body.y ?? 0 }])),
                        settled: held.current === null && simulation.alpha() < simulation.alphaMin(),
                    })
                simulation.on('tick', publish).on('end', publish)
                publish()
                if (simulation.alpha() >= simulation.alphaMin()) simulation.restart()
            },
            () => {
                if (current) setFrame({ signature, points: null, settled: true })
            },
        )
        return () => {
            current = false
            made?.on('tick', null).on('end', null).stop()
        }
    }, [signature, enabled])

    // The spiral is a function of the signature alone.
    // oxlint-disable-next-line react/exhaustive-deps
    const spiral = useMemo(rough, [signature])
    const placed = useMemo(() => {
        const points = frame?.signature === signature ? frame.points : null
        if (points === null) return { ...spiral, settled: frame?.signature === signature }
        return {
            nodes: shape.nodes.map((node) => {
                const middle = points.get(node.id) ?? { x: 0, y: 0 }
                const at = anchor(node)
                return { ...node, x: middle.x - at.x, y: middle.y - at.y }
            }),
            edges: shape.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
            settled: frame?.settled ?? false,
        }
        // The anchor is read with the shape, which the signature stands for.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [frame, spiral, signature])

    /** Moves the held body's middle to the pointer's place. */
    const hold = useCallback((id: string, at: GraphPoint) => {
        const body = live.current?.bodies.get(id)
        const node = given.current.shape.nodes.find((each) => each.id === id)
        if (body === undefined || node === undefined) return
        const offset = given.current.anchor(node)
        body.fx = at.x + offset.x
        body.fy = at.y + offset.y
    }, [])
    const grab = useCallback(
        (id: string, at: GraphPoint) => {
            if (live.current === null) return
            held.current = id
            hold(id, at)
            live.current.simulation.alphaTarget(DRAG_HEAT).restart()
        },
        [hold],
    )
    const drag = useCallback(
        (id: string, at: GraphPoint) => {
            if (held.current !== id) return
            hold(id, at)
        },
        [hold],
    )
    const drop = useCallback((id: string) => {
        const current = live.current
        if (current === null || held.current !== id) return
        held.current = null
        const body = current.bodies.get(id)
        if (body !== undefined) {
            body.fx = null
            body.fy = null
        }
        current.simulation.alphaTarget(0).restart()
    }, [])

    return { placed, grab, drag, drop }
}
