import { Eye, EyeOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Slider } from '@winterop-com/sokkel-ui/primitives/slider'
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

function VisibleToggle({
    name,
    visible,
    onVisibleChange,
    said,
}: {
    name: string
    visible: boolean
    onVisibleChange: (visible: boolean) => void
    said: MapLayerListWords
}) {
    return (
        <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`${visible ? said.hide : said.show}: ${name}`}
            aria-pressed={visible}
            title={visible ? said.hide : said.show}
            className="-mt-0.5 -mr-1 shrink-0 text-muted-foreground"
            onClick={() => onVisibleChange(!visible)}
        >
            {visible ? <Eye /> : <EyeOff />}
        </Button>
    )
}

function OpacityControl({
    name,
    visible,
    opacity,
    onOpacityChange,
    said,
}: {
    name: string
    visible: boolean
    opacity: number
    onOpacityChange: (opacity: number) => void
    said: MapLayerListWords
}) {
    return (
        <div className="mt-2.5 flex items-center gap-3 border-t border-border pt-2.5">
            <span className="shrink-0 text-xs text-muted-foreground">{said.opacity}</span>
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
            <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{Math.round(opacity * 100)}%</span>
        </div>
    )
}

function Head({ title, description, toggle }: { title: string; description?: string; toggle: ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
                <h3 className="text-sm leading-snug font-medium">{title}</h3>
                {description !== undefined && <p className="text-xs leading-snug text-muted-foreground">{description}</p>}
            </div>
            {toggle}
        </div>
    )
}

export interface MapLayerListProps {
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
}

/**
 * The map's layers as a panel of cards, topmost first: each with its name and a button that shows
 * or hides it, its legend on an inset ground, and its opacity under a rule. A basemap card comes last, with the basemap
 * previews and the same two controls for the basemap.
 */
export function MapLayerList({ layers, onVisibleChange, onOpacityChange, basemap, words, className }: MapLayerListProps) {
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
                    <Head
                        title={layer.name}
                        description={layer.description}
                        toggle={
                            <VisibleToggle
                                name={layer.name}
                                visible={layer.visible}
                                onVisibleChange={(visible) => onVisibleChange(layer.id, visible)}
                                said={said}
                            />
                        }
                    />
                    {layer.legend !== undefined && layer.visible && (
                        <div className="mt-2.5 rounded-md bg-muted/50 px-2.5 py-2">{layer.legend}</div>
                    )}
                    <OpacityControl
                        name={layer.name}
                        visible={layer.visible}
                        opacity={layer.opacity}
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
                    <Head
                        title={said.basemap}
                        toggle={
                            <VisibleToggle
                                name={said.basemap}
                                visible={basemap.visible}
                                onVisibleChange={basemap.onVisibleChange}
                                said={said}
                            />
                        }
                    />
                    <BasemapGallery
                        basemaps={basemap.basemaps}
                        value={basemap.value}
                        onValueChange={basemap.onValueChange}
                        words={{ label: said.basemap }}
                        className="-mx-1 mt-2"
                    />
                    <OpacityControl
                        name={said.basemap}
                        visible={basemap.visible}
                        opacity={basemap.opacity}
                        onOpacityChange={basemap.onOpacityChange}
                        said={said}
                    />
                </section>
            )}
        </div>
    )
}
