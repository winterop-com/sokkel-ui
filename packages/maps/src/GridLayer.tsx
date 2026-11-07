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
 * every cell in its class color and cells without a value left clear. It redraws when the grid,
 * the scale or the theme changes.
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
        canvas.width = grid.columns
        canvas.height = grid.rows
        const context = canvas.getContext('2d')
        if (context === null) return ''
        const pixels = context.createImageData(grid.columns, grid.rows)
        grid.values.forEach((value, cell) => {
            const index = classOf(scale, value)
            if (index === null) return
            pixels.data.set(bytes[index], cell * 4)
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
        () => register(source, { source, hitLayers: [], tolerance: 0, features: new Map(), bounds: [west, south, east, north] }),
        [register, source, west, south, east, north],
    )
    return null
}
