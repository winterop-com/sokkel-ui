import { Handle, Position, useNodeId, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useContext, type ComponentType } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { IssueMark, worst, type Issue } from '@winterop-com/sokkel-ui/IssueMark'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import { GraphEditableContext, GraphEditingContext, useGraphDirection } from './context'
import type { Measure } from './measure'

/** What one node box says. */
export interface GraphNodeData extends Record<string, unknown> {
    /** The node's key, drawn in the code face. */
    code: string
    /** A human title; without one, the code is the title. */
    name?: string
    /** What sort of thing the node is, on the code line after the code. */
    kind?: string
    status?: Status
    duration_ms?: number
    /** How far along the node is, from 0 to 1, drawn as a line along its foot. */
    progress?: number
    /** A glyph ahead of the title. */
    icon?: ComponentType<{ className?: string }>
    /** `round` draws the box with wider corners, to tell a second kind of node apart without color. */
    shape?: 'box' | 'round'
    /** What is wrong with the node, as a form field says it: the box takes the worst issue's edge, and a mark opens the list. */
    issues?: readonly Issue[]
    formatDuration?: (ms: number) => string
}

/** The node kind React Flow draws a node box for. */
export type GraphNodeKind = Node<GraphNodeData, 'box'>

/** A duration in milliseconds, said briefly in English. */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${String(Math.round(ms))} ms`
    const seconds = ms / 1000
    if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${String(minutes)}m ${String(Math.round(seconds % 60))}s`
    return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m`
}

/** The narrowest and widest a node box is drawn; past the widest its words truncate. */
export const NODE_MIN_WIDTH = 96
export const NODE_MAX_WIDTH = 280

/** How tall a node box is with its code line, and without one. */
export const NODE_HEIGHT = 44
export const NODE_HEIGHT_SHORT = 30

/** A node box's padding and border across, and the room a dot, a glyph and a gap take. */
const CHROME = 22
const GAP = 6
const DOT = 8
const GLYPH = 12
/** The room an issue mark takes. */
const MARK = 20
/** The extra padding across a round box. */
const ROUND_PAD = 8

/** The words on a node box's two lines. */
function linesOf(data: GraphNodeData): { title: string; named: boolean; line: string; duration: string | null } {
    const named = data.name !== undefined && data.name !== ''
    const line = [named ? data.code : undefined, data.kind].filter((part) => part !== undefined && part !== '').join(' · ')
    const duration = data.duration_ms === undefined ? null : (data.formatDuration ?? formatDuration)(data.duration_ms)
    return { title: named ? (data.name as string) : data.code, named, line, duration }
}

/** The size a node box is drawn at, so none of its words is cut short of the widest a box may be. */
export function graphNodeSize(data: GraphNodeData, measure: Measure): { width: number; height: number } {
    const { title, named, line, duration } = linesOf(data)
    const head =
        (data.icon === undefined ? 0 : GLYPH + GAP) +
        measure(title, named ? 'title' : 'title-mono') +
        (data.status === undefined ? 0 : GAP + DOT) +
        (hasIssues(data) ? GAP + MARK - 4 : 0)
    const foot = (line === '' ? 0 : measure(line, 'small-mono')) + (duration === null ? 0 : GAP + 2 + measure(duration, 'small-mono'))
    const width = Math.min(
        NODE_MAX_WIDTH,
        Math.max(NODE_MIN_WIDTH, Math.ceil(Math.max(head, foot) + CHROME + (data.shape === 'round' ? ROUND_PAD : 0))),
    )
    return { width, height: line === '' && duration === null ? NODE_HEIGHT_SHORT : NODE_HEIGHT }
}

function hasIssues(data: GraphNodeData): boolean {
    return data.issues !== undefined && data.issues.length > 0
}

/** The edge an issue gives a box, as it gives a form field's input. */
const ISSUE_BOX = {
    critical: 'border-critical/80 hover:border-critical',
    warning: 'border-warning/80 hover:border-warning',
} as const

/** The border and ground each status gives a box: only a failure, a run in progress and a skip mark the box itself. */
const BOX: Partial<Record<Status, string>> = {
    failed: 'border-status-failed-ink bg-[color-mix(in_oklab,var(--status-failed)_10%,var(--node))]',
    running: 'border-status-running-ink',
    completed_with_errors: 'border-status-completed-with-errors-ink',
    skipped: 'border-dashed text-muted-foreground',
    cancelled: 'text-muted-foreground',
}

const DOT_TONE: Record<Status, string> = {
    succeeded: 'bg-status-succeeded',
    failed: 'bg-status-failed',
    running: 'bg-status-running motion-safe:animate-pulse',
    queued: 'bg-status-queued',
    pending: 'bg-status-pending',
    waiting: 'bg-status-waiting',
    cancelled: 'bg-status-cancelled',
    skipped: 'bg-status-skipped',
    completed_with_errors: 'bg-status-completed-with-errors',
}

const PROGRESS_TONE: Partial<Record<Status, string>> = {
    failed: 'bg-status-failed',
    succeeded: 'bg-status-succeeded',
}

/**
 * Where a node's edges end. React Flow routes an edge only to a handle, so a box keeps two, on the
 * sides its graph's direction gives them; in a view they are invisible and connect nothing, and on
 * an editable canvas they are the ports a connection is drawn between. On a canvas whose editing
 * takes `onAppend`, the output port grows into an add button while the node is hovered or chosen:
 * a click on it adds the next step, and a drag from it still connects.
 */
export function GraphHandles({ selected = false }: { selected?: boolean }) {
    const down = useGraphDirection() === 'down'
    const editable = useContext(GraphEditableContext)
    const context = useContext(GraphEditingContext)
    const id = useNodeId()
    const flow = useReactFlow()
    const port = editable ? PORT : 'invisible'
    const onAppend = context?.editing.onAppend
    const appends = editable && id !== null && onAppend !== undefined && context?.editing.canAppend?.(id) !== false
    return (
        <>
            <Handle type="target" position={down ? Position.Top : Position.Left} isConnectable={editable} className={port} />
            <Handle
                type="source"
                position={down ? Position.Bottom : Position.Right}
                isConnectable={editable}
                className={cn(port, appends && APPEND, appends && selected && APPEND_SHOWN)}
                data-slot={appends ? 'graph-append' : undefined}
                title={appends ? context?.words.append : undefined}
                aria-label={appends ? context?.words.append : undefined}
                onClick={
                    appends
                        ? (event) => {
                              event.stopPropagation()
                              const at = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
                              onAppend(id, { clientX: event.clientX, clientY: event.clientY, ...at })
                          }
                        : undefined
                }
            >
                {appends && <Plus className="pointer-events-none size-2.5 opacity-0 transition-opacity" aria-hidden />}
            </Handle>
        </>
    )
}

/** An output port that adds a step: it grows into a plus while its node is hovered. */
const APPEND =
    'flex! items-center! justify-center! cursor-pointer! text-muted-foreground transition-[width,height,background-color,border-color] group-hover/node:size-4! group-hover/node:[&_svg]:opacity-100 hover:text-background'
/** The same, held open while its node is chosen. */
const APPEND_SHOWN = 'size-4! [&_svg]:opacity-100'

/** A port on an editable canvas: a quiet dot that takes the ring tone under the pointer and while any connection is drawn. */
const PORT =
    'z-10! size-2.5! rounded-chip! border! border-border-strong! bg-card! transition-colors hover:border-ring! hover:bg-ring! group-data-graph-connecting/graph:border-ring! group-data-graph-connecting/graph:bg-[color-mix(in_oklab,var(--ring)_45%,var(--card))]!'

/**
 * One node as a box: the title (the name, or else the code in the code face) with an optional glyph
 * and a status dot, then the code and kind on a mono line with the duration at its right, and a
 * progress line along the foot. A status's color is the only color it wears; selection is a
 * neutral ring.
 */
export function GraphNodeBox({ data, selected = false, className }: { data: GraphNodeData; selected?: boolean; className?: string }) {
    const { title, named, line, duration } = linesOf(data)
    const Icon = data.icon
    const status = data.status
    const progress = data.progress === undefined ? null : Math.min(1, Math.max(0, data.progress))
    const issue = data.issues === undefined ? null : worst(data.issues)
    return (
        <div
            data-slot="graph-node"
            data-status={status}
            data-issue={issue ?? undefined}
            data-selected={selected}
            className={cn(
                'relative flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden border border-node-line bg-node px-2.5 text-left text-foreground shadow-node transition-[border-color,box-shadow] duration-100 hover:border-muted-foreground',
                data.shape === 'round' ? 'rounded-[calc(var(--radius-node)*3)] px-3.5' : 'rounded-node',
                status !== undefined && BOX[status],
                issue !== null && ISSUE_BOX[issue],
                selected && 'outline-2 outline-offset-2 outline-foreground outline-solid',
                className,
            )}
        >
            <div className="flex min-w-0 items-center gap-1.5">
                {Icon !== undefined && <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
                <span title={title} className={cn('min-w-0 truncate text-graph-title font-semibold', !named && 'font-mono')}>
                    {title}
                </span>
                {status !== undefined && <span className={cn('ml-auto size-2 shrink-0 rounded-full', DOT_TONE[status])} aria-hidden />}
                {issue !== null && data.issues !== undefined && (
                    <IssueMark
                        issues={data.issues}
                        className={cn('nodrag nopan static -my-1 -mr-1.5 size-5 shrink-0', status === undefined && 'ml-auto')}
                    />
                )}
            </div>
            {(line !== '' || duration !== null) && (
                <div className="flex min-w-0 items-baseline gap-2 font-mono text-graph-small text-muted-foreground">
                    <span title={line} className="min-w-0 truncate">
                        {line}
                    </span>
                    {duration !== null && <span className="ml-auto shrink-0 text-faint">{duration}</span>}
                </div>
            )}
            {progress !== null && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-border" aria-hidden>
                    <span
                        className={cn('block h-full', (status !== undefined && PROGRESS_TONE[status]) || 'bg-status-running')}
                        style={{ width: `${String(progress * 100)}%` }}
                    />
                </span>
            )}
        </div>
    )
}

/** A node box as React Flow's node component, with the handles its edges end at. */
export function GraphNode({ data, selected }: NodeProps<GraphNodeKind>) {
    return (
        <>
            <GraphHandles selected={selected} />
            <GraphNodeBox data={data} selected={selected} />
        </>
    )
}
