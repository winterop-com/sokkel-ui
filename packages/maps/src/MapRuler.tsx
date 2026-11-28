'use client'

import type { Feature, FeatureCollection } from 'geojson'
import { Ruler } from 'lucide-react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useLocale, useWords, type WordMessages, type WordsPart } from '@winterop-com/sokkel-ui/lib/words'
import { resolveColors } from './color'
import { useMapContext, type MapCorner } from './context'
import { ControlButton } from './control'
import { bearing, distance, formatBearing, formatDistance, greatCircle, type DistanceUnit } from './geodesy'
import type { LngLat } from './geometry'

/** The words a ruler says. */
export interface MapRulerWords {
    /** The button that turns the ruler on and off. */
    measure: string
    /** The measurement as its chip says it: the distance, then the bearing from the first point. */
    measured: (distance: string, bearing: string) => string
}

export const MAP_RULER_WORDS: MapRulerWords = {
    measure: 'Measure a distance',
    measured: (distance, bearing) => `${distance} · ${bearing}`,
}

/** Where a catalog holds a ruler's words, and the arguments its phrases name. */
export const MAP_RULER_PART: WordsPart<MapRulerWords> = {
    id: 'mapRuler',
    words: MAP_RULER_WORDS,
    args: { measured: 'distance bearing' },
}

/** A ruler's phrases as ICU messages in English, for the catalog. */
export const MAP_RULER_MESSAGES: WordMessages<MapRulerWords> = {
    measured: '{distance} · {bearing}',
}

/** What a ruler measured: its two ends, the distance between them in meters and the bearing from the first. */
export interface Measurement {
    from: LngLat
    to: LngLat
    meters: number
    bearing: number
}

/** The measurement between two points. */
export function measure(from: LngLat, to: LngLat): Measurement {
    return { from, to, meters: distance(from, to), bearing: bearing(from, to) }
}

/** The ruler's line along the great circle, and its two ends as points. */
export function rulerShape(from: LngLat, to: LngLat | null): FeatureCollection {
    const ends: Feature[] = [from, ...(to === null ? [] : [to])].map((at) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: at },
    }))
    if (to === null) return { type: 'FeatureCollection', features: ends }
    return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: greatCircle(from, to, 48) } }, ...ends],
    }
}

export interface MapRulerProps {
    /** Whether the ruler is on, when the caller holds it. */
    active?: boolean
    /** Whether the ruler opens on, when it holds that itself. */
    defaultActive?: boolean
    onActiveChange?: (active: boolean) => void
    /** The two points it opens measuring between, while it is on. */
    defaultPoints?: [LngLat, LngLat]
    /** The unit the distance is written in: kilometers by default, miles or nautical miles. */
    unit?: DistanceUnit
    /** Called with each finished measurement, and with null when it is cleared. */
    onMeasure?: (measurement: Measurement | null) => void
    /** The corner its button stands in; the top right, under the map's own controls, by default. */
    corner?: MapCorner
    /** Draws the button that turns it on and off; off for an app that holds `active` from its own toolbar. */
    button?: boolean
    words?: Partial<MapRulerWords>
}

/**
 * A ruler over the map: while it is on, a click sets its first point, the line follows the cursor
 * to wherever the second click sets the other, and a chip at the line's middle says the distance
 * along the great circle and the bearing from the first point (`38.1 km · 047°`). A third click
 * starts again, and Escape clears it. Clicks measure rather than select while it is on.
 */
export function MapRuler({
    active,
    defaultActive = false,
    onActiveChange,
    defaultPoints,
    unit = 'km',
    onMeasure,
    corner = 'top-right',
    button = true,
    words,
}: MapRulerProps) {
    const { map, scope, overlay, corners, reading, takeClicks } = useMapContext()
    const said = useWords(MAP_RULER_PART, words)
    const locale = useLocale()
    const [held, setHeld] = useState(defaultActive)
    const on = active ?? held
    const [from, setFrom] = useState<LngLat | null>(defaultPoints?.[0] ?? null)
    const [to, setTo] = useState<LngLat | null>(defaultPoints?.[1] ?? null)
    const [cursor, setCursor] = useState<LngLat | null>(null)
    const source = `wui-ruler-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

    const turn = useCallback(
        (next: boolean) => {
            if (active === undefined) setHeld(next)
            onActiveChange?.(next)
        },
        [active, onActiveChange],
    )

    useEffect(() => {
        if (on) return
        setFrom(null)
        setTo(null)
        setCursor(null)
    }, [on])

    useEffect(() => {
        if (!on) return
        takeClicks((at) => {
            if (from === null || to !== null) {
                setFrom(at)
                setTo(null)
                onMeasure?.(null)
            } else {
                setTo(at)
                onMeasure?.(measure(from, at))
            }
        })
        return () => takeClicks(null)
    }, [on, from, to, takeClicks, onMeasure])

    useEffect(() => {
        if (!on || from === null || to !== null) return
        const move = (event: { lngLat: { lng: number; lat: number } }) => setCursor([event.lngLat.lng, event.lngLat.lat])
        map.on('mousemove', move)
        return () => {
            map.off('mousemove', move)
        }
    }, [map, on, from, to])

    useEffect(() => {
        if (!on) return
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return
            if (from === null) turn(false)
            setFrom(null)
            setTo(null)
            onMeasure?.(null)
        }
        scope.addEventListener('keydown', escape)
        return () => scope.removeEventListener('keydown', escape)
    }, [scope, on, from, turn, onMeasure])

    const end = to ?? cursor
    const shape = useMemo(() => (from === null ? null : rulerShape(from, end)), [from, end])

    const palette = useMemo(() => resolveColors(scope, { ink: 'var(--foreground)', casing: 'var(--card)' }), [scope, reading])
    useEffect(() => {
        if (!on) return
        map.addSource(source, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addLayer({
            id: `${source}-casing`,
            type: 'line',
            source,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': palette.casing, 'line-width': 4, 'line-opacity': 0.8 },
        })
        map.addLayer({
            id: `${source}-line`,
            type: 'line',
            source,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': palette.ink, 'line-width': 1.75, 'line-dasharray': [3, 2] },
        })
        map.addLayer({
            id: `${source}-ends`,
            type: 'circle',
            source,
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
                'circle-radius': 3.5,
                'circle-color': palette.ink,
                'circle-stroke-color': palette.casing,
                'circle-stroke-width': 1.5,
            },
        })
        return () => {
            for (const layer of ['ends', 'line', 'casing'])
                if (map.getLayer(`${source}-${layer}`) !== undefined) map.removeLayer(`${source}-${layer}`)
            if (map.getSource(source) !== undefined) map.removeSource(source)
        }
        // The colors are set in place below; the layers are made once per time the ruler is turned on.
    }, [map, on, source])

    useEffect(() => {
        if (!on || map.getLayer(`${source}-line`) === undefined) return
        map.setPaintProperty(`${source}-casing`, 'line-color', palette.casing)
        map.setPaintProperty(`${source}-line`, 'line-color', palette.ink)
        map.setPaintProperty(`${source}-ends`, 'circle-color', palette.ink)
        map.setPaintProperty(`${source}-ends`, 'circle-stroke-color', palette.casing)
    }, [map, on, source, palette])

    useEffect(() => {
        if (!on) return
        ;(map.getSource(source) as GeoJSONSource | undefined)?.setData(shape ?? { type: 'FeatureCollection', features: [] })
    }, [map, on, source, shape])

    // Where the chip stands: the middle of the line, measured again as the map moves.
    const middle = from !== null && end !== null ? greatCircle(from, end, 2)[1] : null
    const [chip, setChip] = useState<{ x: number; y: number } | null>(null)
    const middleKey = middle === null ? '' : middle.join(',')
    useEffect(() => {
        if (middleKey === '') {
            setChip(null)
            return
        }
        const [lng, lat] = middleKey.split(',').map(Number)
        const place = () => {
            const point = map.project([lng, lat])
            setChip({ x: Math.round(point.x), y: Math.round(point.y) })
        }
        place()
        map.on('move', place)
        return () => {
            map.off('move', place)
        }
    }, [map, middleKey])

    const shown = from !== null && end !== null ? measure(from, end) : null
    return (
        <>
            {button &&
                createPortal(
                    <ControlButton label={said.measure} container={scope} corner={corner} pressed={on} onClick={() => turn(!on)}>
                        <Ruler />
                    </ControlButton>,
                    corners[corner],
                )}
            {on &&
                shown !== null &&
                chip !== null &&
                createPortal(
                    <span
                        role="status"
                        className="absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] rounded-control bg-card px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground tabular-nums shadow-surface ring-1 ring-foreground/10"
                        style={{ left: chip.x, top: chip.y }}
                    >
                        {said.measured(formatDistance(shown.meters, unit, locale), formatBearing(shown.bearing))}
                    </span>,
                    overlay,
                )}
        </>
    )
}
