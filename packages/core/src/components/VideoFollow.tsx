import { Crosshair, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { cn } from '../lib/cn'
import { detectionAt, type Detection } from '../lib/detections'
import { TRACK_COLORS } from '../lib/tracks'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { IconButton } from './IconButton'
import { useVideoPicture, useVideoTime, useVideoView, type PictureRegion } from './media/video-picture'

/** The words a followed detection's banner says. */
export interface VideoFollowWords {
    /** What the banner says while the view follows a detection, by its name. */
    following: (name: string) => string
    /** What it says while the finder has lost it, the view held where it was last seen. */
    lost: (name: string) => string
    /** The button that lets it go. */
    release: string
}

export const VIDEO_FOLLOW_WORDS: VideoFollowWords = {
    following: (name) => `Following ${name}`,
    lost: (name) => `Lost ${name}`,
    release: 'Stop following',
}

/** Where a catalog holds a video follow banner's words, and the arguments its phrases name. */
export const VIDEO_FOLLOW_PART: WordsPart<VideoFollowWords> = {
    id: 'videoFollow',
    words: VIDEO_FOLLOW_WORDS,
    args: { following: 'name', lost: 'name' },
}

/** A video follow banner's phrases as ICU messages in English, for the catalog. */
export const VIDEO_FOLLOW_MESSAGES: WordMessages<VideoFollowWords> = {
    following: 'Following {name}',
    lost: 'Lost {name}',
}

export interface VideoFollowProps {
    /** The detection followed, among the ones a `DetectionOverlay` draws. */
    detection: Detection
    /** Called when the viewer lets it go, by the banner's button. */
    onRelease: () => void
    /** How many of the detection's own sizes the view holds around it; the view is never closer than a fifth of the picture. */
    room?: number
    /** The moment followed, in seconds of the video; inside a `VideoPlayer` it follows the video without it. */
    time?: number
    /** Seconds added to the time before the samples are read, as `DetectionOverlay`'s `offset`. */
    offset?: number
    /** How long the detection counts as seen after its last sample, in seconds, as `DetectionOverlay`'s `hold`. */
    hold?: number
    /** The longest gap between two samples it glides across, in seconds, as `DetectionOverlay`'s `gap`. */
    gap?: number
    className?: string
    words?: Partial<VideoFollowWords>
}

/** The smallest share of the picture the view comes in to. */
const CLOSEST = 0.2

/**
 * The part of the picture a view holds around a box: `room` times its larger side (never less than
 * a fifth of the picture, never more than the whole), centered on it and kept inside the picture.
 */
export function followRegion(box: PictureRegion, room: number): PictureRegion {
    const size = Math.min(1, Math.max(CLOSEST, Math.max(box.w, box.h) * room))
    const inside = (middle: number) => Math.min(1 - size, Math.max(0, middle - size / 2))
    return { x: inside(box.x + box.w / 2), y: inside(box.y + box.h / 2), w: size, h: size }
}

/**
 * Keeps a video's view on one detection, as `MapFollow` keeps a map on one track: inside a
 * `VideoPlayer` (in its `overlay`, where the banner stands) the player comes in to the part of the
 * picture around the detection and moves with it frame by frame, and the banner says what is
 * followed, with a button that lets it go. While the finder has lost it the view holds where it was
 * last seen and the banner says so. Let go, the player shows the whole picture again.
 */
export function VideoFollow({ detection, onRelease, room = 3, time, offset = 0, hold, gap, className, words: given }: VideoFollowProps) {
    const words = useWords(VIDEO_FOLLOW_PART, given)
    const video = useVideoPicture()
    const setView = useVideoView()
    const played = useVideoTime(time === undefined ? video : null)
    const box = detectionAt(detection, (time ?? played) + offset, { hold, gap })
    const name = detection.label === undefined ? detection.id : `${detection.label} ${detection.id}`

    const region = box === undefined ? undefined : followRegion(box, room)
    const key = region === undefined ? '' : `${String(region.x)} ${String(region.y)} ${String(region.w)}`
    const latest = useRef(region)
    latest.current = region
    useEffect(() => {
        if (latest.current !== undefined) setView(latest.current)
    }, [key, setView])
    useEffect(() => () => setView(null), [setView])

    return (
        <div
            role="status"
            data-slot="video-follow"
            data-lost={box === undefined || undefined}
            className={cn(
                'flex max-w-full items-center gap-1.5 self-start rounded-control bg-terminal/80 py-0.5 ps-2 pe-0.5 text-xs text-terminal-foreground shadow-surface backdrop-blur-sm',
                className,
            )}
        >
            <Crosshair
                aria-hidden
                className={cn('size-3.5 shrink-0', box === undefined && 'opacity-50')}
                style={{ color: detection.affiliation === undefined ? 'var(--primary)' : TRACK_COLORS[detection.affiliation] }}
            />
            <span className="min-w-0 truncate font-medium">{box === undefined ? words.lost(name) : words.following(name)}</span>
            <IconButton
                label={words.release}
                size="icon-xs"
                side="bottom"
                onClick={onRelease}
                className="text-terminal-foreground hover:bg-terminal-foreground/15 hover:text-terminal-foreground"
            >
                <X aria-hidden />
            </IconButton>
        </div>
    )
}
