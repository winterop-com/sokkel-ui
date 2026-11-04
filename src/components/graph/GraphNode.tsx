import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ComponentType } from 'react'

import { cn } from '../../lib/cn'
import type { Status } from '../StatusChip'
import { useGraphDirection } from './context'
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
        (data.status === undefined ? 0 : GAP + DOT)
    const foot = (line === '' ? 0 : measure(line, 'small-mono')) + (duration === null ? 0 : GAP + 2 + measure(duration, 'small-mono'))
    const width = Math.min(
        NODE_MAX_WIDTH,
        Math.max(NODE_MIN_WIDTH, Math.ceil(Math.max(head, foot) + CHROME + (data.shape === 'round' ? ROUND_PAD : 0))),
    )
    return { width, height: line === '' && duration === null ? NODE_HEIGHT_SHORT : NODE_HEIGHT }
}

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
 * sides its graph's direction gives them; in a view they are invisible and connect nothing.
 */
export function GraphHandles() {
    const down = useGraphDirection() === 'down'
    return (
        <>
            <Handle type="target" position={down ? Position.Top : Position.Left} isConnectable={false} className="invisible" />
            <Handle type="source" position={down ? Position.Bottom : Position.Right} isConnectable={false} className="invisible" />
        </>
    )
}

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
    return (
        <div
            data-slot="graph-node"
            data-status={status}
            data-selected={selected}
            className={cn(
                'relative flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden border border-node-line bg-node px-2.5 text-left text-foreground shadow-node transition-[border-color,box-shadow] duration-100 hover:border-muted-foreground',
                data.shape === 'round' ? 'rounded-[calc(var(--radius-node)*3)] px-3.5' : 'rounded-node',
                status !== undefined && BOX[status],
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
            <GraphHandles />
            <GraphNodeBox data={data} selected={selected} />
        </>
    )
}
