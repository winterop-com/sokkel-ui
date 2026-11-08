import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { NO_DATA_BACKGROUND, NO_DATA_POINT_COLOR, classLabels, scaleColors, type ColorScale } from './scale'

/** One line of a legend that keys something other than a scale, such as the selection's emphasis. */
export interface MapLegendEntry {
    label: string
    /** Any CSS color, a token included: the swatch's fill. */
    color: string
    /** The swatch's edge, for what the map draws with an outline of its own color. */
    edge?: string
    /** A round swatch for points, a square one for areas or a stroke for lines; the legend's `shape` when not given. */
    shape?: MapLegendShape
}

/** What a legend's swatches stand for: areas, points or lines. */
export type MapLegendShape = 'area' | 'point' | 'line'

function Swatch({ background, edge, shape }: { background: string; edge?: string; shape: MapLegendShape }) {
    if (shape === 'line') return <span aria-hidden className="h-0.75 w-3 shrink-0 rounded-mini" style={{ background }} />
    return (
        <span
            aria-hidden
            className={cn(
                'size-3 shrink-0',
                edge === undefined ? 'ring-1 ring-foreground/15 ring-inset' : 'border-2',
                shape === 'point' ? 'rounded-full' : 'rounded-mini',
            )}
            style={{ background, borderColor: edge }}
        />
    )
}

function Count({ value }: { value: number | undefined }) {
    if (value === undefined) return null
    return <span className="ml-auto pl-3 text-muted-foreground tabular-nums">{value.toLocaleString('en-US')}</span>
}

export interface MapLegendProps {
    title?: string
    /** A line under the title, such as the period or the unit. */
    description?: string
    scale?: ColorScale
    /** Lines keyed by their own colors, after the scale's classes or in place of a scale. */
    entries?: readonly MapLegendEntry[]
    /** How a sequential or diverging scale is drawn; a categorical scale is always a list. */
    layout?: 'ramp' | 'list'
    /** Words under the two ends of a ramp, such as "Fewer" and "More". */
    captions?: [string, string]
    /** Whether the swatches stand for areas, points or lines. */
    shape?: MapLegendShape
    /** Shows the no-data swatch, with this label or "No data". */
    noData?: boolean | string
    /** How many features fall in each class (or each entry, without a scale), in order. */
    counts?: number[]
    noDataCount?: number
    /** Draws the legend in its own card. */
    framed?: boolean
    className?: string
}

/**
 * The key to a map's colors, in a card, or bare inside a panel that frames it already.
 *
 * A categorical scale is a list of swatches. A sequential or diverging scale is a stepped ramp
 * with its breaks under it, or the same list with each class's range written out. `noData` adds
 * the swatch a feature without a value is drawn in: hatched for areas, gray for points and lines. `counts`
 * puts the number of features in each class beside it, in the list.
 *
 * Without a scale, `entries` lists what the map's colors mean line by line, each swatch with its
 * own fill and edge: the selected area, the areas under it and the rest, from `AREA_EMPHASIS`.
 */
export function MapLegend({
    title,
    description,
    scale,
    entries = [],
    layout = 'ramp',
    captions,
    shape = 'area',
    noData = false,
    counts,
    noDataCount,
    framed = true,
    className,
}: MapLegendProps) {
    const colors = scale === undefined ? [] : scaleColors(scale)
    const labels = scale === undefined ? [] : classLabels(scale)
    const list = scale === undefined || scale.kind === 'categorical' || layout === 'list'
    const classes: MapLegendEntry[] = colors.map((color, index) => ({ label: labels[index], color }))
    const lines = list ? [...classes, ...entries] : entries
    const noDataLabel = typeof noData === 'string' ? noData : 'No data'
    const headed = title !== undefined || description !== undefined
    return (
        <section
            aria-label={title ?? description}
            className={cn(
                'text-xs text-card-foreground',
                framed && 'w-56 max-w-full rounded-surface bg-card/95 px-3 py-2.5 shadow-xs ring-1 ring-foreground/10',
                className,
            )}
        >
            {title !== undefined && <h3 className="leading-snug font-medium">{title}</h3>}
            {description !== undefined && <p className="leading-snug text-muted-foreground">{description}</p>}
            {scale !== undefined && !list && (
                <div className={cn(headed && 'mt-2')}>
                    <div
                        className="flex h-2.5 overflow-hidden rounded-mini ring-1 ring-foreground/10"
                        role="img"
                        aria-label={labels.join(', ')}
                    >
                        {colors.map((color, index) => (
                            <span key={index} className="flex-1" style={{ background: color }} />
                        ))}
                    </div>
                    <div aria-hidden className="relative mt-1 h-4 text-2xs text-muted-foreground tabular-nums">
                        {scale.breaks.map((value, index) => (
                            <span
                                key={value}
                                className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
                                style={{ left: `${((index + 1) / colors.length) * 100}%` }}
                            >
                                {scale.format(value)}
                            </span>
                        ))}
                    </div>
                    {captions !== undefined && (
                        <div className="flex justify-between text-2xs text-muted-foreground">
                            <span>{captions[0]}</span>
                            <span>{captions[1]}</span>
                        </div>
                    )}
                </div>
            )}
            {lines.length > 0 && (
                <ul className={cn('space-y-1', (headed || !list) && 'mt-2')}>
                    {lines.map((line, index) => (
                        <li key={line.label} className="flex items-center gap-2">
                            <Swatch background={line.color} edge={line.edge} shape={line.shape ?? shape} />
                            <span className="tabular-nums">{line.label}</span>
                            <Count value={counts?.[index]} />
                        </li>
                    ))}
                </ul>
            )}
            {noData !== false && (
                <div className={cn('flex items-center gap-2', list ? 'mt-1' : 'mt-1.5')}>
                    <Swatch background={shape === 'area' ? NO_DATA_BACKGROUND : NO_DATA_POINT_COLOR} shape={shape} />
                    <span>{noDataLabel}</span>
                    <Count value={noDataCount} />
                </div>
            )}
        </section>
    )
}
