import {
    ArrowDown,
    ArrowDownLeft,
    ArrowDownRight,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpLeft,
    ArrowUpRight,
    House,
    ZoomIn,
    ZoomOut,
} from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'

import { cn } from '../lib/cn'
import { useWords, type WordsPart } from '../lib/words'
import { Button } from './ui/button'

/** Where a camera turns: -1, 0 or 1 across (left to right) and down the picture (up to down). */
export interface CameraMove {
    pan: -1 | 0 | 1
    tilt: -1 | 0 | 1
}

/** A place the camera keeps, to go back to with one press. */
export interface CameraPreset {
    id: string
    name: string
}

export interface CameraControlWords {
    /** What the pad is called. */
    pad: string
    up: string
    down: string
    left: string
    right: string
    upLeft: string
    upRight: string
    downLeft: string
    downRight: string
    /** The middle of the pad: the camera's home place. */
    home: string
    zoomIn: string
    zoomOut: string
    /** The presets' group. */
    presets: string
}

export const CAMERA_CONTROL_WORDS: CameraControlWords = {
    pad: 'Pan and tilt',
    up: 'Tilt up',
    down: 'Tilt down',
    left: 'Pan left',
    right: 'Pan right',
    upLeft: 'Up and left',
    upRight: 'Up and right',
    downLeft: 'Down and left',
    downRight: 'Down and right',
    home: 'Home',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    presets: 'Presets',
}

/** Where a catalog holds a camera control's words. */
export const CAMERA_CONTROL_PART: WordsPart<CameraControlWords> = { id: 'cameraControl', words: CAMERA_CONTROL_WORDS }

export interface CameraControlProps {
    /** Called with a direction while one is held, and `null` once it is let go: the camera turns for as long as it is held. */
    onMove: (move: CameraMove | null) => void
    /** Called with 1 (in) or -1 (out) while a zoom is held, and 0 once it is let go. */
    onZoom?: (step: -1 | 0 | 1) => void
    /** Called by the middle of the pad, to send the camera to its home place. */
    onHome?: () => void
    presets?: readonly CameraPreset[]
    /** The preset the camera stands at, drawn as chosen. */
    preset?: string
    onPreset?: (id: string) => void
    /** Turns every control off, such as while the camera is offline. */
    disabled?: boolean
    words?: Partial<CameraControlWords>
    className?: string
}

type Way = 'upLeft' | 'up' | 'upRight' | 'left' | 'home' | 'right' | 'downLeft' | 'down' | 'downRight'

const PAD: readonly { way: Way; move?: CameraMove; icon: ReactNode }[] = [
    { way: 'upLeft', move: { pan: -1, tilt: -1 }, icon: <ArrowUpLeft aria-hidden /> },
    { way: 'up', move: { pan: 0, tilt: -1 }, icon: <ArrowUp aria-hidden /> },
    { way: 'upRight', move: { pan: 1, tilt: -1 }, icon: <ArrowUpRight aria-hidden /> },
    { way: 'left', move: { pan: -1, tilt: 0 }, icon: <ArrowLeft aria-hidden /> },
    { way: 'home', icon: <House aria-hidden /> },
    { way: 'right', move: { pan: 1, tilt: 0 }, icon: <ArrowRight aria-hidden /> },
    { way: 'downLeft', move: { pan: -1, tilt: 1 }, icon: <ArrowDownLeft aria-hidden /> },
    { way: 'down', move: { pan: 0, tilt: 1 }, icon: <ArrowDown aria-hidden /> },
    { way: 'downRight', move: { pan: 1, tilt: 1 }, icon: <ArrowDownRight aria-hidden /> },
]

/** The arrow keys a focused pad turns the camera with. */
const KEYS: Record<string, CameraMove> = {
    ArrowUp: { pan: 0, tilt: -1 },
    ArrowDown: { pan: 0, tilt: 1 },
    ArrowLeft: { pan: -1, tilt: 0 },
    ArrowRight: { pan: 1, tilt: 0 },
}

/**
 * The controls of a camera that turns and zooms: a pad of eight directions around a home button, a
 * zoom in and out beside it, and the camera's presets under them. A direction or a zoom acts for as
 * long as it is held, as a camera's own controls do: pressed, the camera starts to turn (`onMove`
 * with the direction), and let go, it stops (`onMove(null)`); the arrow keys do the same while the
 * pad has focus. A preset sends the camera to a place it keeps.
 */
export function CameraControl({
    onMove,
    onZoom,
    onHome,
    presets = [],
    preset,
    onPreset,
    disabled = false,
    words: given,
    className,
}: CameraControlProps) {
    const words = useWords(CAMERA_CONTROL_PART, given)
    const held = useRef<string | null>(null)

    const hold = (key: string, start: () => void) => {
        if (disabled || held.current !== null) return
        held.current = key
        start()
    }
    const release = (stop: () => void) => {
        if (held.current === null) return
        held.current = null
        stop()
    }
    const holding = (key: string, start: () => void, stop: () => void) => ({
        onPointerDown: (event: { currentTarget: HTMLElement; pointerId: number }) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            hold(key, start)
        },
        onPointerUp: () => release(stop),
        onPointerCancel: () => release(stop),
        onLostPointerCapture: () => release(stop),
    })

    const onPadKey = (event: KeyboardEvent<HTMLDivElement>) => {
        const move = KEYS[event.key] as CameraMove | undefined
        if (move === undefined) return
        event.preventDefault()
        if (event.type === 'keydown') hold(event.key, () => onMove(move))
        else if (held.current === event.key) release(() => onMove(null))
    }

    return (
        <div data-slot="camera-control" className={cn('flex flex-col gap-3', className)}>
            <div className="flex items-center gap-3">
                <div
                    role="group"
                    aria-label={words.pad}
                    tabIndex={disabled ? undefined : 0}
                    onKeyDown={onPadKey}
                    onKeyUp={onPadKey}
                    onBlur={() => release(() => onMove(null))}
                    data-slot="camera-pad"
                    className="grid grid-cols-3 gap-1 rounded-surface bg-muted/60 p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                    {PAD.map(({ way, move, icon }) =>
                        move === undefined ? (
                            <Button
                                key={way}
                                variant="ghost"
                                size="icon"
                                aria-label={words.home}
                                disabled={disabled || onHome === undefined}
                                onClick={onHome}
                            >
                                {icon}
                            </Button>
                        ) : (
                            <Button
                                key={way}
                                variant="secondary"
                                size="icon"
                                tabIndex={-1}
                                aria-label={words[way]}
                                disabled={disabled}
                                data-way={way}
                                className="touch-none"
                                {...holding(
                                    way,
                                    () => onMove(move),
                                    () => onMove(null),
                                )}
                            >
                                {icon}
                            </Button>
                        ),
                    )}
                </div>
                {onZoom !== undefined && (
                    <div className="flex flex-col gap-1">
                        <Button
                            variant="secondary"
                            size="icon"
                            aria-label={words.zoomIn}
                            disabled={disabled}
                            className="touch-none"
                            {...holding(
                                'in',
                                () => onZoom(1),
                                () => onZoom(0),
                            )}
                        >
                            <ZoomIn aria-hidden />
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            aria-label={words.zoomOut}
                            disabled={disabled}
                            className="touch-none"
                            {...holding(
                                'out',
                                () => onZoom(-1),
                                () => onZoom(0),
                            )}
                        >
                            <ZoomOut aria-hidden />
                        </Button>
                    </div>
                )}
            </div>
            {presets.length > 0 && (
                <div role="group" aria-label={words.presets} className="flex flex-wrap gap-1">
                    {presets.map((one) => (
                        <Button
                            key={one.id}
                            variant={one.id === preset ? 'secondary' : 'outline'}
                            size="sm"
                            aria-pressed={one.id === preset}
                            disabled={disabled || onPreset === undefined}
                            onClick={() => onPreset?.(one.id)}
                        >
                            {one.name}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    )
}
