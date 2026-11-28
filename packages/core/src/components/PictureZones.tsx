import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'

/** A point of a picture, in shares of its width and height from its top left corner. */
export type PicturePoint = readonly [x: number, y: number]

/** How a zone stands out: the primary color, or a warning or critical tone for one that raises alerts. */
export type ZoneTone = 'primary' | 'warning' | 'critical'

/**
 * A part of a picture a finder watches: a `region` (a closed shape, three points or more) or a
 * `line` (a tripwire, two points or more) that something crossing raises.
 */
export interface PictureZone {
    id: string
    name: string
    kind: 'region' | 'line'
    points: readonly PicturePoint[]
    tone?: ZoneTone
}

export interface PictureZonesWords {
    /** What the layer is called to a screen reader. */
    zones: string
    /** A corner's handle, by its zone's name and its place in it. */
    point: (zone: string, place: number) => string
    /** What drawing asks of the viewer. */
    drawing: string
}

export const PICTURE_ZONES_WORDS: PictureZonesWords = {
    zones: 'Zones',
    point: (zone, place) => `Point ${place.toLocaleString('en-US')} of ${zone}`,
    drawing: 'Click to add points, then press Enter to finish',
}

/** Where a catalog holds a picture zones layer's words, and the arguments its phrases name. */
export const PICTURE_ZONES_PART: WordsPart<PictureZonesWords> = {
    id: 'pictureZones',
    words: PICTURE_ZONES_WORDS,
    args: { point: 'zone place' },
}

/** A picture zones layer's phrases as ICU messages in English, for the catalog. */
export const PICTURE_ZONES_MESSAGES: WordMessages<PictureZonesWords> = {
    point: 'Point {place, number} of {zone}',
}

export interface PictureZonesProps {
    zones: readonly PictureZone[]
    /** The zone drawn as chosen; with `onChange` its corners have handles to move. */
    selected?: string
    /** Makes each zone pressable: a press picks it. */
    onSelect?: (id: string | undefined) => void
    /** Makes the selected zone's corners movable, by dragging or with the arrow keys; called with every zone, the moved one changed. */
    onChange?: (zones: PictureZone[]) => void
    /** Draws a new zone of this kind: each press adds a point, Enter or a double press finishes and Escape gives up. */
    draw?: 'region' | 'line'
    /** Called with the points of a zone drawn, once it has enough (three for a region, two for a line). */
    onDrawn?: (points: PicturePoint[]) => void
    /** Called when drawing is given up. */
    onDrawCancel?: () => void
    words?: Partial<PictureZonesWords>
    className?: string
}

/** Each tone's stroke and fill, as raw tokens. */
const TONE: Record<ZoneTone, string> = { primary: 'var(--primary)', warning: 'var(--warning)', critical: 'var(--critical)' }

/** How far an arrow key moves a corner, as a share of the picture; Shift moves five times as far. */
const NUDGE = 0.01

/**
 * The parts of a picture a finder watches, drawn over it: regions as tinted shapes and tripwires as
 * lines, each in its tone with its name at its first point. Inside a `VideoPlayer`'s `picture` they
 * move with the view. With `onSelect` a press picks a zone; with `onChange` the selected zone's
 * corners are handles a viewer drags, or moves with the arrow keys; with `draw` each press adds a
 * point of a new zone, and Enter or a double press hands its points to `onDrawn`.
 */
export function PictureZones({
    zones,
    selected,
    onSelect,
    onChange,
    draw,
    onDrawn,
    onDrawCancel,
    words: given,
    className,
}: PictureZonesProps) {
    const words = useWords(PICTURE_ZONES_PART, given)
    const layer = useRef<HTMLDivElement>(null)
    const [drawn, setDrawn] = useState<PicturePoint[]>([])
    const dragging = useRef<{ zone: string; index: number } | null>(null)

    const pointAt = (event: { clientX: number; clientY: number }): PicturePoint => {
        const box = layer.current?.getBoundingClientRect()
        if (box === undefined || box.width === 0 || box.height === 0) return [0, 0]
        return [clamp((event.clientX - box.left) / box.width), clamp((event.clientY - box.top) / box.height)]
    }
    const moved = (zone: string, index: number, to: PicturePoint) =>
        zones.map((one) => (one.id === zone ? { ...one, points: one.points.map((point, at) => (at === index ? to : point)) } : one))
    const finish = () => {
        // A double press is two presses too; points on top of the one before them are dropped.
        const kept = drawn.filter((point, at) => at === 0 || Math.hypot(point[0] - drawn[at - 1][0], point[1] - drawn[at - 1][1]) > 0.005)
        if (draw !== undefined && kept.length >= (draw === 'region' ? 3 : 2)) onDrawn?.(kept)
        setDrawn([])
    }

    const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>, zone: PictureZone, index: number) => {
        const step = event.shiftKey ? NUDGE * 5 : NUDGE
        const by: Record<string, PicturePoint> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
        const move = by[event.key] as PicturePoint | undefined
        if (move === undefined || onChange === undefined) return
        event.preventDefault()
        const [x, y] = zone.points[index]
        onChange(moved(zone.id, index, [clamp(x + move[0]), clamp(y + move[1])]))
    }

    return (
        <div
            ref={layer}
            role="group"
            aria-label={words.zones}
            data-slot="picture-zones"
            className={cn('pointer-events-none absolute inset-0', className)}
        >
            <svg aria-hidden viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                {zones.map((zone) => {
                    const color = TONE[zone.tone ?? 'primary']
                    const points = zone.points.map(([x, y]) => `${String(x)},${String(y)}`).join(' ')
                    const isSelected = zone.id === selected
                    const shared = {
                        points,
                        stroke: color,
                        strokeWidth: isSelected ? 3 : 2,
                        strokeLinejoin: 'round' as const,
                        strokeLinecap: 'round' as const,
                        vectorEffect: 'non-scaling-stroke' as const,
                        className: cn(onSelect !== undefined && draw === undefined && 'pointer-events-auto cursor-pointer'),
                        onClick:
                            onSelect === undefined || draw !== undefined ? undefined : () => onSelect(isSelected ? undefined : zone.id),
                    }
                    return zone.kind === 'region' ? (
                        <polygon key={zone.id} data-zone={zone.id} {...shared} fill={color} fillOpacity={isSelected ? 0.25 : 0.12} />
                    ) : (
                        <polyline
                            key={zone.id}
                            data-zone={zone.id}
                            {...shared}
                            fill="none"
                            strokeDasharray={isSelected ? undefined : '6 4'}
                        />
                    )
                })}
                {drawn.length > 0 && draw !== undefined && (
                    <polyline
                        points={drawn.map(([x, y]) => `${String(x)},${String(y)}`).join(' ')}
                        fill="none"
                        stroke={TONE.primary}
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </svg>

            {zones.map((zone) => {
                const [x, y] = zone.points[0] ?? [0, 0]
                return (
                    <span
                        key={zone.id}
                        data-slot="zone-name"
                        className="absolute -translate-y-full rounded-mini bg-terminal/80 px-1 text-2xs font-medium whitespace-nowrap text-terminal-foreground"
                        style={{ left: `${String(x * 100)}%`, top: `calc(${String(y * 100)}% - 0.25rem)` }}
                    >
                        {zone.name}
                    </span>
                )
            })}

            {onChange !== undefined &&
                draw === undefined &&
                zones
                    .filter((zone) => zone.id === selected)
                    .flatMap((zone) =>
                        zone.points.map(([x, y], index) => (
                            <button
                                key={`${zone.id}-${String(index)}`}
                                type="button"
                                data-slot="zone-handle"
                                aria-label={words.point(zone.name, index + 1)}
                                onKeyDown={(event) => onHandleKey(event, zone, index)}
                                onPointerDown={(event) => {
                                    event.stopPropagation()
                                    event.currentTarget.setPointerCapture(event.pointerId)
                                    dragging.current = { zone: zone.id, index }
                                }}
                                onPointerMove={(event: PointerEvent<HTMLButtonElement>) => {
                                    const held = dragging.current
                                    if (held !== null && held.zone === zone.id && held.index === index)
                                        onChange(moved(zone.id, index, pointAt(event)))
                                }}
                                onPointerUp={(event) => {
                                    event.stopPropagation()
                                    dragging.current = null
                                }}
                                onClick={(event) => event.stopPropagation()}
                                className="pointer-events-auto absolute size-3 -translate-1/2 cursor-move touch-none rounded-full border-2 border-terminal bg-terminal-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                style={{ left: `${String(x * 100)}%`, top: `${String(y * 100)}%` }}
                            />
                        )),
                    )}

            {draw !== undefined && (
                <div
                    role="application"
                    aria-label={words.drawing}
                    tabIndex={0}
                    data-slot="zone-draw"
                    onPointerUp={(event) => {
                        event.stopPropagation()
                        setDrawn((points) => [...points, pointAt(event)])
                    }}
                    onDoubleClick={(event) => {
                        event.stopPropagation()
                        finish()
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault()
                            finish()
                        } else if (event.key === 'Escape') {
                            event.preventDefault()
                            setDrawn([])
                            onDrawCancel?.()
                        }
                    }}
                    className="pointer-events-auto absolute inset-0 cursor-crosshair outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                    <span className="absolute start-2 bottom-2 rounded-mini bg-terminal/80 px-1.5 py-0.5 text-2xs text-terminal-foreground">
                        {words.drawing}
                    </span>
                    {drawn.map(([x, y], index) => (
                        <span
                            key={index}
                            aria-hidden
                            className="absolute size-2 -translate-1/2 rounded-full bg-primary"
                            style={{ left: `${String(x * 100)}%`, top: `${String(y * 100)}%` }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function clamp(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}
