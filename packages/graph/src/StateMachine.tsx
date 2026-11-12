import type { NodeTypes } from '@xyflow/react'
import { useMemo, useState } from 'react'

import { GraphCanvas, wrapWidthFor, type GraphViewProps } from './GraphCanvas'
import { GraphHandles } from './GraphNode'
import { useNodeGraph, type GraphItem, type GraphLink } from './use-node-graph'

/** One state of a machine. A final state leads to the final marker. */
export interface MachineState {
    code: string
    name?: string
    final?: boolean
}

/** One transition, from a state to a state, with the event that takes it as its label. */
export interface MachineTransition {
    from: string
    to: string
    label?: string
}

/** The marker the initial state is entered from: a filled dot. */
function InitialMarker() {
    return (
        <>
            <GraphHandles />
            <span className="block size-full rounded-full bg-foreground" aria-hidden />
        </>
    )
}

/** The marker a final state leads to: a dot in a ring. */
function FinalMarker() {
    return (
        <>
            <GraphHandles />
            <span className="flex size-full items-center justify-center rounded-full border-2 border-foreground" aria-hidden>
                <span className="size-2 rounded-full bg-foreground" />
            </span>
        </>
    )
}

const MARKERS: NodeTypes = {
    initial: InitialMarker,
    final: FinalMarker,
}

/** The ids the two markers stand under, which no state's code may take. */
const INITIAL = '~initial'
const FINAL = '~final'

export type StateMachineProps = GraphViewProps & {
    states: MachineState[]
    transitions: MachineTransition[]
    /** The code of the state the machine starts in. */
    initial?: string
    /** The code of the state the machine is in now. */
    current?: string | null
}

/**
 * A state machine: its states, its labeled transitions, a marker the initial state is entered from
 * and one every final state leads to. The `current` state is drawn as running, in the status
 * color that is the only color a node wears. A transition from a state to itself is a loop beside it.
 */
export function StateMachine({
    states,
    transitions,
    initial,
    current = null,
    selected = null,
    onSelect,
    direction = 'right',
    frame = 'stage',
    zoomOnDoubleClick,
    fitMinZoom,
    narrowFit,
    tallFit,
    onControls,
    fillFloor,
    wrapToCanvas,
    controls,
    wrapWidth,
    routing,
    spacing,
    minNodeWidth,
    maxNodeWidth,
    words,
    className,
}: StateMachineProps) {
    const [width, setWidth] = useState<number>()
    const finals = useMemo(() => states.filter((state) => state.final === true), [states])
    const items = useMemo<GraphItem[]>(
        () => [
            ...(initial === undefined
                ? []
                : [{ id: INITIAL, type: 'initial', size: { width: 14, height: 14 }, selectable: false, data: { code: '' } }]),
            ...states.map((state) => ({
                id: state.code,
                data: { code: state.code, name: state.name, ...(state.code === current ? { status: 'running' as const } : {}) },
            })),
            ...(finals.length === 0
                ? []
                : [{ id: FINAL, type: 'final', size: { width: 18, height: 18 }, selectable: false, data: { code: '' } }]),
        ],
        [states, finals, initial, current],
    )
    const links = useMemo<GraphLink[]>(
        () => [
            ...(initial === undefined ? [] : [{ source: INITIAL, target: initial, arrow: true }]),
            ...transitions.map((transition) => ({ source: transition.from, target: transition.to, label: transition.label, arrow: true })),
            ...finals.map((state) => ({ source: state.code, target: FINAL, arrow: true })),
        ],
        [transitions, finals, initial],
    )
    const wrapAt = wrapWidthFor(wrapWidth, wrapToCanvas, width, fitMinZoom)
    const graph = useNodeGraph(items, links, { direction, selected, routing, spacing, wrapWidth: wrapAt, minNodeWidth, maxNodeWidth })
    return (
        <GraphCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            settled={graph.settled}
            nodeTypes={MARKERS}
            direction={direction}
            frame={frame}
            zoomOnDoubleClick={zoomOnDoubleClick}
            narrowFit={narrowFit}
            tallFit={tallFit}
            onControls={onControls}
            fillFloor={fillFloor}
            onWidth={wrapToCanvas === true ? setWidth : undefined}
            controls={controls}
            fitMinZoom={fitMinZoom}
            layoutKey={`${String(routing)}|${String(spacing)}|${String(wrapWidth)}|${String(wrapToCanvas)}`}
            onSelect={onSelect}
            words={words}
            className={className}
        />
    )
}
