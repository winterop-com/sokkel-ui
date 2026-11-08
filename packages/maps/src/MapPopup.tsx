import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { Feature } from 'geojson'
import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { useMapContext } from './context'
import { anchorOf, type LngLat } from './geometry'

/** One line of a popup: a name, its value, and the color the value is drawn in on the map. */
export interface MapPopupRow {
    label: string
    value: ReactNode
    /** Any CSS color, shown as a swatch beside the value. */
    color?: string
}

/** The gap between the anchor and the card, the tip included. */
const GAP = 10

/** How close the card comes to the edge of the map. */
const EDGE = 8

interface Placement {
    left: number
    top: number
    tip: number
    side: 'above' | 'below'
    visible: boolean
}

/** The words a map popup says. */
export interface MapPopupWords {
    close: string
}

const WORDS: MapPopupWords = { close: 'Close' }

export interface MapPopupProps {
    /** The feature the card points at, from a point's position or inside a polygon. */
    feature?: Feature
    /** The position the card points at, instead of a feature's. */
    at?: LngLat
    title: string
    description?: string
    rows?: MapPopupRow[]
    action?: { label: string; onClick: () => void }
    onClose?: () => void
    words?: Partial<MapPopupWords>
    children?: ReactNode
    className?: string
}

/**
 * A card over the map, pointing at a feature or a position: a title, rows of names and values,
 * and an optional action. It sits above its anchor, or below when there is no room above, keeps
 * inside the map's frame as the map moves, and closes on Escape when it can be closed.
 */
export function MapPopup({
    feature,
    at,
    title,
    description,
    rows = [],
    action,
    onClose,
    words: given,
    children,
    className,
}: MapPopupProps) {
    const words = { ...WORDS, ...given }
    const { map, overlay } = useMapContext()
    const card = useRef<HTMLDivElement>(null)
    const anchor = at ?? (feature === undefined ? null : anchorOf(feature))
    const lng = anchor?.[0]
    const lat = anchor?.[1]
    const [place, setPlace] = useState<Placement | null>(null)

    useLayoutEffect(() => {
        if (lng === undefined || lat === undefined) return
        const element = card.current
        if (element === null) return
        const update = () => {
            const point = map.project([lng, lat])
            const width = element.offsetWidth
            const height = element.offsetHeight
            const frameWidth = overlay.clientWidth
            const frameHeight = overlay.clientHeight
            const roomAbove = point.y - GAP - height >= EDGE
            const roomBelow = point.y + GAP + height <= frameHeight - EDGE
            const side = roomAbove || !roomBelow ? 'above' : 'below'
            const left = Math.min(Math.max(point.x - width / 2, EDGE), Math.max(EDGE, frameWidth - width - EDGE))
            setPlace({
                left,
                top: side === 'above' ? point.y - GAP - height : point.y + GAP,
                tip: Math.min(Math.max(point.x - left, 14), width - 14),
                side,
                visible: point.x >= 0 && point.x <= frameWidth && point.y >= 0 && point.y <= frameHeight,
            })
        }
        update()
        const resize = new ResizeObserver(update)
        resize.observe(element)
        map.on('move', update)
        map.on('resize', update)
        return () => {
            resize.disconnect()
            map.off('move', update)
            map.off('resize', update)
        }
    }, [map, overlay, lng, lat])

    useEffect(() => {
        if (onClose === undefined) return
        const close = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', close)
        return () => document.removeEventListener('keydown', close)
    }, [onClose])

    if (anchor === null) return null
    return createPortal(
        <div
            ref={card}
            role="dialog"
            aria-label={title}
            data-side={place?.side}
            className={cn(
                'pointer-events-auto absolute w-64 max-w-[calc(100%-1rem)] rounded-lg bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10',
                (place === null || !place.visible) && 'invisible',
                className,
            )}
            style={{ left: place?.left ?? 0, top: place?.top ?? 0 }}
        >
            <div className="flex items-start gap-2 py-2 pr-1.5 pl-3">
                <div className="min-w-0 flex-1 py-0.5">
                    <p className="leading-snug font-medium">{title}</p>
                    {description !== undefined && <p className="text-xs leading-snug text-muted-foreground">{description}</p>}
                </div>
                {onClose !== undefined && (
                    <IconButton label={words.close} size="icon-xs" onClick={onClose}>
                        <X />
                    </IconButton>
                )}
            </div>
            {rows.length > 0 && (
                <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-3 pb-2.5 text-xs">
                    {rows.map((row) => (
                        <div key={row.label} className="contents">
                            <dt className="text-muted-foreground">{row.label}</dt>
                            <dd className="flex items-center justify-end gap-1.5 text-right font-medium tabular-nums">
                                {row.color !== undefined && (
                                    <span
                                        aria-hidden
                                        className="size-2.5 rounded-mini ring-1 ring-foreground/15 ring-inset"
                                        style={{ background: row.color }}
                                    />
                                )}
                                {row.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
            {children}
            {action !== undefined && (
                <div className="border-t border-border p-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={action.onClick}>
                        {action.label}
                    </Button>
                </div>
            )}
            <span
                aria-hidden
                className={cn(
                    'absolute size-2.5 -translate-x-1/2 rotate-45 border-foreground/10 bg-popover',
                    place?.side === 'below' ? '-top-[5.5px] border-t border-l' : '-bottom-[5.5px] border-r border-b',
                )}
                style={{ left: place?.tip ?? 0 }}
            />
        </div>,
        overlay,
    )
}
