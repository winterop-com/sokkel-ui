import { useEffect, useMemo, useState } from 'react'

import { layoutGraph, rankLayout, shapeSignature, type GraphDirection, type GraphShape, type PlacedGraph } from './layout'

/** A placed graph, and whether elk has answered for it. */
export interface GraphPlacement extends PlacedGraph {
    settled: boolean
}

/**
 * Where a graph's nodes stand. The rank layout places them at once, so the graph draws on its first
 * frame; elk is loaded on the first call and moves them once it answers. A shape is placed again only
 * when its signature changes (its nodes, their sizes, its edges, the direction), so a status changing
 * on a node moves nothing. If elk fails, the rank layout stays and the placement still settles.
 * While `ready` is false, as it is until the node sizes are measured in their fonts, elk is not asked.
 */
export function useGraphLayout(shape: GraphShape, direction: GraphDirection = 'right', ready = true): GraphPlacement {
    const signature = shapeSignature(shape, direction)
    const [answer, setAnswer] = useState<{ signature: string; placed: PlacedGraph | null } | null>(null)

    useEffect(() => {
        if (!ready) return
        let current = true
        layoutGraph(shape, direction).then(
            (placed) => {
                if (current) setAnswer({ signature, placed })
            },
            () => {
                if (current) setAnswer({ signature, placed: null })
            },
        )
        return () => {
            current = false
        }
        // The placement is a function of the signature alone.
        // oxlint-disable-next-line react/exhaustive-deps
    }, [signature, ready])

    // oxlint-disable-next-line react/exhaustive-deps
    const rough = useMemo(() => rankLayout(shape, direction), [signature])
    const settled = ready && answer?.signature === signature
    const placed = settled && answer.placed !== null ? answer.placed : rough
    return useMemo(() => ({ ...placed, settled }), [placed, settled])
}
