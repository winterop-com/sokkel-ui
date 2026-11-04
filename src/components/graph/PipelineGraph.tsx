import { useMemo } from 'react'

import { GraphCanvas, type GraphViewProps } from './GraphCanvas'
import { useNodeGraph, type GraphItem, type GraphLink } from './use-node-graph'

/** One step of a pipeline: its code, an optional name and kind, and the codes of the steps it needs. */
export interface PipelineStep {
    code: string
    name?: string
    kind?: string
    needs: string[]
}

/** The edges of a set of steps: one from every step a step needs, to it. */
export function stepLinks(steps: readonly PipelineStep[]): GraphLink[] {
    return steps.flatMap((step) => step.needs.map((need) => ({ source: need, target: step.code })))
}

/** A pipeline's steps as a graph, each step after the steps it needs. */
export function PipelineGraph({
    steps,
    selected = null,
    onSelect,
    direction = 'right',
    frame = 'stage',
    words,
    className,
}: GraphViewProps & { steps: PipelineStep[] }) {
    const items = useMemo<GraphItem[]>(
        () => steps.map((step) => ({ id: step.code, data: { code: step.code, name: step.name, kind: step.kind } })),
        [steps],
    )
    const links = useMemo(() => stepLinks(steps), [steps])
    const graph = useNodeGraph(items, links, { direction, selected })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            direction={direction}
            frame={frame}
            onSelect={onSelect}
            words={words}
            className={className}
        />
    )
}
