import { useMemo } from 'react'

import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import { GraphCanvas, type GraphViewProps } from './GraphCanvas'
import type { GraphEdgeData } from './GraphEdge'
import { formatDuration as sayDuration } from './GraphNode'
import type { PipelineStep } from './PipelineGraph'
import { useNodeGraph, type GraphItem, type GraphLink } from './use-node-graph'

/** One step of a run: the pipeline's step, with how far it got. */
export interface RunStep extends PipelineStep {
    status: Status
    duration_ms?: number
    /** How far a running step has come, from 0 to 1. */
    progress?: number
}

/** The states a run has not reached yet, whose edges are drawn dashed. */
const AHEAD: ReadonlySet<Status> = new Set(['queued', 'pending', 'waiting', 'skipped', 'cancelled'])

/** How an edge into a step is drawn: dashed toward a step not reached, darker into one running. */
function toneInto(status: Status | undefined): GraphEdgeData['tone'] {
    if (status === undefined) return 'plain'
    if (status === 'running') return 'strong'
    return AHEAD.has(status) ? 'quiet' : 'plain'
}

/**
 * A run of a pipeline as a graph: each step with its status, its duration and, while it runs, its
 * progress. A step changing status moves no node; only a change of steps or their words does.
 */
export function RunGraph({
    steps,
    selected = null,
    onSelect,
    direction = 'right',
    frame = 'stage',
    formatDuration = sayDuration,
    words,
    className,
}: GraphViewProps & { steps: RunStep[]; formatDuration?: (ms: number) => string }) {
    const items = useMemo<GraphItem[]>(
        () =>
            steps.map((step) => ({
                id: step.code,
                data: {
                    code: step.code,
                    name: step.name,
                    kind: step.kind,
                    status: step.status,
                    duration_ms: step.duration_ms,
                    progress: step.status === 'running' ? step.progress : undefined,
                    formatDuration,
                },
            })),
        [steps, formatDuration],
    )
    const links = useMemo<GraphLink[]>(() => {
        const status = new Map(steps.map((step) => [step.code, step.status]))
        return steps.flatMap((step) =>
            step.needs.map((need) => ({ source: need, target: step.code, tone: toneInto(status.get(step.code)) })),
        )
    }, [steps])
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
