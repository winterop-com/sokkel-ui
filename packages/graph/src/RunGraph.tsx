import { useEffect, useMemo, useRef, useState } from 'react'

import { useReducedMotion } from '@winterop-com/sokkel-ui/hooks/use-reduced-motion'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import { fitDirection, GraphCanvas, wrapFor, type GraphViewProps } from './GraphCanvas'
import type { GraphEdgeData } from './GraphEdge'
import { formatDuration as sayDuration, type GraphNodeData } from './GraphNode'
import type { PipelineStep } from './PipelineGraph'
import { FIT_MIN_ZOOM } from './layout'
import { useNodeGraph, type GraphItem, type GraphLink } from './use-node-graph'

/** One step of a run: the pipeline's step, with how far it got. */
export interface RunStep
    extends PipelineStep, Pick<GraphNodeData, 'hint' | 'lineHint' | 'source' | 'count' | 'items' | 'itemsSummary' | 'reserve'> {
    /** A run state, or a state the app names in the status map. */
    status: Status | (string & {})
    duration_ms?: number
    /** How far the step has come, from 0 to 1, drawn along its foot in its state's color. */
    progress?: number
}

/** The states a run has not reached yet, whose edges are drawn quiet. */
const AHEAD: ReadonlySet<string> = new Set(['queued', 'pending', 'waiting', 'skipped', 'cancelled'])

/** The states in which a step has an output to hand on. */
const PRODUCED: ReadonlySet<string> = new Set(['succeeded', 'completed_with_errors'])

/** The states in which a step can still read what an edge brings it. */
const READING: ReadonlySet<string> = new Set(['pending', 'queued', 'waiting', 'running'])

/** How long a handover's pulse is held on its edges, a little past its animation. */
const PULSE_MS = 700

/** How an edge into a step is drawn: quiet toward a step not reached, darker into one running. */
function toneInto(status: string | undefined): GraphEdgeData['tone'] {
    if (status === undefined) return 'plain'
    if (status === 'running') return 'strong'
    return AHEAD.has(status) ? 'quiet' : 'plain'
}

/**
 * What an edge of a run is drawn as, from the states of its two ends: the hue its source settled
 * in, dashed into a step that was skipped, and moving while a step that has produced its output
 * feeds one still running. A source that has just produced plays one pulse into each step that can
 * still read it. With motion reduced, a moving edge stands lit and the pulse is left out.
 */
export function runLink(
    source: string | undefined,
    target: string | undefined,
    { handing, reduced }: { handing: boolean; reduced: boolean },
): Pick<GraphLink, 'tone' | 'tint' | 'dashed' | 'motion'> {
    const tint = source === undefined || AHEAD.has(source) || source === 'running' ? undefined : source
    const produced = source !== undefined && PRODUCED.has(source)
    const motion =
        !produced || target === undefined || !READING.has(target)
            ? undefined
            : handing && !reduced
              ? 'pulse'
              : target !== 'running'
                ? undefined
                : reduced
                  ? 'lit'
                  : 'flowing'
    return {
        tone: toneInto(target),
        dashed: target === 'skipped',
        ...(tint === undefined ? {} : { tint }),
        ...(motion === undefined ? {} : { motion }),
    }
}

/**
 * The steps that have just produced their output: in the state the graph saw before, they had not.
 * A step the graph had not seen has handed nothing over, so opening a finished run pulses nothing.
 */
function useHandovers(steps: readonly RunStep[]): ReadonlySet<string> {
    const before = useRef<Map<string, string> | null>(null)
    const timer = useRef<number | undefined>(undefined)
    const [handing, setHanding] = useState<ReadonlySet<string>>(() => new Set())
    useEffect(() => {
        const held = before.current
        before.current = new Map(steps.map((step) => [step.code, step.status]))
        if (held === null) return
        const now = steps
            .filter((step) => {
                const was = held.get(step.code)
                return was !== undefined && !PRODUCED.has(was) && PRODUCED.has(step.status)
            })
            .map((step) => step.code)
        if (now.length === 0) return
        setHanding(new Set(now))
        // The reset outlives the steps changing again, as a live run's do every second; only a new handover restarts it.
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setHanding(new Set()), PULSE_MS)
    }, [steps])
    useEffect(() => () => window.clearTimeout(timer.current), [])
    return handing
}

export type RunGraphProps = GraphViewProps & { steps: RunStep[]; formatDuration?: (ms: number) => string }

/**
 * A run of a pipeline as a graph: each step with its status, its duration and its progress, a
 * fan-out's items inside its box, and edges that carry where the run went (see `runLink`). Boxes
 * keep room for a duration and for the words in `reserve`, so a step changing state or saying more
 * moves no node; only a change of steps, their words or their items does.
 */
export function RunGraph({
    steps,
    selected = null,
    onSelect,
    direction: given,
    frame = 'stage',
    formatDuration = sayDuration,
    routing,
    spacing,
    minNodeWidth,
    maxNodeWidth,
    zoomOnDoubleClick,
    fitMinZoom,
    narrowFit,
    tallFit,
    onControls,
    nodeMenu,
    paneMenu,
    fillFloor,
    wrapToCanvas,
    controls,
    wrapWidth,
    words,
    className,
}: RunGraphProps) {
    const [size, setSize] = useState<{ width: number; height: number }>()
    const direction = given ?? fitDirection(size?.width)
    const wrap = wrapFor(
        wrapWidth,
        wrapToCanvas,
        size === undefined ? undefined : { width: size.width, height: frame === 'fitted' ? 0 : size.height },
        fitMinZoom ?? FIT_MIN_ZOOM,
        { tallFit, narrowFit },
    )
    const reduced = useReducedMotion()
    const handing = useHandovers(steps)
    const items = useMemo<GraphItem[]>(
        () =>
            steps.map((step) => ({
                id: step.code,
                data: {
                    code: step.code,
                    name: step.name,
                    kind: step.kind,
                    icon: step.icon,
                    issues: step.issues,
                    badge: step.badge,
                    reserveBadges: step.reserveBadges,
                    reserveIssue: step.reserveIssue,
                    status: step.status,
                    duration_ms: step.duration_ms,
                    progress: step.progress,
                    hint: step.hint,
                    lineHint: step.lineHint,
                    source: step.source,
                    count: step.count,
                    countIcon: step.countIcon,
                    countTitle: step.countTitle,
                    countPlacement: step.countPlacement,
                    items: step.items,
                    itemsSummary: step.itemsSummary,
                    reserve: step.reserve,
                    formatDuration,
                },
            })),
        [steps, formatDuration],
    )
    const links = useMemo<GraphLink[]>(() => {
        const status = new Map(steps.map((step) => [step.code, step.status]))
        return steps.flatMap((step) =>
            step.needs.map((need) => ({
                source: need,
                target: step.code,
                ...runLink(status.get(need), status.get(step.code), { handing: handing.has(need), reduced }),
            })),
        )
    }, [steps, handing, reduced])
    const graph = useNodeGraph(items, links, { direction, selected, routing, spacing, ...wrap, minNodeWidth, maxNodeWidth })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            direction={direction}
            onSize={setSize}
            frame={frame}
            onSelect={onSelect}
            zoomOnDoubleClick={zoomOnDoubleClick}
            narrowFit={narrowFit}
            tallFit={tallFit}
            onControls={onControls}
            nodeMenu={nodeMenu}
            paneMenu={paneMenu}
            fillFloor={fillFloor}
            controls={controls}
            fitMinZoom={fitMinZoom}
            layoutKey={`${String(routing)}|${String(spacing)}|${String(wrapWidth)}|${String(wrapToCanvas)}`}
            words={words}
            className={className}
        />
    )
}
