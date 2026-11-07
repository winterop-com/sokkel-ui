import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { NO_DATA_BACKGROUND, NO_DATA_POINT_COLOR, classLabels, scaleColors, type ColorScale } from './scale'

function Swatch({ background, shape }: { background: string; shape: 'area' | 'point' }) {
    return (
        <span
            aria-hidden
            className={cn('size-3 shrink-0 ring-1 ring-foreground/15 ring-inset', shape === 'point' ? 'rounded-full' : 'rounded-[3px]')}
            style={{ background }}
        />
    )
}

function Count({ value }: { value: number | undefined }) {
    if (value === undefined) return null
    return <span className="ml-auto pl-3 text-muted-foreground tabular-nums">{value.toLocaleString('en-US')}</span>
}

/**
 * The key to a map's colors, in a card, or bare inside a panel that frames it already.
 *
 * A categorical scale is a list of swatches. A sequential or diverging scale is a stepped ramp
 * with its breaks under it, or the same list with each class's range written out. `noData` adds
 * the swatch a feature without a value is drawn in: hatched for areas, gray for points. `counts`
 * puts the number of features in each class beside it, in the list.
 */
export function MapLegend({
    title,
    description,
    scale,
    layout = 'ramp',
    captions,
    shape = 'area',
    noData = false,
    counts,
    noDataCount,
    framed = true,
    className,
}: {
    title?: string
    /** A line under the title, such as the period or the unit. */
    description?: string
    scale: ColorScale
    /** How a sequential or diverging scale is drawn; a categorical scale is always a list. */
    layout?: 'ramp' | 'list'
    /** Words under the two ends of a ramp, such as "Fewer" and "More". */
    captions?: [string, string]
    /** Whether the swatches stand for areas or for points. */
    shape?: 'area' | 'point'
    /** Shows the no-data swatch, with this label or "No data". */
    noData?: boolean | string
    /** How many features fall in each class, in class order. */
    counts?: number[]
    noDataCount?: number
    /** Draws the legend in its own card. */
    framed?: boolean
    className?: string
}) {
    const colors = scaleColors(scale)
    const labels = classLabels(scale)
    const list = scale.kind === 'categorical' || layout === 'list'
    const noDataLabel = typeof noData === 'string' ? noData : 'No data'
    const headed = title !== undefined || description !== undefined
    return (
        <section
            aria-label={title ?? description}
            className={cn(
                'text-xs text-card-foreground',
                framed && 'w-56 max-w-full rounded-lg bg-card/95 px-3 py-2.5 shadow-xs ring-1 ring-foreground/10',
                className,
            )}
        >
            {title !== undefined && <h3 className="leading-snug font-medium">{title}</h3>}
            {description !== undefined && <p className="leading-snug text-muted-foreground">{description}</p>}
            {list ? (
                <ul className={cn('space-y-1', headed && 'mt-2')}>
                    {colors.map((color, index) => (
                        <li key={labels[index]} className="flex items-center gap-2">
                            <Swatch background={color} shape={shape} />
                            <span className="tabular-nums">{labels[index]}</span>
                            <Count value={counts?.[index]} />
                        </li>
                    ))}
                </ul>
            ) : (
                <div className={cn(headed && 'mt-2')}>
                    <div
                        className="flex h-2.5 overflow-hidden rounded-[2px] ring-1 ring-foreground/10"
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
            {noData !== false && (
                <div className={cn('flex items-center gap-2', list ? 'mt-1' : 'mt-1.5')}>
                    <Swatch background={shape === 'point' ? NO_DATA_POINT_COLOR : NO_DATA_BACKGROUND} shape={shape} />
                    <span>{noDataLabel}</span>
                    <Count value={noDataCount} />
                </div>
            )}
        </section>
    )
}
