import { Maximize2, Minimize2, ScanEye, VideoOff } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { IconButton } from './IconButton'
import { Columns } from './Layout'
import { Spinner } from './ui/spinner'

/** How a camera's feed stands: live, live and kept, gone, or on its way. */
export type CameraState = 'live' | 'recording' | 'offline' | 'connecting'

/** One camera on a wall. */
export interface Camera {
    id: string
    /** What the camera is called, written on its tile. */
    name: string
    state: CameraState
    /** A plain video file or stream the tile plays muted; give `picture` instead for media an engine feeds. */
    src?: string
    /** A still shown until the video has a frame, and in its place without one. */
    poster?: string
    /** What the app draws as the feed instead of `src`, such as a `VideoPlayer` with a `DetectionOverlay` in its picture. */
    picture?: ReactNode
    /** How many things the finder sees in it now; a chip on the tile when more than none. */
    detections?: number
    /** Something on it calls for a look: the tile is ringed in the critical color. */
    alert?: boolean
}

export interface CameraWallWords {
    live: string
    recording: string
    offline: string
    connecting: string
    /** The chip of what the finder sees now, by how many. */
    detections: (count: number) => string
    /** A tile's name as a button that takes it large, by the camera's name. */
    enlarge: (name: string) => string
}

export const CAMERA_WALL_WORDS: CameraWallWords = {
    live: 'Live',
    recording: 'Recording',
    offline: 'Offline',
    connecting: 'Connecting',
    detections: (count) => `${count.toLocaleString('en-US')} ${count === 1 ? 'detection' : 'detections'}`,
    enlarge: (name) => `Show ${name} large`,
}

/** Where a catalog holds a camera wall's words, and the arguments its phrases name. */
export const CAMERA_WALL_PART: WordsPart<CameraWallWords> = {
    id: 'cameraWall',
    words: CAMERA_WALL_WORDS,
    args: { detections: 'count', enlarge: 'name' },
}

/** A camera wall's phrases as ICU messages in English, for the catalog. */
export const CAMERA_WALL_MESSAGES: WordMessages<CameraWallWords> = {
    detections: '{count, plural, one {# detection} other {# detections}}',
    enlarge: 'Show {name} large',
}

export interface CameraWallProps {
    cameras: readonly Camera[]
    /** The camera taken large: first on the wall, two columns wide and two rows tall where the wall has the room. */
    focused?: string
    /** Makes each tile a button: a press takes it large, and a press on the large one puts it back (`undefined`). */
    onFocusChange?: (id: string | undefined) => void
    /** Whether the tiles' own videos play; off, each stands on its first frame or its poster. */
    playing?: boolean
    /** The narrowest a tile gets before the wall takes a column away. */
    min?: 'xs' | 'sm' | 'md' | 'lg'
    words?: Partial<CameraWallWords>
    className?: string
}

/** Each state's dot: red and breathing while recording, green while live, quiet while away or on its way. */
const DOT: Record<CameraState, string> = {
    live: 'bg-good',
    recording: 'bg-critical motion-safe:animate-pulse',
    offline: 'bg-faint',
    connecting: 'bg-muted-foreground',
}

/**
 * Cameras side by side, as a watch room shows them: each feed in a tile of the video's shape on the
 * dark of a picture, its name at its foot, its state at its top (live, recording with a red dot,
 * offline with no picture, connecting with a spinner), how many things the finder sees in it now,
 * and a critical ring on one that calls for a look. The wall takes as many columns as fit, never a
 * tile narrower than `min`; the focused camera comes first, two columns wide and two rows tall where
 * there is the room, so one feed can be watched closely with the rest still in view.
 *
 * A tile plays `src` muted on its own, or draws the app's `picture`, such as a `VideoPlayer` with a
 * `DetectionOverlay` for the focused one. With `onFocusChange` each tile is a button, or, when it
 * draws the app's `picture` (which takes its own presses), carries a button at its top that takes it
 * large.
 */
export function CameraWall({ cameras, focused, onFocusChange, playing = true, min = 'sm', words: given, className }: CameraWallProps) {
    const words = useWords(CAMERA_WALL_PART, given)
    return (
        <div className={cn('@container', className)}>
            <Columns count="fill" min={min} gap="sm" className="grid-flow-row-dense">
                {cameras.map((camera) => (
                    <CameraTile
                        key={camera.id}
                        camera={camera}
                        large={camera.id === focused}
                        playing={playing}
                        words={words}
                        onPress={
                            onFocusChange === undefined ? undefined : () => onFocusChange(camera.id === focused ? undefined : camera.id)
                        }
                    />
                ))}
            </Columns>
        </div>
    )
}

interface CameraTileProps {
    camera: Camera
    large: boolean
    playing: boolean
    words: CameraWallWords
    onPress?: () => void
}

/** One feed: the picture, its state and count at the top, its name at the foot. */
function CameraTile({ camera, large, playing, words, onPress }: CameraTileProps) {
    const away = camera.state === 'offline'
    return (
        <div
            data-slot="camera-tile"
            data-state={camera.state}
            data-large={large || undefined}
            data-alert={camera.alert === true || undefined}
            className={cn(
                'relative isolate aspect-video overflow-hidden rounded-surface bg-terminal text-terminal-foreground',
                large && '-order-1 @2xl:col-span-2 @2xl:row-span-2',
                camera.alert === true && 'ring-2 ring-critical',
            )}
        >
            {away ? (
                <div className="absolute inset-0 flex items-center justify-center text-terminal-foreground/50">
                    <VideoOff aria-hidden className="size-6" />
                </div>
            ) : camera.picture !== undefined ? (
                <div className="absolute inset-0">{camera.picture}</div>
            ) : camera.src !== undefined ? (
                <video
                    src={camera.src}
                    poster={camera.poster}
                    autoPlay={playing}
                    muted
                    loop
                    playsInline
                    preload="auto"
                    className="absolute inset-0 size-full object-contain"
                />
            ) : camera.poster !== undefined ? (
                <img src={camera.poster} alt="" className="absolute inset-0 size-full object-contain" />
            ) : null}

            {onPress !== undefined && camera.picture === undefined && (
                <button
                    type="button"
                    data-slot="camera-tile-press"
                    aria-label={words.enlarge(camera.name)}
                    aria-pressed={large}
                    onClick={onPress}
                    className="absolute inset-0 z-1 cursor-pointer rounded-surface outline-none hover:bg-terminal-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                />
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 z-2 flex items-start justify-between gap-2 p-2">
                <span className="flex items-center gap-1.5 rounded-mini bg-terminal/70 px-1.5 py-0.5 text-2xs font-medium">
                    {camera.state === 'connecting' ? (
                        <Spinner aria-hidden className="size-3" />
                    ) : (
                        <span aria-hidden className={cn('size-1.5 rounded-full', DOT[camera.state])} />
                    )}
                    {words[camera.state]}
                </span>
                <span className="flex items-center gap-1">
                    {camera.detections !== undefined && camera.detections > 0 && !away && (
                        <span className="flex items-center gap-1 rounded-mini bg-terminal/70 px-1.5 py-0.5 text-2xs font-medium tabular-nums">
                            <ScanEye aria-hidden className="size-3" />
                            {words.detections(camera.detections)}
                        </span>
                    )}
                    {onPress !== undefined && camera.picture !== undefined && (
                        <IconButton
                            label={words.enlarge(camera.name)}
                            aria-pressed={large}
                            size="icon-xs"
                            onClick={onPress}
                            className="pointer-events-auto bg-terminal/70 text-terminal-foreground hover:bg-terminal/85 hover:text-terminal-foreground"
                        >
                            {large ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
                        </IconButton>
                    )}
                </span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 truncate bg-linear-to-t from-terminal/85 to-transparent px-2 pt-4 pb-1.5 text-xs font-medium">
                {camera.name}
            </div>
        </div>
    )
}
