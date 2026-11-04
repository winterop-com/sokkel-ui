import { useMemo } from 'react'

import { GraphCanvas, type GraphEditing, type GraphViewProps } from './GraphCanvas'
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

/** A pipeline's steps as a graph, each step after the steps it needs. It selects only, unless given `editing`. */
export function PipelineGraph({
    steps,
    selected = null,
    onSelect,
    direction = 'right',
    frame = 'stage',
    editing,
    positions,
    words,
    className,
}: GraphViewProps & {
    steps: PipelineStep[]
    /** Makes the graph an editor; each gesture is reported and the steps change only when the app changes them. */
    editing?: GraphEditing
    /** Where steps were moved to, by code, over where the layout put them. */
    positions?: Readonly<Record<string, { x: number; y: number }>>
}) {
    const items = useMemo<GraphItem[]>(
        () => steps.map((step) => ({ id: step.code, data: { code: step.code, name: step.name, kind: step.kind } })),
        [steps],
    )
    const links = useMemo(() => stepLinks(steps), [steps])
    const graph = useNodeGraph(items, links, { direction, selected, positions })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            direction={direction}
            frame={frame}
            onSelect={onSelect}
            editing={editing}
            words={words}
            className={className}
        />
    )
}
