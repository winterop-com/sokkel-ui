import { useMemo } from 'react'

import { cn } from '../lib/cn'

/** A stream of numbers in [0, 1) that is the same for the same seed, so a drawing never changes between renders. */
export function seeded(seed: number): () => number {
    let state = Math.trunc(seed) >>> 0 || 1
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let mixed = state
        mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
}

/** The heights, 0 to 1, of a row of level bars: a few soft peaks with some grain, the tallest at 1. */
export function levelHeights(count: number, seed: number): number[] {
    const random = seeded(seed)
    const peaks = Array.from({ length: 3 }, () => ({
        at: random() * count,
        width: 3 + random() * (count / 8),
        height: 0.45 + random() * 0.55,
    }))
    const raw = Array.from(
        { length: count },
        (_, index) =>
            0.08 + peaks.reduce((sum, peak) => sum + peak.height * Math.exp(-(((index - peak.at) / peak.width) ** 2)), 0) + random() * 0.14,
    )
    const top = Math.max(...raw)
    return raw.map((value) => Math.max(0.05, value / top))
}

const BAR = 8
const BAR_GAP = 4
const BARS_HIGH = 560
const BREATH = 3.2

/**
 * Art for a sign-in screen's brand pane: a row of level bars, the run around the tallest peak in
 * the theme's primary ink and the rest in its muted ground, each breathing slowly at its own
 * phase. `seed` picks the shape, the same every time; motion stops when the system or the app asks
 * for less, the bars resting at full height. It fills its box, standing on the box's foot.
 */
export function LevelBars({
    seed = 7,
    count = 56,
    lit = 9,
    className,
}: {
    seed?: number
    /** How many bars. */
    count?: number
    /** How many bars around the tallest are lit. */
    lit?: number
    className?: string
}) {
    const bars = useMemo(() => {
        const heights = levelHeights(count, seed)
        const peak = heights.indexOf(1)
        const start = Math.max(0, Math.min(count - lit, peak - Math.floor(lit / 2)))
        const random = seeded(seed + 1)
        return heights.map((height, index) => ({ height, lit: index >= start && index < start + lit, delay: random() * BREATH }))
    }, [count, lit, seed])
    return (
        <svg
            data-slot="level-bars"
            viewBox={`0 0 ${String(count * (BAR + BAR_GAP) - BAR_GAP)} ${String(BARS_HIGH)}`}
            preserveAspectRatio="xMidYMax meet"
            aria-hidden
            className={cn('size-full', className)}
        >
            {bars.map((bar, index) => (
                <rect
                    key={index}
                    x={index * (BAR + BAR_GAP)}
                    y={BARS_HIGH * (1 - bar.height)}
                    width={BAR}
                    height={BARS_HIGH * bar.height}
                    className={cn(
                        'origin-bottom animate-[level-breathe_3.2s_ease-in-out_infinite] [transform-box:fill-box]',
                        bar.lit ? 'fill-primary' : 'fill-muted',
                    )}
                    style={{ animationDelay: `-${bar.delay.toFixed(2)}s` }}
                />
            ))}
        </svg>
    )
}

interface FlowNode {
    x: number
    y: number
    column: number
}

interface FlowEdge {
    from: number
    to: number
    lit: boolean
}

const WIDE = 720
const HIGH = 560
const NODE_W = 72
const NODE_H = 36
const COLUMNS = 6

/** A small graph of nodes in columns, each joined to its nearest neighbors on either side, with one lit path from the first to the last. */
export function flowGraph(seed: number): { nodes: FlowNode[]; edges: FlowEdge[] } {
    const random = seeded(seed)
    const step = (WIDE - NODE_W - 16) / (COLUMNS - 1)
    const nodes: FlowNode[] = []
    const columns: number[][] = []
    for (let column = 0; column < COLUMNS; column += 1) {
        const ends = column === 0 || column === COLUMNS - 1
        const count = ends ? 1 : 2 + Math.floor(random() * 3)
        const spacing = HIGH / (count + 1)
        columns.push([])
        for (let row = 0; row < count; row += 1) {
            const jitter = ends ? 0 : (random() - 0.5) * spacing * 0.4
            columns[column].push(nodes.length)
            nodes.push({ x: 8 + column * step, y: spacing * (row + 1) + jitter - NODE_H / 2, column })
        }
    }
    const keys = new Set<string>()
    const edges: FlowEdge[] = []
    const join = (from: number, to: number) => {
        const key = `${String(from)}-${String(to)}`
        if (keys.has(key)) return
        keys.add(key)
        edges.push({ from, to, lit: false })
    }
    const nearest = (y: number, among: number[]) =>
        among.reduce((best, index) => (Math.abs(nodes[index].y - y) < Math.abs(nodes[best].y - y) ? index : best))
    for (let column = 0; column < COLUMNS - 1; column += 1) {
        const here = columns[column]
        const next = columns[column + 1]
        for (const index of next) join(nearest(nodes[index].y, here), index)
        for (const index of here) join(index, nearest(nodes[index].y, next))
    }
    let at = columns[0][0]
    while (nodes[at].column < COLUMNS - 1) {
        const ways = edges.filter((edge) => edge.from === at)
        const way = ways[Math.floor(random() * ways.length)]
        way.lit = true
        at = way.to
    }
    return { nodes, edges }
}

/**
 * Art for a sign-in screen's brand pane: a few nodes in columns joined by curved lines, one path
 * through them lit in the theme's primary ink and flowing toward the last node, which glows; the
 * rest in the border's ink over faint rings. `seed` picks the graph, the same every time; motion
 * stops when the system or the app asks for less. It fills its box, centered.
 */
export function FlowLines({ seed = 3, className }: { seed?: number; className?: string }) {
    const { nodes, edges } = useMemo(() => flowGraph(seed), [seed])
    const litNodes = new Set(edges.filter((edge) => edge.lit).flatMap((edge) => [edge.from, edge.to]))
    const last = nodes.length - 1
    const curve = (edge: FlowEdge) => {
        const from = nodes[edge.from]
        const to = nodes[edge.to]
        const x1 = from.x + NODE_W
        const y1 = from.y + NODE_H / 2
        const x2 = to.x
        const y2 = to.y + NODE_H / 2
        const middle = (x1 + x2) / 2
        return `M${String(x1)} ${String(y1)} C${String(middle)} ${String(y1)} ${String(middle)} ${String(y2)} ${String(x2)} ${String(y2)}`
    }
    return (
        <svg
            data-slot="flow-lines"
            viewBox={`0 0 ${String(WIDE)} ${String(HIGH)}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
            className={cn('size-full', className)}
        >
            {[160, 260, 360, 460, 560, 660].map((radius) => (
                <circle key={radius} cx={WIDE - 60} cy={HIGH / 2} r={radius} fill="none" strokeWidth={1} className="stroke-border/40" />
            ))}
            {edges
                .filter((edge) => !edge.lit)
                .map((edge) => (
                    <path
                        key={`${String(edge.from)}-${String(edge.to)}`}
                        d={curve(edge)}
                        fill="none"
                        strokeWidth={1.5}
                        className="stroke-border"
                    />
                ))}
            {edges
                .filter((edge) => edge.lit)
                .map((edge) => (
                    <g key={`${String(edge.from)}-${String(edge.to)}`}>
                        <path d={curve(edge)} fill="none" strokeWidth={2} className="stroke-primary/45" />
                        <path
                            d={curve(edge)}
                            fill="none"
                            strokeWidth={2}
                            strokeDasharray="12 12"
                            className="animate-[line-flow_1.6s_linear_infinite] stroke-primary"
                        />
                    </g>
                ))}
            {nodes.map((node, index) => {
                const end = index === last
                const on = litNodes.has(index)
                return (
                    <g key={index}>
                        {end && (
                            <rect
                                x={node.x - 8}
                                y={node.y - 8}
                                width={NODE_W + 16}
                                height={NODE_H + 16}
                                className="fill-primary/15 [rx:calc(var(--radius-node)+8px)]"
                            />
                        )}
                        <rect
                            x={node.x}
                            y={node.y}
                            width={NODE_W}
                            height={NODE_H}
                            strokeWidth={1}
                            className={cn(
                                '[rx:var(--radius-node)]',
                                end ? 'fill-primary stroke-primary' : 'fill-card',
                                !end && (on ? 'stroke-primary/50' : 'stroke-border'),
                            )}
                        />
                        <circle
                            cx={node.x + 14}
                            cy={node.y + NODE_H / 2}
                            r={4}
                            className={end ? 'fill-primary-foreground' : on ? 'fill-primary' : 'fill-muted-foreground'}
                        />
                        <rect
                            x={node.x + 26}
                            y={node.y + NODE_H / 2 - 1.5}
                            width={end ? 30 : 24}
                            height={3}
                            className={end ? 'fill-primary-foreground' : 'fill-muted-foreground/40'}
                        />
                    </g>
                )
            })}
        </svg>
    )
}
