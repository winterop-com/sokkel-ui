import { Dialog } from '@base-ui/react/dialog'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

import { useThemeName } from '../hooks/use-theme-name'
import { cn } from '../lib/cn'
import { IconButton } from './IconButton'
import { ImageAnnotations, type ImageBox } from './ImageAnnotations'
import { Button } from './ui/button'

/** The words an image lightbox says. */
export interface ImageLightboxWords {
    open: string
    close: string
    previous: string
    next: string
    zoomIn: string
    zoomOut: string
    /** The zoom's button while the image is larger than the screen fits: back to the whole image. */
    fit: string
    /** The zoom's button while the image fits the screen: to its own pixels. */
    actual: string
    /** Where the image shown sits among them, counting from 1: "3 of 12". */
    count: (index: number, total: number) => string
}

const WORDS: ImageLightboxWords = {
    open: 'Open the image full screen',
    close: 'Close',
    previous: 'Previous image',
    next: 'Next image',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fit: 'Fit to screen',
    actual: 'Actual size',
    count: (index, total) => `${String(index)} of ${String(total)}`,
}

/** One image a lightbox moves between. */
export interface LightboxImage {
    src: string
    alt: string
    /** Boxes drawn over it, as `ImageAnnotations` draws them. */
    boxes?: readonly ImageBox[]
}

export interface Size {
    width: number
    height: number
}

export interface Point {
    x: number
    y: number
}

/** The room kept between the image and the stage's edges when it fits, in pixels. */
const MARGIN = 24
/** How far the zoom goes past the fit: this many times, or twice the image's own pixels when that is more. */
const ZOOM_REACH = 4
/** Each zoom button's step. */
const ZOOM_STEP = 1.5
/** How far a press may move before it counts as a drag rather than a press, in pixels. */
const SLOP = 6
/** How far a swipe of the whole image must go to move to the next one, in pixels. */
const SWIPE = 60

/** The share of its own size an image is drawn at to fit `room`, never larger than its own pixels. */
export function fitScale(image: Size, room: Size): number {
    if (image.width <= 0 || image.height <= 0) return 1
    return Math.max(0, Math.min(1, room.width / image.width, room.height / image.height))
}

/** The most the zoom goes to, as a multiple of the fit: `ZOOM_REACH`, or twice the image's own pixels when that is more. */
export function maxZoom(fit: number): number {
    return fit > 0 ? Math.max(ZOOM_REACH, 2 / fit) : ZOOM_REACH
}

/** A zoom held between the fit (1) and `max`. */
export function clampZoom(zoom: number, max: number): number {
    if (!Number.isFinite(zoom)) return 1
    return Math.min(Math.max(1, max), Math.max(1, zoom))
}

/**
 * A pan held so the zoomed image never leaves a gap at an edge it overflows: centered on an axis
 * where it is smaller than the stage, and no further than its overflow on one where it is larger.
 * `drawn` is the image's size at the fit, `zoom` how far it is zoomed past that.
 */
export function clampPan(pan: Point, drawn: Size, zoom: number, stage: Size): Point {
    const spareX = Math.max(0, (drawn.width * zoom - stage.width) / 2)
    const spareY = Math.max(0, (drawn.height * zoom - stage.height) / 2)
    // Adding zero turns a negative zero into zero.
    return {
        x: Math.min(spareX, Math.max(-spareX, pan.x)) + 0,
        y: Math.min(spareY, Math.max(-spareY, pan.y)) + 0,
    }
}

/** The pan that keeps the point under `at`, measured from the stage's middle, in place as the zoom goes from `from` to `to`. */
export function zoomAt(pan: Point, at: Point, from: number, to: number): Point {
    const ratio = to / from
    return { x: at.x - (at.x - pan.x) * ratio, y: at.y - (at.y - pan.y) * ratio }
}

/** The zoom a double press goes to from the fit: the image's own pixels, or twice the fit for an image already shown at its own size. */
export function actualZoom(fit: number): number {
    return fit > 0 && 1 / fit > 1.01 ? 1 / fit : 2
}

interface View {
    zoom: number
    pan: Point
    /** Eased into, as a button or a key moves it; a wheel, a drag or a pinch follows at once. */
    eased: boolean
}

const FIT: View = { zoom: 1, pan: { x: 0, y: 0 }, eased: true }

/** A press or two on the stage: where each started, and what the view was then. */
interface Gesture {
    pointers: Map<number, Point>
    start: Map<number, Point>
    view: View
    moved: boolean
    /** Whether the first press landed on the image rather than the ground around it. */
    onImage: boolean
}

/** Whether a point, measured from the stage's middle, lies on the image as the view draws it. */
export function onImage(at: Point, drawn: Size | undefined, view: { zoom: number; pan: Point }): boolean {
    if (drawn === undefined) return true
    return Math.abs(at.x - view.pan.x) <= (drawn.width * view.zoom) / 2 && Math.abs(at.y - view.pan.y) <= (drawn.height * view.zoom) / 2
}

function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y)
}

function middle(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** The images open full screen: the one shown, the way between them, its zoom and its place. */
function Viewer({
    images,
    start,
    numbered,
    format,
    words,
    onClose,
    viewer,
}: {
    images: readonly LightboxImage[]
    start: number
    numbered: boolean
    format?: (value: number) => string
    words: ImageLightboxWords
    onClose: () => void
    /** The viewer itself, which takes the focus as it opens so the keys reach it and no button shows a ring. */
    viewer: RefObject<HTMLDivElement | null>
}) {
    const theme = useThemeName()
    const [index, setIndex] = useState(Math.min(Math.max(0, start), images.length - 1))
    const image = images[index]
    const [natural, setNatural] = useState<{ src: string; size: Size }>()
    const [stage, setStage] = useState<Size>({ width: 0, height: 0 })
    const [view, setView] = useState<View>(FIT)
    const box = useRef<HTMLDivElement>(null)
    const gesture = useRef<Gesture | null>(null)

    // The image's own pixels, read from a copy so the drawn one can be sized before it shows.
    useEffect(() => {
        let live = true
        const probe = new Image()
        probe.onload = () => {
            if (live) setNatural({ src: image.src, size: { width: probe.naturalWidth, height: probe.naturalHeight } })
        }
        probe.src = image.src
        return () => {
            live = false
        }
    }, [image.src])

    useLayoutEffect(() => {
        const element = box.current
        if (element === null) return
        const measure = () => setStage({ width: element.clientWidth, height: element.clientHeight })
        measure()
        if (typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    const own = natural?.src === image.src ? natural.size : undefined
    const room = { width: Math.max(0, stage.width - MARGIN * 2), height: Math.max(0, stage.height - MARGIN * 2) }
    const fit = own === undefined ? 1 : fitScale(own, room)
    const drawn = own === undefined ? undefined : { width: own.width * fit, height: own.height * fit }
    const max = maxZoom(fit)
    const geometry = useRef({ drawn, stage, max })
    useLayoutEffect(() => {
        geometry.current = { drawn, stage, max }
    })

    /** The view zoomed to `to` about `at` (the stage's middle by default), held in bounds. */
    const zoomed = (current: View, to: number, at: Point = { x: 0, y: 0 }, eased = true): View => {
        const { drawn: size, stage: area, max: most } = geometry.current
        const zoom = clampZoom(to, most)
        if (size === undefined) return { zoom, pan: { x: 0, y: 0 }, eased }
        return { zoom, pan: clampPan(zoomAt(current.pan, at, current.zoom, zoom), size, zoom, area), eased }
    }

    const go = (step: number) => {
        if (images.length < 2) return
        setIndex((current) => (current + step + images.length) % images.length)
        setView(FIT)
    }

    const toggle = (at?: Point) => setView((current) => (current.zoom > 1.01 ? FIT : zoomed(current, actualZoom(fit), at)))

    // The wheel zooms about the pointer; a pinch on a trackpad comes as a wheel with Control held.
    useEffect(() => {
        const element = box.current
        if (element === null) return
        const wheel = (event: WheelEvent) => {
            event.preventDefault()
            const rect = element.getBoundingClientRect()
            const at = { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 }
            const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.002))
            setView((current) => zoomed(current, current.zoom * factor, at, false))
        }
        element.addEventListener('wheel', wheel, { passive: false })
        return () => element.removeEventListener('wheel', wheel)
        // `zoomed` reads the geometry from a ref, so the listener stays the same one.
    }, [])

    const point = (event: PointerEvent): Point => {
        const rect = event.currentTarget.getBoundingClientRect()
        return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 }
    }

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        const at = point(event)
        const now = gesture.current ?? { pointers: new Map(), start: new Map(), view, moved: false, onImage: onImage(at, drawn, view) }
        now.pointers.set(event.pointerId, at)
        // Every press starts the gesture over from where the view is, so a second finger pinches from there.
        now.start = new Map(now.pointers)
        now.view = view
        gesture.current = now
    }

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const now = gesture.current
        if (now === null || !now.pointers.has(event.pointerId)) return
        now.pointers.set(event.pointerId, point(event))
        const [a, b] = [...now.pointers.keys()]
        if (b !== undefined) {
            const [a0, b0, a1, b1] = [now.start.get(a), now.start.get(b), now.pointers.get(a), now.pointers.get(b)]
            if (a0 === undefined || b0 === undefined || a1 === undefined || b1 === undefined) return
            now.moved = true
            const from = middle(a0, b0)
            const to = middle(a1, b1)
            const next = zoomed(now.view, (now.view.zoom * distance(a1, b1)) / Math.max(1, distance(a0, b0)), from, false)
            const { drawn: size, stage: area } = geometry.current
            const pan = { x: next.pan.x + to.x - from.x, y: next.pan.y + to.y - from.y }
            setView({ ...next, pan: size === undefined ? pan : clampPan(pan, size, next.zoom, area) })
            return
        }
        const from = now.start.get(event.pointerId)
        const at = now.pointers.get(event.pointerId)
        if (from === undefined || at === undefined) return
        if (!now.moved && distance(from, at) < SLOP) return
        now.moved = true
        if (now.view.zoom <= 1) return
        const { drawn: size, stage: area } = geometry.current
        if (size === undefined) return
        const pan = { x: now.view.pan.x + at.x - from.x, y: now.view.pan.y + at.y - from.y }
        setView({ zoom: now.view.zoom, pan: clampPan(pan, size, now.view.zoom, area), eased: false })
    }

    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        const now = gesture.current
        if (now === null) return
        const from = now.start.get(event.pointerId)
        const at = now.pointers.get(event.pointerId)
        now.pointers.delete(event.pointerId)
        if (now.pointers.size > 0) {
            now.start = new Map(now.pointers)
            now.view = view
            return
        }
        gesture.current = null
        if (from === undefined || at === undefined) return
        const swiped = at.x - from.x
        // A swipe across an image that fits moves to the next one; a press on the ground around it closes.
        if (now.view.zoom <= 1 && now.start.size === 1 && Math.abs(swiped) > SWIPE) go(swiped < 0 ? 1 : -1)
        else if (!now.moved && !now.onImage) onClose()
    }

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowRight') go(1)
        else if (event.key === 'ArrowLeft') go(-1)
        else if (event.key === '+' || event.key === '=') setView((current) => zoomed(current, current.zoom * ZOOM_STEP))
        else if (event.key === '-') setView((current) => zoomed(current, current.zoom / ZOOM_STEP))
        else if (event.key === '0') setView(FIT)
        else return
        event.preventDefault()
    }

    const percent = Math.round(view.zoom * fit * 100)
    const many = images.length > 1
    const content =
        image.boxes === undefined ? (
            <img
                src={image.src}
                alt={image.alt}
                draggable={false}
                className="block size-full rounded-lg object-contain shadow-pop select-none"
            />
        ) : (
            <ImageAnnotations
                src={image.src}
                alt={image.alt}
                boxes={image.boxes}
                numbered={numbered}
                format={format}
                className="rounded-lg shadow-pop select-none"
            />
        )
    return (
        // Dark in every scheme, in the document's theme, as a room for pictures is.
        <div ref={viewer} tabIndex={-1} className="dark flex size-full flex-col scheme-dark outline-none" onKeyDown={onKeyDown}>
            <div data-theme-scope={theme} className="flex size-full flex-col bg-transparent text-foreground">
                <div className="flex min-w-0 shrink-0 items-center gap-1 px-3 py-2">
                    {many && (
                        <span className="shrink-0 px-1 text-sm font-medium tabular-nums">{words.count(index + 1, images.length)}</span>
                    )}
                    <Dialog.Title className="min-w-0 flex-1 truncate px-1 text-sm text-muted-foreground">{image.alt}</Dialog.Title>
                    <IconButton
                        label={words.zoomOut}
                        side="bottom"
                        disabled={view.zoom <= 1}
                        onClick={() => setView((current) => zoomed(current, current.zoom / ZOOM_STEP))}
                    >
                        <ZoomOut aria-hidden />
                    </IconButton>
                    <Button
                        variant="ghost"
                        size="sm"
                        title={view.zoom > 1.01 ? words.fit : words.actual}
                        aria-label={view.zoom > 1.01 ? words.fit : words.actual}
                        onClick={() => toggle()}
                        className="min-w-14 justify-center tabular-nums"
                    >
                        {String(percent)}%
                    </Button>
                    <IconButton
                        label={words.zoomIn}
                        side="bottom"
                        disabled={view.zoom >= max}
                        onClick={() => setView((current) => zoomed(current, current.zoom * ZOOM_STEP))}
                    >
                        <ZoomIn aria-hidden />
                    </IconButton>
                    <IconButton label={words.close} side="bottom" onClick={onClose}>
                        <X aria-hidden />
                    </IconButton>
                </div>
                <div
                    ref={box}
                    data-slot="lightbox-stage"
                    data-zoomed={view.zoom > 1 || undefined}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onDoubleClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect()
                        toggle({ x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 })
                    }}
                    className={cn(
                        'relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden',
                        view.zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
                    )}
                >
                    <div
                        className={cn(
                            'pointer-events-none shrink-0',
                            view.eased && 'motion-safe:transition-transform motion-safe:duration-150',
                        )}
                        style={{
                            width: drawn?.width,
                            height: drawn?.height,
                            maxWidth: drawn === undefined ? room.width : undefined,
                            maxHeight: drawn === undefined ? room.height : undefined,
                            transform: `translate(${String(view.pan.x)}px, ${String(view.pan.y)}px) scale(${String(view.zoom)})`,
                        }}
                    >
                        {content}
                    </div>
                    {many && (
                        <>
                            <IconButton
                                label={words.previous}
                                variant="secondary"
                                size="icon"
                                side="right"
                                onClick={() => go(-1)}
                                onPointerDown={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                                className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur-sm"
                            >
                                <ChevronLeft aria-hidden />
                            </IconButton>
                            <IconButton
                                label={words.next}
                                variant="secondary"
                                size="icon"
                                side="left"
                                onClick={() => go(1)}
                                onPointerDown={(event) => event.stopPropagation()}
                                onDoubleClick={(event) => event.stopPropagation()}
                                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur-sm"
                            >
                                <ChevronRight aria-hidden />
                            </IconButton>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export interface ImageLightboxProps {
    src: string
    alt: string
    className?: string
    defaultOpen?: boolean
    /** Boxes drawn over the image, as `ImageAnnotations` draws them. */
    boxes?: readonly ImageBox[]
    /** Each box's tag starts with its number. */
    numbered?: boolean
    /** How a box's confidence is written; a whole percent by default. */
    format?: (value: number) => string
    /**
     * The images to move between once open, this one among them at `index`; this one alone
     * without it. `src` and `alt` stay what the page shows, such as a smaller copy.
     */
    images?: readonly LightboxImage[]
    /** Where this image sits in `images`; the first by default. */
    index?: number
    words?: Partial<ImageLightboxWords>
}

/**
 * An image that opens full screen when pressed: a chart an assistant drew, a screenshot someone
 * attached, a photo in a gallery. Escape, the close button or a press on the ground around the
 * image closes it, and focus returns to the image.
 *
 * Open, the image can be zoomed by the wheel, a pinch or the buttons, from the fit to four times
 * it or twice the image's own pixels, about the pointer; zoomed, a drag moves it, never leaving a
 * gap at an edge it overflows. A double press goes between the fit and the image's own pixels, and
 * the figure between the zoom buttons says how large it is drawn. Given `images`, the arrow keys,
 * the buttons at the sides and a swipe move between them, the count saying where it is ("3 of
 * 12"); each opens at the fit.
 *
 * Given `boxes`, the image is drawn as `ImageAnnotations` with them, small and full screen alike,
 * and they zoom with it.
 */
export function ImageLightbox({
    src,
    alt,
    className,
    defaultOpen = false,
    boxes,
    numbered = false,
    format,
    images,
    index = 0,
    words: given,
}: ImageLightboxProps) {
    const words = { ...WORDS, ...given }
    const [open, setOpen] = useState(defaultOpen)
    const room = useRef<HTMLDivElement>(null)
    const shown = images === undefined || images.length === 0 ? [{ src, alt, boxes }] : images
    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger
                aria-label={words.open}
                className="cursor-zoom-in rounded-md outline-none focus-visible:ring-focus focus-visible:ring-ring"
            >
                {boxes === undefined ? (
                    <img src={src} alt={alt} className={cn('rounded-md', className)} />
                ) : (
                    <ImageAnnotations src={src} alt={alt} boxes={boxes} numbered={numbered} format={format} className={className} />
                )}
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-dialog bg-shade/85 backdrop-blur-sm" />
                <Dialog.Popup initialFocus={room} className="fixed inset-0 z-dialog outline-none">
                    <Viewer
                        images={shown}
                        start={images === undefined ? 0 : index}
                        numbered={numbered}
                        format={format}
                        words={words}
                        onClose={() => setOpen(false)}
                        viewer={room}
                    />
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
