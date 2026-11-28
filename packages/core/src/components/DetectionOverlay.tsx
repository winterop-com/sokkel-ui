import type { CSSProperties } from 'react'

import { cn } from '../lib/cn'
import { detectionAt, detectionTrail, type Detection, type DetectionBox, type DetectionSample } from '../lib/detections'
import { formatPercent } from '../lib/percent'
import { TRACK_COLORS } from '../lib/tracks'
import { useWords, type WordsPart } from '../lib/words'
import { useVideoPicture, useVideoTime } from './media/video-picture'

export type { Detection, DetectionSample }

/**
 * How a detection is drawn: `box`, its whole outline; `brackets`, only its four corners, which hide
 * less of what is inside; `marker`, a dot at its center, for a crowd too dense for outlines.
 */
export type DetectionLook = 'box' | 'brackets' | 'marker'

export interface DetectionOverlayWords {
    /** What the layer is called to a screen reader. */
    detections: string
    /** A detection's name when it has no label. */
    detection: string
}

export const DETECTION_OVERLAY_WORDS: DetectionOverlayWords = { detections: 'Detections', detection: 'Detection' }

/** Where a catalog holds a detection overlay's words. */
export const DETECTION_OVERLAY_PART: WordsPart<DetectionOverlayWords> = { id: 'detectionOverlay', words: DETECTION_OVERLAY_WORDS }

export interface DetectionOverlayProps {
    detections: readonly Detection[]
    /**
     * The moment to draw, in seconds of the video. Inside a `VideoPlayer`'s `picture` it follows the
     * video frame by frame without it; give it to draw over a still, or to drive it from outside.
     */
    time?: number
    /** Seconds added to the time before the samples are read, for detections timed against another stream than the one shown. */
    offset?: number
    /** How long a box stays after its last sample, in seconds. */
    hold?: number
    /** The longest gap between two samples a box glides across, in seconds. */
    gap?: number
    /** How many seconds of its path each detection draws behind it, as a fading line; none at 0. */
    trail?: number
    look?: DetectionLook
    /** Each tag also says the detection's id after its label. */
    ids?: boolean
    /** How a confidence is written; a whole percent by default. */
    format?: (value: number) => string
    /** The id of the detection drawn as selected; the rest step back. */
    selected?: string
    /** Makes each detection pressable: a press selects it, and a press on the selected one lets it go (`undefined`). */
    onSelect?: (id: string | undefined) => void
    words?: Partial<DetectionOverlayWords>
    className?: string
}

/**
 * What a finder sees in a video, drawn over the picture: each detection's box at the moment shown,
 * with a tag at its top edge saying what it is and how sure the finder was, in the color of its
 * affiliation as a map draws its track (the primary color without one). Inside a `VideoPlayer`'s
 * `picture` it reads the video's time on every frame, so the boxes move with what they hold, gliding
 * between samples and holding briefly after the last one.
 *
 * The app finds the detections, with whatever finder it runs, and hands them here as samples; the
 * overlay never looks at the picture. The selected detection is drawn heavier, on a tint, and the
 * rest step back; with `onSelect` each is a button, so a list or a map beside the video can follow
 * the same one.
 */
export function DetectionOverlay({
    detections,
    time,
    offset = 0,
    hold,
    gap,
    trail = 0,
    look = 'box',
    ids = false,
    format = formatPercent,
    selected,
    onSelect,
    words: given,
    className,
}: DetectionOverlayProps) {
    const words = useWords(DETECTION_OVERLAY_PART, given)
    const video = useVideoPicture()
    const played = useVideoTime(time === undefined ? video : null)
    const now = (time ?? played) + offset
    const timing = { hold, gap }
    const shown = detections.flatMap((detection) => {
        const box = detectionAt(detection, now, timing)
        return box === undefined ? [] : [{ detection, box }]
    })
    return (
        <div role="group" aria-label={words.detections} className={cn('pointer-events-none absolute inset-0', className)}>
            {trail > 0 && (
                <svg aria-hidden viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                    {shown.map(({ detection }) => {
                        const points = detectionTrail(detection, now, trail, timing)
                        if (points.length < 2) return null
                        return (
                            <polyline
                                key={detection.id}
                                points={points.map((point) => `${String(point.x)},${String(point.y)}`).join(' ')}
                                fill="none"
                                stroke={colorOf(detection)}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                                className={cn('opacity-60', selected !== undefined && selected !== detection.id && 'opacity-25')}
                            />
                        )
                    })}
                </svg>
            )}
            {shown.map(({ detection, box }) => (
                <DetectionMark
                    key={detection.id}
                    detection={detection}
                    box={box}
                    look={look}
                    tag={tagOf(detection, box, ids, format)}
                    name={`${detection.label ?? words.detection} ${detection.id}`}
                    isSelected={selected === detection.id}
                    stepsBack={selected !== undefined && selected !== detection.id}
                    onPress={onSelect === undefined ? undefined : () => onSelect(selected === detection.id ? undefined : detection.id)}
                />
            ))}
        </div>
    )
}

interface DetectionMarkProps {
    detection: Detection
    box: DetectionBox
    look: DetectionLook
    tag: string
    name: string
    isSelected: boolean
    stepsBack: boolean
    onPress?: () => void
}

/** One detection: its outline, corners or dot in its color, and its tag above. */
function DetectionMark({ detection, box, look, tag, name, isSelected, stepsBack, onPress }: DetectionMarkProps) {
    const style = {
        '--detection': colorOf(detection),
        left: `${String(clamp(box.x) * 100)}%`,
        top: `${String(clamp(box.y) * 100)}%`,
        width: `${String(clamp(box.w) * 100)}%`,
        height: `${String(clamp(box.h) * 100)}%`,
    } as CSSProperties
    const Mark = onPress === undefined ? 'span' : 'button'
    return (
        <Mark
            type={onPress === undefined ? undefined : 'button'}
            aria-label={onPress === undefined ? undefined : name}
            aria-pressed={onPress === undefined ? undefined : isSelected}
            data-selected={isSelected || undefined}
            data-look={look}
            onClick={
                onPress === undefined
                    ? undefined
                    : (event) => {
                          event.stopPropagation()
                          onPress()
                      }
            }
            onPointerUp={onPress === undefined ? undefined : (event) => event.stopPropagation()}
            onDoubleClick={onPress === undefined ? undefined : (event) => event.stopPropagation()}
            className={cn(
                'absolute block rounded-mini transition-opacity duration-fast outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                onPress !== undefined && 'pointer-events-auto cursor-pointer',
                look === 'box' && 'border-2 border-(--detection)',
                look === 'box' && isSelected && 'border-3 bg-(--detection)/15',
                look === 'brackets' && isSelected && 'bg-(--detection)/15',
                stepsBack && 'opacity-45',
            )}
            style={style}
        >
            {look === 'brackets' && <Brackets heavy={isSelected} />}
            {look === 'marker' && (
                <span
                    aria-hidden
                    className={cn(
                        'absolute top-1/2 left-1/2 size-2.5 -translate-1/2 rounded-full border-2 border-terminal bg-(--detection)',
                        isSelected && 'size-3.5 ring-2 ring-(--detection)/50',
                    )}
                />
            )}
            {tag !== '' && (
                <span
                    aria-hidden={onPress !== undefined || undefined}
                    className={cn(
                        'absolute flex items-center gap-1 rounded-mini bg-terminal/80 px-1 text-2xs font-medium whitespace-nowrap text-terminal-foreground tabular-nums',
                        look === 'marker'
                            ? 'top-1/2 left-1/2 mt-2.5 -translate-x-1/2'
                            : box.y < 0.06
                              ? 'top-0.5 left-0.5'
                              : '-top-1 -left-0.5 -translate-y-full',
                    )}
                >
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--detection)" />
                    {tag}
                </span>
            )}
        </Mark>
    )
}

/** The four corners of a box, each an L along its two edges. */
function Brackets({ heavy }: { heavy: boolean }) {
    const corner = 'absolute size-3 max-h-1/2 max-w-1/2 border-(--detection)'
    return (
        <span aria-hidden>
            <span className={cn(corner, 'top-0 left-0 rounded-tl-mini', heavy ? 'border-t-3 border-l-3' : 'border-t-2 border-l-2')} />
            <span className={cn(corner, 'top-0 right-0 rounded-tr-mini', heavy ? 'border-t-3 border-r-3' : 'border-t-2 border-r-2')} />
            <span className={cn(corner, 'bottom-0 left-0 rounded-bl-mini', heavy ? 'border-b-3 border-l-3' : 'border-b-2 border-l-2')} />
            <span className={cn(corner, 'right-0 bottom-0 rounded-br-mini', heavy ? 'border-r-3 border-b-3' : 'border-r-2 border-b-2')} />
        </span>
    )
}

function tagOf(detection: Detection, box: DetectionBox, ids: boolean, format: (value: number) => string): string {
    return [detection.label, ids ? detection.id : undefined, box.confidence === undefined ? undefined : format(box.confidence)]
        .filter((part) => part !== undefined)
        .join(' ')
}

function colorOf(detection: Detection): string {
    return detection.affiliation === undefined ? 'var(--primary)' : TRACK_COLORS[detection.affiliation]
}

function clamp(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}
