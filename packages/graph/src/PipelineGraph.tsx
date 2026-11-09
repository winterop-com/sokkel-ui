import { useMemo, useState, type ComponentType, type ReactNode } from 'react'

import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { fitDirection, GraphCanvas, type GraphEditing, type GraphViewProps } from './GraphCanvas'
import { useNodeGraph, type GraphItem, type GraphLink } from './use-node-graph'

/** One step of a pipeline: its code, an optional name and kind, and the codes of the steps it needs. */
export interface PipelineStep {
    code: string
    name?: string
    kind?: string
    needs: string[]
    /** A glyph ahead of the title, such as its block's. */
    icon?: ComponentType<{ className?: string }>
    /** What is wrong with the step, marked on its box. */
    issues?: readonly Issue[]
}

/** Whether an edge from `source` to `target` would close a loop: whether `target` already leads to `source`. */
export function wouldCycle(steps: readonly PipelineStep[], source: string, target: string): boolean {
    if (source === target) return true
    const after = new Map<string, string[]>()
    for (const step of steps) for (const need of step.needs) after.set(need, [...(after.get(need) ?? []), step.code])
    const seen = new Set<string>()
    const queue = [target]
    while (queue.length > 0) {
        const at = queue.shift() as string
        if (at === source) return true
        if (seen.has(at)) continue
        seen.add(at)
        queue.push(...(after.get(at) ?? []))
    }
    return false
}

/** The edges of a set of steps: one from every step a step needs, to it. */
export function stepLinks(steps: readonly PipelineStep[]): GraphLink[] {
    return steps.flatMap((step) => step.needs.map((need) => ({ source: need, target: step.code })))
}

export type PipelineGraphProps = GraphViewProps & {
    steps: PipelineStep[]
    /** Every chosen step, by code. */
    selection?: readonly string[]
    onSelectionChange?: (codes: string[]) => void
    /** Makes the graph an editor; each gesture is reported and the steps change only when the app changes them. */
    editing?: GraphEditing
    /** Where steps were moved to, by code, over where the layout put them. */
    positions?: Readonly<Record<string, { x: number; y: number }>>
    /** False hides the zoom buttons, for a toolbar that carries them. */
    controls?: boolean
    /** A bar over the canvas's top-left corner, such as a `GraphToolbar`. */
    toolbar?: ReactNode
    /** What the canvas offers while it has no steps, such as a button that adds the first. */
    emptyAction?: ReactNode
    /** What the canvas holds over the drawing, such as a `GraphOverlay`. */
    children?: ReactNode
}

/**
 * A pipeline's steps as a graph, each step after the steps it needs. It selects only, unless given
 * `editing`. Given `selection` and `onSelectionChange` in place of `selected`, several steps are
 * chosen at once.
 */
export function PipelineGraph({
    steps,
    selected = null,
    onSelect,
    selection,
    onSelectionChange,
    direction: given,
    frame = 'stage',
    editing,
    positions,
    controls,
    toolbar,
    emptyAction,
    routing,
    spacing,
    minNodeWidth,
    maxNodeWidth,
    words,
    className,
    children,
}: PipelineGraphProps) {
    const [width, setWidth] = useState<number>()
    const direction = given ?? fitDirection(width)
    const items = useMemo<GraphItem[]>(
        () =>
            steps.map((step) => ({
                id: step.code,
                data: { code: step.code, name: step.name, kind: step.kind, icon: step.icon, issues: step.issues },
            })),
        [steps],
    )
    const links = useMemo(() => stepLinks(steps), [steps])
    const graph = useNodeGraph(items, links, {
        direction,
        selected: selection ?? selected,
        positions,
        routing,
        spacing,
        minNodeWidth,
        maxNodeWidth,
    })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            direction={direction}
            onWidth={setWidth}
            frame={frame}
            onSelect={onSelect}
            onSelectionChange={onSelectionChange}
            editing={editing}
            controls={controls}
            toolbar={toolbar}
            emptyAction={emptyAction}
            words={words}
            className={className}
        >
            {children}
        </GraphCanvas>
    )
}
