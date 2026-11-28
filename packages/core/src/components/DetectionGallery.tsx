import { useRef } from 'react'

import { cn } from '../lib/cn'
import { cropAround, cropBackground, type DetectionBox } from '../lib/detections'
import { formatPercent } from '../lib/percent'
import { TRACK_COLORS, type TrackAffiliation } from '../lib/tracks'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { Columns } from './Layout'

/** One time something was seen: where, when, and a frame to show it by. */
export interface Sighting {
    id: string
    /** What was seen, such as person or vehicle. */
    label?: string
    affiliation?: TrackAffiliation
    /** Where it was seen, such as the camera's name. */
    place?: string
    /** When it was seen, as the app writes it. */
    when: string
    /** A frame of the video it was seen in, or a crop of it already made. */
    image: string
    /** The detection's box in the frame, in shares of it; the tile shows a square around it. Without it, the whole image. */
    box?: DetectionBox
    /** The frame's width for each unit of its height; 16:9 by default. */
    aspect?: number
    /** How sure the finder was, from 0 to 1. */
    confidence?: number
    /** A short clip of the sighting, played muted while the pointer rests on its tile. */
    preview?: string
    /** It calls for a look: ringed in the critical color. */
    alert?: boolean
}

export interface DetectionGalleryWords {
    /** A sighting as a button, by what it is and when. */
    open: (name: string, when: string) => string
}

export const DETECTION_GALLERY_WORDS: DetectionGalleryWords = {
    open: (name, when) => `Go to ${name} at ${when}`,
}

/** Where a catalog holds a detection gallery's words, and the arguments its phrases name. */
export const DETECTION_GALLERY_PART: WordsPart<DetectionGalleryWords> = {
    id: 'detectionGallery',
    words: DETECTION_GALLERY_WORDS,
    args: { open: 'name when' },
}

/** A detection gallery's phrases as ICU messages in English, for the catalog. */
export const DETECTION_GALLERY_MESSAGES: WordMessages<DetectionGalleryWords> = {
    open: 'Go to {name} at {when}',
}

export interface DetectionGalleryProps {
    sightings: readonly Sighting[]
    /** The sighting drawn as chosen. */
    selected?: string
    /** Makes each tile a button that picks its sighting, such as to seek the player to it. */
    onSelect?: (id: string) => void
    /** How a confidence is written; a whole percent by default. */
    format?: (value: number) => string
    /** The narrowest a tile gets before the gallery takes a column away. */
    min?: 'xs' | 'sm' | 'md'
    words?: Partial<DetectionGalleryWords>
    className?: string
}

/**
 * Each time something was seen, as a tile: a square crop of the frame around it, taken in the browser
 * from the frame and the box the app hands in, with how sure the finder was over its corner, and under
 * it what it is (a dot in its affiliation's color), where and when. A tile with a `preview` plays it
 * muted while the pointer rests on it. With `onSelect` each tile is a button, so a press can take the
 * player to the moment; one that calls for a look is ringed in the critical color.
 */
export function DetectionGallery({
    sightings,
    selected,
    onSelect,
    format = formatPercent,
    min = 'xs',
    words: given,
    className,
}: DetectionGalleryProps) {
    const words = useWords(DETECTION_GALLERY_PART, given)
    return (
        <Columns count="fill" min={min} gap="sm" className={className}>
            {sightings.map((sighting) => (
                <SightingTile
                    key={sighting.id}
                    sighting={sighting}
                    isSelected={sighting.id === selected}
                    format={format}
                    label={words.open(sighting.label ?? sighting.id, sighting.when)}
                    onPress={onSelect === undefined ? undefined : () => onSelect(sighting.id)}
                />
            ))}
        </Columns>
    )
}

interface SightingTileProps {
    sighting: Sighting
    isSelected: boolean
    format: (value: number) => string
    label: string
    onPress?: () => void
}

function SightingTile({ sighting, isSelected, format, label, onPress }: SightingTileProps) {
    const clip = useRef<HTMLVideoElement>(null)
    const crop = sighting.box === undefined ? { x: 0, y: 0, w: 1, h: 1 } : cropAround(sighting.box, sighting.aspect ?? 16 / 9)
    const Tile = onPress === undefined ? 'div' : 'button'
    return (
        <Tile
            type={onPress === undefined ? undefined : 'button'}
            aria-label={onPress === undefined ? undefined : label}
            aria-pressed={onPress === undefined ? undefined : isSelected}
            data-slot="sighting"
            data-selected={isSelected || undefined}
            data-alert={sighting.alert === true || undefined}
            onClick={onPress}
            onPointerEnter={() => void clip.current?.play().catch(() => undefined)}
            onPointerLeave={() => {
                clip.current?.pause()
            }}
            className={cn(
                'group flex min-w-0 flex-col gap-1.5 rounded-surface p-1 text-start outline-none',
                onPress !== undefined && 'cursor-pointer hover:bg-hover focus-visible:ring-3 focus-visible:ring-ring/50',
                isSelected && 'bg-primary/10 ring-1 ring-primary',
            )}
        >
            <span
                className={cn(
                    'relative block aspect-square overflow-hidden rounded-control bg-terminal bg-no-repeat',
                    sighting.alert === true && 'ring-2 ring-critical',
                )}
                style={{ backgroundImage: `url("${sighting.image}")`, ...cropBackground(crop) }}
            >
                {sighting.preview !== undefined && (
                    <video
                        ref={clip}
                        src={sighting.preview}
                        muted
                        loop
                        playsInline
                        preload="none"
                        className="absolute inset-0 size-full object-cover opacity-0 transition-opacity group-hover:opacity-100"
                    />
                )}
                {sighting.confidence !== undefined && (
                    <span className="absolute end-1 top-1 rounded-mini bg-terminal/75 px-1 text-2xs font-medium text-terminal-foreground tabular-nums">
                        {format(sighting.confidence)}
                    </span>
                )}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 px-0.5 text-xs font-medium">
                <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: sighting.affiliation === undefined ? 'var(--primary)' : TRACK_COLORS[sighting.affiliation] }}
                />
                <span className="truncate">{sighting.label ?? sighting.id}</span>
            </span>
            <span className="truncate px-0.5 text-2xs text-muted-foreground">
                {[sighting.place, sighting.when].filter(Boolean).join(' · ')}
            </span>
        </Tile>
    )
}
