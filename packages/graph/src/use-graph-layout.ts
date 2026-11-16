import { useEffect, useMemo, useRef, useState } from 'react'

import {
    layoutGraph,
    rankLayout,
    shapeSignature,
    type GraphDirection,
    type GraphLayoutStyle,
    type GraphShape,
    type PlacedGraph,
} from './layout'

/** How long a graph fitted to its room waits for the room to stop changing before elk lays it out again, in milliseconds. */
const RESIZE_REST = 150

/** A placed graph, and whether elk has answered for it. */
export interface GraphPlacement extends PlacedGraph {
    settled: boolean
}

/**
 * Where a graph's nodes stand. The rank layout places them at once, so the graph draws on its first
 * frame; elk is loaded on the first call and moves them once it answers. A shape is placed again only
 * when its signature changes (its nodes, their sizes, its edges, the direction, routing and spacing),
 * so a status changing on a node moves nothing. If elk fails, the rank layout stays and the placement
 * still settles. While `ready` is false, as it is until the node sizes are measured in their fonts,
 * elk is not asked. A placement a newer signature supersedes is given up on between elk's tries, and
 * a graph cut to its room waits for the room to rest before it is laid out again.
 */
export function useGraphLayout(
    shape: GraphShape,
    direction: GraphDirection = 'right',
    ready = true,
    style: GraphLayoutStyle = {},
): GraphPlacement {
    const signature = shapeSignature(shape, direction, style)
    const [answer, setAnswer] = useState<{ signature: string; placed: PlacedGraph | null } | null>(null)

    // Whether elk has answered once: after that, a shape fitted to a room that is still changing size waits for it to rest.
    const answered = useRef(false)
    useEffect(() => {
        if (!ready) return
        let current = true
        const abandon = new AbortController()
        const place = () =>
            layoutGraph(shape, direction, undefined, style, abandon.signal).then(
                (placed) => {
                    answered.current = true
                    if (current) setAnswer({ signature, placed })
                },
                () => {
                    if (current) setAnswer({ signature, placed: null })
                },
            )
        const timer = answered.current && style.wrapRoom !== undefined ? setTimeout(place, RESIZE_REST) : undefined
        if (timer === undefined) void place()
        return () => {
            current = false
            clearTimeout(timer)
            abandon.abort()
        }
        // The placement is a function of the signature alone.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [signature, ready])

    // oxlint-disable-next-line react/exhaustive-deps
    const rough = useMemo(() => rankLayout(shape, direction, style.spacing), [signature])
    const settled = ready && answer?.signature === signature
    const placed = settled && answer.placed !== null ? answer.placed : rough
    return useMemo(() => ({ ...placed, settled }), [placed, settled])
}
