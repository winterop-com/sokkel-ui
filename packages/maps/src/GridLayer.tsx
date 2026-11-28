import type { ImageSource } from 'maplibre-gl'
import { useEffect, useMemo, useRef } from 'react'

import { labelAnchor } from './basemap'
import { resolveColors } from './color'
import { useMapContext } from './context'
import type { Bounds } from './geometry'
import { classOf, scaleColors, type ColorScale } from './scale'

/**
 * Values on a regular grid of longitude and latitude: `values` holds `rows` rows of `columns`
 * cells, northernmost row first and west to east within a row; null is a cell with no value.
 */
export interface Grid {
    bounds: Bounds
    columns: number
    rows: number
    values: (number | null)[]
}

/** The value of the cell a position falls in, or null outside the grid or in a cell with no value. */
export function gridValueAt(grid: Grid, [lng, lat]: [number, number]): number | null {
    const [west, south, east, north] = grid.bounds
    if (lng < west || lng >= east || lat <= south || lat > north) return null
    const column = Math.floor(((lng - west) / (east - west)) * grid.columns)
    const row = Math.floor(((north - lat) / (north - south)) * grid.rows)
    return grid.values[row * grid.columns + column] ?? null
}

/** The furthest latitude Web Mercator draws. */
const MERCATOR_LIMIT = 85.051129

/** A latitude's height in Web Mercator, unscaled. */
const mercatorY = (lat: number) => {
    const clamped = (Math.max(-MERCATOR_LIMIT, Math.min(MERCATOR_LIMIT, lat)) * Math.PI) / 180
    return Math.log(Math.tan(Math.PI / 4 + clamped / 2))
}

/** How many pixel rows the image of a grid of this many rows is drawn in, so each row's edges land near where they are. */
export const imageRows = (rows: number) => Math.max(rows, Math.min(rows * 4, 4096))

/** The width and height in pixels of a grid's image: one clear pixel for a grid with no cells, as a canvas cannot hold an image of none. */
export function gridImageSize(grid: Pick<Grid, 'columns' | 'rows'>): [width: number, height: number] {
    return grid.columns < 1 || grid.rows < 1 ? [1, 1] : [grid.columns, imageRows(grid.rows)]
}

/**
 * Which of a grid's rows each pixel row of its image shows, northernmost first. The map stretches
 * the image evenly in Web Mercator between the grid's north and south, while the rows are even in
 * latitude, so the pixel rows are spaced evenly in Mercator and each takes the row its latitude
 * falls in.
 */
export function mercatorRows(grid: Pick<Grid, 'bounds' | 'rows'>, height: number): number[] {
    const [, south, , north] = grid.bounds
    const top = mercatorY(north)
    const bottom = mercatorY(south)
    return Array.from({ length: height }, (_, pixel) => {
        const y = top - ((pixel + 0.5) / height) * (top - bottom)
        const lat = (Math.atan(Math.sinh(y)) * 180) / Math.PI
        return Math.min(grid.rows - 1, Math.max(0, Math.floor(((north - lat) / (north - south)) * grid.rows)))
    })
}

export interface GridLayerProps {
    /** Unique among the map's layers. */
    id: string
    grid: Grid
    scale: ColorScale
    opacity?: number
    visible?: boolean
    /** Blends neighboring cells instead of drawing each as a square. */
    smooth?: boolean
}

/**
 * Gridded values, such as rainfall or temperature, drawn as one image over the grid's bounds with
 * every cell in its class color and cells without a value left clear, its rows placed at their
 * latitudes in Web Mercator. It redraws when the grid, the scale or the theme changes.
 */
export function GridLayer({ id, grid, scale, opacity = 0.85, visible = true, smooth = false }: GridLayerProps) {
    const { map, scope, reading, register } = useMapContext()
    const source = `wui-${id}`
    const colors = scaleColors(scale)
    const colorKey = JSON.stringify(colors)
    const image = useMemo(() => {
        const resolved = Object.values(resolveColors(scope, Object.fromEntries(colors.map((color, index) => [String(index), color]))))
        const bytes = resolved.map((color) => {
            const parts = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]
            return [parts[0], parts[1], parts[2], parts[3] === undefined ? 255 : Math.round(parts[3] * 255)]
        })
        const canvas = document.createElement('canvas')
        const [width, height] = gridImageSize(grid)
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (context === null) return ''
        const pixels = context.createImageData(width, height)
        if (grid.columns >= 1 && grid.rows >= 1)
            mercatorRows(grid, height).forEach((row, pixel) => {
                for (let column = 0; column < grid.columns; column += 1) {
                    const index = classOf(scale, grid.values[row * grid.columns + column] ?? null)
                    if (index !== null) pixels.data.set(bytes[index], (pixel * grid.columns + column) * 4)
                }
            })
        context.putImageData(pixels, 0, 0)
        return canvas.toDataURL('image/png')
        // `reading` advances when the theme changes, which is when the same colors resolve anew.
    }, [scope, grid, scale, colorKey, reading])
    const [west, south, east, north] = grid.bounds
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
    ]
    const latest = useRef({ image, coordinates, opacity, visible, smooth })
    useEffect(() => {
        latest.current = { image, coordinates, opacity, visible, smooth }
    })

    useEffect(() => {
        const current = latest.current
        map.addSource(source, { type: 'image', url: current.image, coordinates: current.coordinates })
        map.addLayer(
            {
                id: source,
                type: 'raster',
                source,
                layout: { visibility: current.visible ? 'visible' : 'none' },
                paint: {
                    'raster-opacity': current.opacity,
                    'raster-resampling': current.smooth ? 'linear' : 'nearest',
                    'raster-fade-duration': 0,
                },
            },
            labelAnchor(map),
        )
        return () => {
            if (map.getLayer(source) !== undefined) map.removeLayer(source)
            if (map.getSource(source) !== undefined) map.removeSource(source)
        }
    }, [map, source])

    const added = useRef(image)
    const placement = JSON.stringify(coordinates)
    useEffect(() => {
        if (added.current === image && placement === JSON.stringify(latest.current.coordinates)) return
        ;(map.getSource(source) as ImageSource | undefined)?.updateImage({ url: image, coordinates: latest.current.coordinates })
        added.current = image
    }, [map, source, image, placement])

    useEffect(() => {
        if (map.getLayer(source) === undefined) return
        map.setLayoutProperty(source, 'visibility', visible ? 'visible' : 'none')
        map.setPaintProperty(source, 'raster-opacity', opacity)
        map.setPaintProperty(source, 'raster-resampling', smooth ? 'linear' : 'nearest')
    }, [map, source, visible, opacity, smooth])

    useEffect(
        () =>
            register(source, {
                source,
                hitLayers: [],
                tolerance: 0,
                features: new Map(),
                bounds: [west, south, east, north],
                unreadable: 0,
            }),
        [register, source, west, south, east, north],
    )
    return null
}
