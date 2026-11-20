import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { useLocale, useWords, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { useMapContext, type MapCorner } from './context'
import { distance, formatCoordinates, roundScale, UNIT_SYMBOLS, type CoordinateFormat, type DistanceUnit } from './geodesy'
import type { LngLat } from './geometry'

/** The words a coordinate readout says. */
export interface MapCoordinatesWords {
    /** What the readout is, for a screen reader. */
    label: string
    /** Said in place of a position while the cursor is off the map. */
    offscreen: string
    /** The letters of the hemispheres a position is written with. */
    north: string
    south: string
    east: string
    west: string
}

export const MAP_COORDINATES_WORDS: MapCoordinatesWords = {
    label: 'Cursor position',
    offscreen: 'Offscreen',
    north: 'N',
    south: 'S',
    east: 'E',
    west: 'W',
}

/** Where a catalog holds a coordinate readout's words. */
export const MAP_COORDINATES_PART: WordsPart<MapCoordinatesWords> = { id: 'mapCoordinates', words: MAP_COORDINATES_WORDS }

/** The longest a scale bar is drawn, in pixels. */
const SCALE_WIDTH = 96

/** A scale bar's round length for a map at a zoom: its width in pixels and what it says. */
export interface ScaleBar {
    width: number
    text: string
}

/**
 * The scale bar for a map whose `meters` span `pixels` across its middle: the longest round length
 * that fits in `maxWidth` pixels, written in the unit, or in meters below a kilometer.
 */
export function scaleBar(meters: number, pixels: number, unit: DistanceUnit, locale = 'en-US', maxWidth = SCALE_WIDTH): ScaleBar | null {
    if (!(meters > 0) || !(pixels > 0)) return null
    const perPixel = meters / pixels
    const round = roundScale(perPixel * maxWidth, unit)
    if (round.meters === 0) return null
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(round.value)
    return { width: Math.round(round.meters / perPixel), text: `${number} ${round.small ? 'm' : UNIT_SYMBOLS[unit]}` }
}

export interface MapCoordinatesProps {
    /** The corner it stands in; the bottom left by default. */
    corner?: MapCorner
    /** How the position is written: decimal degrees, or degrees, minutes and seconds. */
    format?: CoordinateFormat
    /** Draws a scale bar before the position. */
    scale?: boolean
    /** The unit the scale bar is written in. */
    unit?: DistanceUnit
    className?: string
    words?: Partial<MapCoordinatesWords>
}

/**
 * Where the cursor is on the map, latitude first (`60.3913° N, 5.3221° E`), or Offscreen while it
 * is off the map, after a scale bar of a round length that follows the zoom. It stands in a corner
 * of the map, the bottom left by default.
 */
export function MapCoordinates({
    corner = 'bottom-left',
    format = 'decimal',
    scale = true,
    unit = 'km',
    className,
    words,
}: MapCoordinatesProps) {
    const { map, corners } = useMapContext()
    const said = useWords(MAP_COORDINATES_PART, words)
    const locale = useLocale()
    const [cursor, setCursor] = useState<LngLat | null>(null)
    const [bar, setBar] = useState<ScaleBar | null>(null)

    useEffect(() => {
        const move = (event: { lngLat: { lng: number; lat: number } }) => setCursor([event.lngLat.lng, event.lngLat.lat])
        const out = () => setCursor(null)
        map.on('mousemove', move)
        map.on('mouseout', out)
        return () => {
            map.off('mousemove', move)
            map.off('mouseout', out)
        }
    }, [map])

    useEffect(() => {
        if (!scale) return
        const measure = () => {
            const canvas = map.getContainer()
            const y = canvas.clientHeight / 2
            const x = canvas.clientWidth / 2
            const left = map.unproject([x - 50, y])
            const right = map.unproject([x + 50, y])
            const next = scaleBar(distance([left.lng, left.lat], [right.lng, right.lat]), 100, unit, locale)
            setBar((previous) => (previous?.width === next?.width && previous?.text === next?.text ? previous : next))
        }
        measure()
        map.on('move', measure)
        map.on('resize', measure)
        return () => {
            map.off('move', measure)
            map.off('resize', measure)
        }
    }, [map, scale, unit, locale])

    const text = cursor === null ? said.offscreen : formatCoordinates(cursor, format, said, locale)
    return createPortal(
        <div
            role="group"
            aria-label={said.label}
            className={cn(
                'flex items-center gap-3 self-start rounded-control bg-card/95 px-2 py-1 text-xs text-card-foreground tabular-nums shadow-surface ring-1 ring-foreground/10',
                className,
            )}
        >
            {scale && bar !== null && (
                <span className="flex shrink-0 flex-col items-start gap-0.5 text-2xs leading-none text-muted-foreground">
                    {bar.text}
                    <span aria-hidden className="h-1 border-x border-b border-foreground/70" style={{ width: bar.width }} />
                </span>
            )}
            <output aria-live="off" className={cn('min-w-44 whitespace-nowrap', cursor === null && 'text-muted-foreground')}>
                {text}
            </output>
        </div>,
        corners[corner],
    )
}
