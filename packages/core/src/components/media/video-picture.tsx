import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * A part of the picture, in shares of its size from its top left corner: `x` and `w` of its width,
 * `y` and `h` of its height, each from 0 to 1.
 */
export interface PictureRegion {
    x: number
    y: number
    w: number
    h: number
}

/** What a `VideoPlayer` hands what it draws over its picture: the video, and a way to frame part of it. */
export interface VideoPictureValue {
    video: HTMLVideoElement | null
    /**
     * Fills the player with a part of the picture, eased there, the picture never leaving an edge
     * of the player bare that it covered; `null` shows the whole picture again. What the `picture`
     * layer draws moves with it; the controls, captions and `overlay` stay where they are.
     */
    setView: (region: PictureRegion | null) => void
}

const NONE: VideoPictureValue = { video: null, setView: () => undefined }

const VideoPictureContext = createContext<VideoPictureValue>(NONE)

export interface VideoPictureProviderProps {
    value: VideoPictureValue
    children: ReactNode
}

/** Hands what is drawn over a picture its video and view; `VideoPlayer` wraps all it draws in one. */
export function VideoPictureProvider({ value, children }: VideoPictureProviderProps) {
    return <VideoPictureContext value={value}>{children}</VideoPictureContext>
}

/** The `<video>` element of the `VideoPlayer` this is drawn in (its `picture` or its `overlay`), or `null` outside one. */
export function useVideoPicture(): HTMLVideoElement | null {
    return useContext(VideoPictureContext).video
}

/** The `setView` of the `VideoPlayer` this is drawn in; it does nothing outside one. */
export function useVideoView(): (region: PictureRegion | null) => void {
    return useContext(VideoPictureContext).setView
}

/**
 * Where a video is, in seconds, read on every frame it shows while it plays (through
 * `requestVideoFrameCallback` where the browser has it, else each animation frame) and on every seek
 * while it stands; 0 without a video.
 */
export function useVideoTime(video: HTMLVideoElement | null): number {
    const [time, setTime] = useState(0)
    useEffect(() => {
        if (video === null) return
        let frame = 0
        let stopped = false
        const read = () => {
            setTime(video.currentTime)
        }
        const tick = () => {
            if (stopped) return
            read()
            if (video.paused || video.ended) return
            if ('requestVideoFrameCallback' in video) frame = video.requestVideoFrameCallback(tick)
            else frame = requestAnimationFrame(tick)
        }
        const start = () => {
            stop()
            stopped = false
            tick()
        }
        const stop = () => {
            stopped = true
            if ('cancelVideoFrameCallback' in video) video.cancelVideoFrameCallback(frame)
            cancelAnimationFrame(frame)
        }
        read()
        video.addEventListener('play', start)
        video.addEventListener('pause', read)
        video.addEventListener('seeked', read)
        video.addEventListener('timeupdate', read)
        video.addEventListener('loadeddata', read)
        if (!video.paused) start()
        return () => {
            stop()
            video.removeEventListener('play', start)
            video.removeEventListener('pause', read)
            video.removeEventListener('seeked', read)
            video.removeEventListener('timeupdate', read)
            video.removeEventListener('loadeddata', read)
        }
    }, [video])
    return time
}

/**
 * The area a picture of `natural` size takes when contained in `room` (as `object-fit: contain`
 * draws it): centered, as large as fits, with bars on two sides. Without a natural size yet it is
 * the whole room.
 */
export function containedRect(
    room: { width: number; height: number },
    natural: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
    if (natural.width <= 0 || natural.height <= 0 || room.width <= 0 || room.height <= 0)
        return { left: 0, top: 0, width: room.width, height: room.height }
    const scale = Math.min(room.width / natural.width, room.height / natural.height)
    const width = natural.width * scale
    const height = natural.height * scale
    return { left: (room.width - width) / 2, top: (room.height - height) / 2, width, height }
}

/** The picture's drawn area in its player, measured as either changes: the player's size, or the video's own. */
function usePictureRect(video: HTMLVideoElement | null): CSSProperties {
    const [rect, setRect] = useState<CSSProperties>({ inset: 0 })
    useEffect(() => {
        if (video === null) return
        const measure = () => {
            const room = { width: video.clientWidth, height: video.clientHeight }
            const drawn = containedRect(room, { width: video.videoWidth, height: video.videoHeight })
            setRect({ left: drawn.left, top: drawn.top, width: drawn.width, height: drawn.height })
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(video)
        video.addEventListener('loadedmetadata', measure)
        video.addEventListener('resize', measure)
        return () => {
            observer.disconnect()
            video.removeEventListener('loadedmetadata', measure)
            video.removeEventListener('resize', measure)
        }
    }, [video])
    return rect
}

/**
 * The CSS transform that fills `room` with `region` of a picture drawn at `picture` in it: scaled up
 * (never down) about the top left corner and moved so the region's middle is the room's middle,
 * held so the picture leaves bare no edge it covered, and centered on an axis it does not fill.
 */
export function viewTransform(
    room: { width: number; height: number },
    picture: { left: number; top: number; width: number; height: number },
    region: PictureRegion,
): string {
    if (picture.width <= 0 || picture.height <= 0 || region.w <= 0 || region.h <= 0) return ''
    const scale = Math.max(1, Math.min(room.width / (region.w * picture.width), room.height / (region.h * picture.height)))
    const axis = (size: number, start: number, length: number, at: number, extent: number) => {
        const wanted = size / 2 - scale * (start + (at + extent / 2) * length)
        if (scale * length <= size) return (size - scale * length) / 2 - scale * start
        return Math.min(-scale * start, Math.max(size - scale * (start + length), wanted))
    }
    const x = axis(room.width, picture.left, picture.width, region.x, region.w)
    const y = axis(room.height, picture.top, picture.height, region.y, region.h)
    return `translate(${String(x)}px, ${String(y)}px) scale(${String(scale)})`
}

export interface VideoPictureLayerProps {
    video: HTMLVideoElement | null
    children: ReactNode
}

/** The layer `VideoPlayer` lays over its picture's drawn area. */
export function VideoPictureLayer({ video, children }: VideoPictureLayerProps) {
    const rect = usePictureRect(video)
    return (
        <div data-slot="video-picture" className="pointer-events-none absolute z-1" style={rect}>
            {children}
        </div>
    )
}
