import { cn } from '../lib/cn'
import { formatPercent } from '../lib/percent'

/**
 * A box over an image, in shares of the image's size from its top left corner: `x` and `w` of its
 * width, `y` and `h` of its height, each from 0 to 1, so a box holds at any size the image is drawn.
 */
export interface ImageBox {
    id: string
    x: number
    y: number
    w: number
    h: number
    /** What the box holds, written on its tag. */
    label?: string
    /** How sure the finder is, from 0 to 1, written on its tag after the label. */
    confidence?: number
}

/**
 * An image with boxes drawn over it, such as what a detector found. The image keeps its aspect
 * ratio and the boxes move with it. Each box carries a tag at its top edge, inside the box when it
 * sits at the image's top: its number (with `numbered`), its label and its confidence, any of them
 * left out when not given.
 *
 * `active` and `onActiveChange` tie the boxes to a list beside them, such as a `BarList` with the
 * same ids: the box under the pointer is reported, the active one is drawn on a tint, and the rest
 * step back.
 *
 * `size`: `fill` takes its container's width; `screen` keeps the image's own size, no larger than
 * the screen, as a full screen view shows it.
 */
export function ImageAnnotations({
    src,
    alt,
    boxes,
    numbered = false,
    format = formatPercent,
    active,
    onActiveChange,
    size = 'fill',
    className,
}: {
    src: string
    alt: string
    boxes: readonly ImageBox[]
    /** Each box's tag starts with its place in `boxes`, from 1. */
    numbered?: boolean
    /** How a confidence is written; a whole percent by default. */
    format?: (value: number) => string
    /** The id of the box to draw as active. */
    active?: string
    /** The box under the pointer, or `undefined` when the pointer leaves it. */
    onActiveChange?: (id: string | undefined) => void
    size?: 'fill' | 'screen'
    className?: string
}) {
    return (
        <span className={cn('relative', size === 'fill' ? 'block' : 'inline-block max-w-full', className)}>
            <img
                src={src}
                alt={alt}
                className={cn('block rounded-md', size === 'fill' ? 'h-auto w-full' : 'max-h-[calc(100svh-3rem)] max-w-full')}
            />
            {boxes.map((box, index) => {
                const tag = [
                    numbered ? String(index + 1) : undefined,
                    box.label,
                    box.confidence === undefined ? undefined : format(box.confidence),
                ]
                    .filter((part) => part !== undefined)
                    .join(' ')
                const isActive = active === box.id
                return (
                    <span
                        key={box.id}
                        data-active={isActive || undefined}
                        onPointerEnter={onActiveChange === undefined ? undefined : () => onActiveChange(box.id)}
                        onPointerLeave={onActiveChange === undefined ? undefined : () => onActiveChange(undefined)}
                        className={cn(
                            'absolute rounded-mini border-2 border-primary transition-opacity',
                            isActive && 'z-10 bg-primary/20',
                            active !== undefined && !isActive && 'opacity-40',
                        )}
                        style={{
                            left: `${String(share(box.x) * 100)}%`,
                            top: `${String(share(box.y) * 100)}%`,
                            width: `${String(share(box.w) * 100)}%`,
                            height: `${String(share(box.h) * 100)}%`,
                        }}
                    >
                        {tag !== '' && (
                            <span
                                className={cn(
                                    'absolute -left-0.5 rounded-mini bg-primary px-1 text-2xs font-medium whitespace-nowrap text-primary-foreground tabular-nums',
                                    box.y < 0.08 ? 'top-0' : '-top-0.5 -translate-y-full',
                                )}
                            >
                                {tag}
                            </span>
                        )}
                    </span>
                )
            })}
        </span>
    )
}

function share(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}
