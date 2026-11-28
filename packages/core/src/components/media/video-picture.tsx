import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'

/** The video a `VideoPlayer` draws its `picture` layer over, for what is drawn there to read. */
const VideoPictureContext = createContext<HTMLVideoElement | null>(null)

/** The `<video>` element of the `VideoPlayer` whose `picture` layer this is drawn in, or `null` outside one. */
export function useVideoPicture(): HTMLVideoElement | null {
    return useContext(VideoPictureContext)
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

export interface VideoPictureLayerProps {
    video: RefObject<HTMLVideoElement | null>
    children: ReactNode
}

/** The layer `VideoPlayer` lays over its picture's drawn area, handing what it holds the video. */
export function VideoPictureLayer({ video, children }: VideoPictureLayerProps) {
    const [element, setElement] = useState<HTMLVideoElement | null>(null)
    useEffect(() => {
        setElement(video.current)
    }, [video])
    const rect = usePictureRect(element)
    return (
        <VideoPictureContext value={element}>
            <div data-slot="video-picture" className="pointer-events-none absolute z-1" style={rect}>
                {children}
            </div>
        </VideoPictureContext>
    )
}
