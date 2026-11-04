import { Eye, EyeOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { Slider } from '../ui/slider'
import type { Basemap } from './basemap'
import { BasemapGallery } from './BasemapSwitcher'

/** One layer as the panel lists it. */
export interface MapLayerItem {
    id: string
    name: string
    /** A line under the name, such as the period or the source. */
    description?: string
    visible: boolean
    /** From 0 to 1. */
    opacity: number
    /** The layer's key, usually a `MapLegend` with `framed={false}`. */
    legend?: ReactNode
}

export interface MapLayerListWords {
    show: string
    hide: string
    opacity: string
    basemap: string
}

const WORDS: MapLayerListWords = { show: 'Show layer', hide: 'Hide layer', opacity: 'Opacity', basemap: 'Basemap' }

function LayerControls({
    name,
    visible,
    opacity,
    onVisibleChange,
    onOpacityChange,
    said,
}: {
    name: string
    visible: boolean
    opacity: number
    onVisibleChange: (visible: boolean) => void
    onOpacityChange: (opacity: number) => void
    said: MapLayerListWords
}) {
    return (
        <div className="flex items-center gap-2 pt-1">
            <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${visible ? said.hide : said.show}: ${name}`}
                aria-pressed={visible}
                className="text-muted-foreground"
                onClick={() => onVisibleChange(!visible)}
            >
                {visible ? <Eye /> : <EyeOff />}
            </Button>
            <Slider
                aria-label={`${said.opacity}: ${name}`}
                min={0}
                max={100}
                step={5}
                value={[Math.round(opacity * 100)]}
                disabled={!visible}
                className="flex-1"
                onValueChange={(next) => onOpacityChange((Array.isArray(next) ? next[0] : next) / 100)}
            />
            <span className="w-9 text-right text-[11px] text-muted-foreground tabular-nums">{Math.round(opacity * 100)}%</span>
        </div>
    )
}

/**
 * The map's layers as a panel of cards, topmost first: each with its name, its legend, a button
 * that shows or hides it and a slider for its opacity. A basemap card comes last, with the basemap
 * previews and the same two controls for the basemap.
 */
export function MapLayerList({
    layers,
    onVisibleChange,
    onOpacityChange,
    basemap,
    words,
    className,
}: {
    layers: readonly MapLayerItem[]
    onVisibleChange: (id: string, visible: boolean) => void
    onOpacityChange: (id: string, opacity: number) => void
    basemap?: {
        basemaps: readonly Basemap[]
        value: string
        onValueChange: (id: string) => void
        visible: boolean
        onVisibleChange: (visible: boolean) => void
        opacity: number
        onOpacityChange: (opacity: number) => void
    }
    words?: Partial<MapLayerListWords>
    className?: string
}) {
    const said = { ...WORDS, ...words }
    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {layers.map((layer) => (
                <section
                    key={layer.id}
                    aria-label={layer.name}
                    className={cn(
                        'rounded-lg bg-card px-3 py-2.5 text-card-foreground ring-1 ring-foreground/10',
                        !layer.visible && 'opacity-75',
                    )}
                >
                    <h3 className="text-sm leading-snug font-medium">{layer.name}</h3>
                    {layer.description !== undefined && <p className="text-xs leading-snug text-muted-foreground">{layer.description}</p>}
                    {layer.legend !== undefined && layer.visible && <div className="mt-2">{layer.legend}</div>}
                    <LayerControls
                        name={layer.name}
                        visible={layer.visible}
                        opacity={layer.opacity}
                        onVisibleChange={(visible) => onVisibleChange(layer.id, visible)}
                        onOpacityChange={(opacity) => onOpacityChange(layer.id, opacity)}
                        said={said}
                    />
                </section>
            ))}
            {basemap !== undefined && (
                <section
                    aria-label={said.basemap}
                    className="rounded-lg bg-card px-3 py-2.5 text-card-foreground ring-1 ring-foreground/10"
                >
                    <h3 className="text-sm leading-snug font-medium">{said.basemap}</h3>
                    <BasemapGallery
                        basemaps={basemap.basemaps}
                        value={basemap.value}
                        onValueChange={basemap.onValueChange}
                        label={said.basemap}
                        className="-mx-1 mt-2"
                    />
                    <LayerControls
                        name={said.basemap}
                        visible={basemap.visible}
                        opacity={basemap.opacity}
                        onVisibleChange={basemap.onVisibleChange}
                        onOpacityChange={basemap.onOpacityChange}
                        said={said}
                    />
                </section>
            )}
        </div>
    )
}
