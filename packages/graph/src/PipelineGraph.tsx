import { useMemo, useState, type ComponentType, type ReactNode } from 'react'

import type { Issue } from '@winterop-com/sokkel-ui/IssueMark'
import { fitDirection, GraphCanvas, wrapFor, type GraphEditing, type GraphViewProps } from './GraphCanvas'
import type { GraphNodeData } from './GraphNode'
import { FIT_MIN_ZOOM } from './layout'
import { useNodeGraph, type GraphItem, type GraphLink } from './use-node-graph'

/**
 * One step of a pipeline: its code, an optional name and kind, and the codes of the steps it needs,
 * with any other words its box says.
 */
export interface PipelineStep extends Pick<
    GraphNodeData,
    | 'hint'
    | 'lineHint'
    | 'source'
    | 'count'
    | 'countIcon'
    | 'countTitle'
    | 'countPlacement'
    | 'reserve'
    | 'badge'
    | 'reserveBadges'
    | 'reserveIssue'
> {
    code: string
    name?: string
    kind?: string
    needs: string[]
    /** A glyph ahead of the title, such as its block's. */
    icon?: ComponentType<{ className?: string }>
    /** What is wrong with the step, marked on its box. */
    issues?: readonly Issue[]
}

/**
 * The loop an edge from `source` to `target` would close: the codes from `target` along the steps
 * that lead on from it to `source`, the shortest such way, which the new edge then joins back to
 * `target`. `[source]` alone when the edge would join a step to itself, and null when it closes none.
 */
export function cyclePath(steps: readonly PipelineStep[], source: string, target: string): string[] | null {
    if (source === target) return [source]
    const after = new Map<string, string[]>()
    for (const step of steps) for (const need of step.needs) after.set(need, [...(after.get(need) ?? []), step.code])
    const from = new Map<string, string | null>([[target, null]])
    const queue = [target]
    for (let head = 0; head < queue.length; head += 1) {
        const at = queue[head] as string
        if (at === source) {
            const path: string[] = []
            for (let back: string | null = at; back !== null; back = from.get(back) ?? null) path.unshift(back)
            return path
        }
        for (const next of after.get(at) ?? []) {
            if (from.has(next)) continue
            from.set(next, at)
            queue.push(next)
        }
    }
    return null
}

/** Whether an edge from `source` to `target` would close a loop: whether `target` already leads to `source`. */
export function wouldCycle(steps: readonly PipelineStep[], source: string, target: string): boolean {
    return cyclePath(steps, source, target) !== null
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
    /** The app's own buttons after the zoom buttons, in their cluster, such as one that adds a step. */
    extraControls?: ReactNode
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
    zoomOnDoubleClick,
    fitMinZoom,
    narrowFit,
    tallFit,
    onControls,
    fillFloor,
    wrapToCanvas,
    wrapWidth,
    editing,
    positions,
    controls,
    extraControls,
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
    const [size, setSize] = useState<{ width: number; height: number }>()
    const direction = given ?? fitDirection(size?.width)
    const wrap = wrapFor(
        wrapWidth,
        wrapToCanvas,
        size === undefined ? undefined : { width: size.width, height: frame === 'fitted' ? 0 : size.height },
        Math.min(fitMinZoom ?? FIT_MIN_ZOOM, tallFit ?? Infinity),
    )
    const items = useMemo<GraphItem[]>(() => steps.map(({ needs: _needs, ...step }) => ({ id: step.code, data: step })), [steps])
    const links = useMemo(() => stepLinks(steps), [steps])
    const graph = useNodeGraph(items, links, {
        direction,
        selected: selection ?? selected,
        positions,
        routing,
        spacing,
        ...wrap,
        minNodeWidth,
        maxNodeWidth,
    })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            direction={direction}
            onSize={setSize}
            frame={frame}
            zoomOnDoubleClick={zoomOnDoubleClick}
            narrowFit={narrowFit}
            tallFit={tallFit}
            onControls={onControls}
            fillFloor={fillFloor}
            fitMinZoom={fitMinZoom}
            layoutKey={`${String(routing)}|${String(spacing)}|${String(wrapWidth)}|${String(wrapToCanvas)}`}
            onSelect={onSelect}
            onSelectionChange={onSelectionChange}
            editing={editing}
            controls={controls}
            extraControls={extraControls}
            toolbar={toolbar}
            emptyAction={emptyAction}
            words={words}
            className={className}
        >
            {children}
        </GraphCanvas>
    )
}
