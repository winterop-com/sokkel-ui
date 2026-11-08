import { useCallback, useEffect, useRef, useState, type Ref } from 'react'

import { cn } from '../../lib/cn'
import { PlayButton, Position } from './MediaControls'
import { useOneSound } from './one-sound'

/** The words the player says, each with an English default. */
export interface AudioPlayerWords {
    play: string
    pause: string
    seek: string
}

const WORDS: AudioPlayerWords = {
    play: 'Play',
    pause: 'Pause',
    seek: 'Seek',
}

/** How the player sits: on whatever holds it, or in a quiet card of its own, as a clip in a message. */
export type AudioPlayerVariant = 'plain' | 'card'

const VARIANT: Record<AudioPlayerVariant, string> = {
    plain: '',
    card: 'rounded-surface border border-border bg-card py-1 pr-3 pl-1',
}

export interface AudioPlayerProps {
    src: string
    /** The recording's levels from start to end, each from 0 to 1. */
    waveform?: readonly number[]
    /** The length in seconds, when the app knows it: shown before the audio has loaded. */
    duration?: number
    /** What the recording is, for a screen reader: its file name, or "Read aloud". */
    label?: string
    variant?: AudioPlayerVariant
    preload?: 'none' | 'metadata' | 'auto'
    /** Whether starting it pauses the other sounds the library plays, and another starting pauses it. */
    exclusive?: boolean
    words?: Partial<AudioPlayerWords>
    /** The `<audio>` element, for whatever the screen around the player needs from it. */
    audioRef?: Ref<HTMLAudioElement>
    className?: string
}

/**
 * A recording in one line: play and pause, the scrubber, and the time played and still to play. The
 * scrubber is the recording's waveform when `waveform` is given, and the media slider otherwise.
 * For a clip sent in a message, a voice note, or an answer read aloud; a track to listen to in full
 * belongs in `MediaBar`.
 *
 * It plays `src` through its own `<audio>`. Starting it pauses whatever else the library is playing,
 * another player, a video or the `MediaBar`, so one sound is heard at a time; `exclusive={false}`
 * lets it play alongside.
 */
export function AudioPlayer({
    src,
    waveform,
    duration: givenDuration,
    label,
    variant = 'plain',
    preload = 'metadata',
    exclusive = true,
    words: given,
    audioRef,
    className,
}: AudioPlayerProps) {
    const words = { ...WORDS, ...given }
    const element = useRef<HTMLAudioElement | null>(null)
    const [playing, setPlaying] = useState(false)
    const [at, setAt] = useState(0)
    const [loaded, setLoaded] = useState(0)
    const duration = loaded > 0 ? loaded : (givenDuration ?? 0)
    const [scrub, setScrub] = useState<number | null>(null)
    useOneSound(element, playing, exclusive)

    const attach = useCallback(
        (node: HTMLAudioElement | null) => {
            element.current = node
            if (typeof audioRef === 'function') audioRef(node)
            else if (audioRef) audioRef.current = node
        },
        [audioRef],
    )

    // While it plays, the position follows each frame, so a waveform fills smoothly.
    useEffect(() => {
        if (!playing) return
        let frame = 0
        const step = () => {
            if (element.current !== null) setAt(element.current.currentTime)
            frame = requestAnimationFrame(step)
        }
        frame = requestAnimationFrame(step)
        return () => cancelAnimationFrame(frame)
    }, [playing])

    const known = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)

    return (
        <div
            role="group"
            aria-label={label}
            data-slot="audio-player"
            className={cn('flex w-full min-w-0 items-center gap-1', VARIANT[variant], className)}
        >
            <audio
                ref={attach}
                src={src}
                preload={preload}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={(event) => setAt(event.currentTarget.currentTime)}
                onLoadedMetadata={(event) => setLoaded(known(event.currentTarget.duration))}
                onDurationChange={(event) => setLoaded(known(event.currentTarget.duration))}
            />
            <PlayButton
                playing={playing}
                words={words}
                onToggle={() => {
                    const audio = element.current
                    if (audio === null) return
                    if (audio.paused) void audio.play().catch(() => undefined)
                    else audio.pause()
                }}
            />
            <Position
                at={scrub ?? at}
                duration={duration}
                label={words.seek}
                waveform={waveform}
                height={24}
                onScrub={setScrub}
                onSeek={(seconds) => {
                    if (element.current !== null) element.current.currentTime = seconds
                    setAt(seconds)
                }}
                className="min-w-0 flex-1"
            />
        </div>
    )
}
