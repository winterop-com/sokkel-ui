import { Handle, Position, useNodeId, useReactFlow, type Node, type NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'
import { useContext, type ComponentType } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { IssueMark, worst, type Issue } from '@winterop-com/sokkel-ui/IssueMark'
import type { Status } from '@winterop-com/sokkel-ui/StatusChip'
import { useStatus } from '@winterop-com/sokkel-ui/StatusProvider'
import { RUN_STATUSES, type RunStatus } from '@winterop-com/sokkel-ui/lib/status'
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
    /** A run state, or a state the app names in the status map, drawn in the color the map gives it. */
    status?: Status | (string & {})
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
    /** What pointing at the box says, such as what the step is doing now; it follows each word's own title too. */
    hint?: string
    /** What pointing at the code line says in place of its words, such as what a source listens to. */
    lineHint?: string
    /** Where data enters rather than a step that runs: the box is dashed on the canvas's ground. */
    source?: boolean
    /** A count before the status dot, such as how many items a fan-out has. */
    count?: string
    /**
     * A fan-out's items as chips under the two lines, each with its state's dot, its label and an
     * optional note; they wrap onto more lines and the box grows taller.
     */
    items?: readonly GraphNodeItem[]
    /** One line in place of the chips, such as counts by state once there are too many, or what the fan-out waits for. */
    itemsSummary?: string
    /**
     * Other words the code line may come to say, or an item's note at its widest: the box keeps room
     * for the widest, so it does not grow, and the graph is not laid out again, as a run goes on.
     */
    reserve?: readonly string[]
}

/** One item of a fan-out, drawn as a chip inside its node. */
export interface GraphNodeItem {
    id: string
    label: string
    status?: Status | (string & {})
    /** A short word after the label, such as a retry's countdown. */
    note?: string
    /** The note at its widest, such as a countdown's longest; the chip keeps room for it, so a changing note moves nothing. */
    reserve?: string
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

/** How tall one line of a fan-out's chips or its summary is, with the gap above it. */
const STRIP_LINE = 18
/** The widest a fan-out's chips widen a box before they wrap. */
const STRIP_ROOM = 240
/** The gap between two chips, and inside one between its parts. */
const CHIP_GAP = 8
const CHIP_INNER = 4
/** A chip's status dot. */
const CHIP_DOT = 6
/** The duration a box with a state keeps room for, so it does not widen when its step ends. */
const DURATION_ROOM = '59m 59s'

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

/**
 * The narrowest and widest a graph draws its node boxes, each sized from its words between the two.
 * Past the widest a box's words end in an ellipsis and the whole of them shows on pointing; the same
 * number for both draws every box at one width.
 */
export interface NodeWidthBounds {
    /** 96 when left out. */
    min?: number
    /** 280 when left out. */
    max?: number
}

/** The size a node box is drawn at, so none of its words is cut short of the widest a box may be. */
export function graphNodeSize(
    data: GraphNodeData,
    measure: Measure,
    { min = NODE_MIN_WIDTH, max = NODE_MAX_WIDTH }: NodeWidthBounds = {},
): { width: number; height: number } {
    const { title, named, line, duration } = linesOf(data)
    const head =
        (data.icon === undefined ? 0 : GLYPH + GAP) +
        measure(title, named ? 'title' : 'title-mono') +
        (data.status === undefined ? 0 : GAP + DOT) +
        (hasIssues(data) ? GAP + MARK - 4 : 0)
    const said = Math.max(
        line === '' ? 0 : measure(line, 'small-mono'),
        ...(data.reserve ?? []).map((words) => measure(words, 'small-mono')),
    )
    // A box with a state keeps room for a duration, so its step ending does not widen it.
    const timed = duration !== null || data.status !== undefined
    const took = timed
        ? GAP + 2 + Math.max(duration === null ? 0 : measure(duration, 'small-mono'), measure(DURATION_ROOM, 'small-mono'))
        : 0
    const foot = said + took
    const counted = data.count === undefined ? 0 : GAP + measure(data.count, 'small-mono')
    const chips = (data.items ?? []).map((item) => chipWidth(item, measure))
    const strip = data.itemsSummary !== undefined ? measure(data.itemsSummary, 'small') : Math.min(STRIP_ROOM, rowWidth(chips))
    const widest = Math.max(head + counted, foot, strip, ...chips)
    const pad = CHROME + (data.shape === 'round' ? ROUND_PAD : 0)
    const width = Math.min(Math.max(min, max), Math.max(min, Math.ceil(widest + pad)))
    const lines = data.itemsSummary !== undefined ? 1 : chips.length === 0 ? 0 : wrappedLines(chips, width - pad)
    const twoLines = line !== '' || timed || (data.reserve ?? []).length > 0
    return { width, height: (twoLines ? NODE_HEIGHT : NODE_HEIGHT_SHORT) + lines * STRIP_LINE }
}

/** How wide one chip of a fan-out is drawn: its dot, its label in the code face, and its note. */
function chipWidth(item: GraphNodeItem, measure: Measure): number {
    const notes = [item.note, item.reserve].filter((words): words is string => words !== undefined)
    const note = notes.length === 0 ? 0 : CHIP_INNER + Math.max(...notes.map((words) => measure(words, 'small')))
    return CHIP_DOT + CHIP_INNER + measure(item.label, 'small-mono') + note
}

/** How wide a row of chips is, side by side. */
function rowWidth(chips: readonly number[]): number {
    return chips.reduce((sum, chip, index) => sum + chip + (index === 0 ? 0 : CHIP_GAP), 0)
}

/** How many lines chips wrap onto across a width. */
function wrappedLines(chips: readonly number[], room: number): number {
    let lines = 1
    let used = 0
    for (const chip of chips) {
        const next = used === 0 ? chip : used + CHIP_GAP + chip
        if (used > 0 && next > room) {
            lines += 1
            used = chip
        } else used = next
    }
    return lines
}

function hasIssues(data: GraphNodeData): boolean {
    return data.issues !== undefined && data.issues.length > 0
}

/** The edge an issue gives a box, as it gives a form field's input. */
const ISSUE_BOX = {
    critical: 'border-critical/80 hover:border-critical',
    warning: 'border-warning/80 hover:border-warning',
} as const

/**
 * The border and ground each status gives a box: an ended state its ink, a live one its hue, a
 * failure a heavier edge over a wash, and a skip dashed on no ground. Nothing else takes a color.
 */
const BOX: Partial<Record<Status, string>> = {
    succeeded: 'border-status-succeeded-ink',
    failed: 'border-[1.5px] border-status-failed-ink bg-[color-mix(in_oklab,var(--status-failed)_12%,var(--node))]',
    running: 'border-status-running',
    waiting: 'border-status-waiting',
    completed_with_errors: 'border-status-completed-with-errors-ink',
    skipped: 'border-dashed bg-transparent text-muted-foreground shadow-none',
    cancelled: 'text-muted-foreground',
}

/** A source's box: dashed on the canvas's own ground. */
const SOURCE = 'border-dashed bg-canvas shadow-none'

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

const isRunStatus = (value: string): value is RunStatus => (RUN_STATUSES as readonly string[]).includes(value)

export interface GraphHandlesProps {
    selected?: boolean
}

/**
 * Where a node's edges end. React Flow routes an edge only to a handle, so a box keeps two, on the
 * sides its graph's direction gives them; in a view they are invisible and connect nothing, and on
 * an editable canvas they are the ports a connection is drawn between. On a canvas whose editing
 * takes `onAppend`, the output port grows into an add button while the node is hovered or chosen:
 * a click on it adds the next step, and a drag from it still connects.
 */
export function GraphHandles({ selected = false }: GraphHandlesProps) {
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

export interface GraphNodeBoxProps {
    data: GraphNodeData
    selected?: boolean
    className?: string
}

/**
 * One node as a box: the title (the name, or else the code in the code face) with an optional glyph
 * and a status dot, then the code and kind on a mono line with the duration at its right, and a
 * progress line along the foot. A status's color is the only color it wears; selection is a
 * neutral ring.
 */
export function GraphNodeBox({ data, selected = false, className }: GraphNodeBoxProps) {
    const { title, named, line, duration } = linesOf(data)
    const Icon = data.icon
    const status = data.status
    const look = useStatus(status ?? '')
    // A run state wears its own classes; an app's state the run state its color is, or the edge an issue of its color gives.
    const run = status === undefined ? undefined : isRunStatus(status) ? status : isRunStatus(look.color) ? look.color : undefined
    const edge = run === undefined && (look.color === 'critical' || look.color === 'warning') ? ISSUE_BOX[look.color] : undefined
    const progress = data.progress === undefined ? null : Math.min(1, Math.max(0, data.progress))
    const issue = data.issues === undefined ? null : worst(data.issues)
    const hint = data.hint === undefined || data.hint === '' ? undefined : data.hint
    // What the box is doing has no line of its own, so it follows whichever word is pointed at.
    const titled = (words: string) => (hint === undefined ? words : `${words}\n${hint}`)
    return (
        <div
            data-slot="graph-node"
            data-status={status}
            data-source={data.source === true || undefined}
            data-issue={issue ?? undefined}
            data-selected={selected}
            title={hint}
            className={cn(
                'relative flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden border border-node-line bg-node px-2.5 text-left text-foreground shadow-node transition-[border-color,box-shadow] duration-100 hover:border-muted-foreground',
                data.shape === 'round' ? 'rounded-[calc(var(--radius-node)*3)] px-3.5' : 'rounded-node',
                data.source === true && SOURCE,
                run !== undefined && BOX[run],
                edge,
                issue !== null && ISSUE_BOX[issue],
                selected && 'outline-2 outline-offset-2 outline-foreground outline-solid',
                className,
            )}
        >
            <div className="flex min-w-0 items-center gap-1.5">
                {Icon !== undefined && <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />}
                <span
                    data-slot="graph-node-title"
                    title={titled(title)}
                    className={cn('min-w-0 truncate text-graph-title font-semibold', !named && 'font-mono')}
                >
                    {title}
                </span>
                {data.count !== undefined && (
                    <span data-slot="graph-node-count" className="ml-auto shrink-0 font-mono text-graph-small text-faint">
                        {data.count}
                    </span>
                )}
                {status !== undefined && (
                    <span
                        role="img"
                        aria-label={look.label}
                        title={look.label}
                        className={cn(
                            'size-2 shrink-0 rounded-full',
                            data.count === undefined && 'ml-auto',
                            run !== undefined && DOT_TONE[run],
                        )}
                        style={run === undefined ? { background: look.css } : undefined}
                    />
                )}
                {issue !== null && data.issues !== undefined && (
                    <IssueMark
                        issues={data.issues}
                        className={cn('nodrag nopan static -my-1 -mr-1.5 size-5 shrink-0', status === undefined && 'ml-auto')}
                    />
                )}
            </div>
            {(line !== '' || duration !== null || status !== undefined || (data.reserve ?? []).length > 0) && (
                <div
                    data-slot="graph-node-line"
                    className="flex min-h-4 min-w-0 items-baseline gap-2 font-mono text-graph-small text-muted-foreground"
                >
                    <span title={titled(data.lineHint ?? line)} className="min-w-0 truncate">
                        {line}
                    </span>
                    {duration !== null && <span className="ml-auto shrink-0 text-faint">{duration}</span>}
                </div>
            )}
            {data.itemsSummary !== undefined ? (
                <span
                    data-slot="graph-node-strip"
                    title={titled(data.itemsSummary)}
                    className="truncate text-graph-small text-muted-foreground"
                >
                    {data.itemsSummary}
                </span>
            ) : (
                data.items !== undefined &&
                data.items.length > 0 && (
                    <div data-slot="graph-node-strip" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        {data.items.map((item) => (
                            <GraphNodeChip key={item.id} item={item} />
                        ))}
                    </div>
                )
            )}
            {progress !== null && (
                <span
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    aria-label={look.label === '' ? undefined : look.label}
                    className="absolute inset-x-0 bottom-0 h-0.5"
                    style={{
                        background: `color-mix(in oklab, ${status === undefined ? 'var(--status-running)' : look.css} 18%, transparent)`,
                    }}
                >
                    <span
                        className="block h-full transition-[width] duration-300"
                        style={{
                            width: `${String(progress * 100)}%`,
                            background: status === undefined ? 'var(--status-running)' : look.css,
                        }}
                    />
                </span>
            )}
        </div>
    )
}

/** One item of a fan-out: its state's dot, its label in the code face, and its note. */
function GraphNodeChip({ item }: { item: GraphNodeItem }) {
    const look = useStatus(item.status ?? '')
    return (
        <span
            data-slot="graph-node-item"
            data-status={item.status}
            className="flex h-4 max-w-full min-w-0 items-center gap-1 text-graph-small text-muted-foreground"
        >
            {item.status !== undefined && (
                <span
                    role="img"
                    aria-label={look.label}
                    title={look.label}
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: look.css }}
                />
            )}
            <span title={item.label} className="min-w-0 truncate font-mono">
                {item.label}
            </span>
            {item.note !== undefined && <span className="shrink-0 text-faint">{item.note}</span>}
        </span>
    )
}

export type GraphNodeProps = NodeProps<GraphNodeKind>

/** A node box as React Flow's node component, with the handles its edges end at. */
export function GraphNode({ data, selected }: GraphNodeProps) {
    return (
        <>
            <GraphHandles selected={selected} />
            <GraphNodeBox data={data} selected={selected} />
        </>
    )
}
