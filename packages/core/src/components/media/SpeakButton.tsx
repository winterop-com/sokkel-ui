import { CircleAlert, Square, Volume2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { IconButton } from '../IconButton'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { useOneSound } from './one-sound'

/** Where a read-aloud stands: waiting, fetching its audio, playing it, or failed. */
export type SpeakState = 'idle' | 'loading' | 'playing' | 'error'

/** What a press does: fetch the audio and play it, play the audio kept, stop it playing, or stop the fetch. */
export type SpeakPress = 'load' | 'play' | 'stop' | 'cancel'

/** What a press does in `state`, with the audio fetched before or not; after a failure it fetches again. */
export function speakPress(state: SpeakState, kept: boolean): SpeakPress {
    if (state === 'loading') return 'cancel'
    if (state === 'playing') return 'stop'
    return kept && state !== 'error' ? 'play' : 'load'
}

/** The audio `load` answers with: an address to play from, or the audio itself. */
export type SpeakAudio = string | Blob

/** The words the button says, each with an English default. */
export interface SpeakButtonWords {
    /** The button's name while it waits, and its text when labeled. */
    speak: string
    /** Its name while the audio is fetched; a press stops the fetch. */
    loading: string
    /** Its name while the audio plays, and its text when labeled; a press stops it. */
    stop: string
    /** Said on hover and to a screen reader once the audio could not be fetched or played. */
    failed: string
    /** Its text after a failure, when labeled; a press fetches the audio again. */
    retry: string
}

const WORDS: SpeakButtonWords = {
    speak: 'Read aloud',
    loading: 'Loading the audio',
    stop: 'Stop',
    failed: 'The audio could not be played',
    retry: 'Try again',
}

export interface SpeakButtonProps {
    /**
     * Fetches the text read aloud, called on the first press: an address the audio plays from, or
     * the audio as a `Blob`. Its answer is kept while the button is mounted, so a second press plays
     * at once; `signal` aborts when the person stops the fetch or the button goes away.
     */
    load: (options: { signal: AbortSignal }) => Promise<SpeakAudio>
    /** `icon` is an icon button, for a hover bar; `labeled` adds its words, for a reply's row of actions. */
    variant?: 'icon' | 'labeled'
    /** The state the button starts in, for a still such as a story: a press acts from there. */
    defaultState?: SpeakState
    /** Hears each change of state. */
    onStateChange?: (state: SpeakState) => void
    /** Whether playing pauses the other sounds the library plays, and another starting stops it. */
    exclusive?: boolean
    className?: string
    words?: Partial<SpeakButtonWords>
}

/**
 * A button that reads a text aloud with audio the app fetches on demand: the first press calls
 * `load`, the button spins while it answers, and the audio plays; a press while it plays stops it,
 * and a press while it loads stops the fetch. The answer is kept, so pressing again plays at once.
 * A fetch or a playback that fails says so on the button, and the next press fetches again.
 *
 * One sound is heard at a time: playing pauses any other player the library plays through, and
 * another starting stops this one, unless `exclusive={false}`. Where the browser refuses to play
 * after a slow fetch (some do once the press is long past), the button waits with the audio kept,
 * and the next press plays it.
 */
export function SpeakButton({
    load,
    variant = 'icon',
    defaultState = 'idle',
    onStateChange,
    exclusive = true,
    className,
    words: given,
}: SpeakButtonProps) {
    const words = { ...WORDS, ...given }
    const [state, setState] = useState<SpeakState>(defaultState)
    const element = useRef<HTMLAudioElement | null>(null)
    const kept = useRef<{ url: string; made: boolean } | null>(null)
    const fetching = useRef<AbortController | null>(null)
    const latest = useRef({ load, onStateChange })
    useLayoutEffect(() => {
        latest.current = { load, onStateChange }
    })
    useOneSound(element, state === 'playing', exclusive)

    const change = (next: SpeakState) => {
        setState(next)
        latest.current.onStateChange?.(next)
    }

    const drop = () => {
        if (kept.current?.made === true) URL.revokeObjectURL(kept.current.url)
        kept.current = null
    }

    useEffect(
        () => () => {
            fetching.current?.abort()
            if (kept.current?.made === true) URL.revokeObjectURL(kept.current.url)
        },
        [],
    )

    const play = (audio: HTMLAudioElement) => {
        audio.currentTime = 0
        audio.play().catch((error: unknown) => {
            const name = error instanceof DOMException ? error.name : ''
            // Stopped before it began, or refused after a slow fetch: the next press plays it.
            if (name === 'AbortError' || name === 'NotAllowedError') change('idle')
            else {
                drop()
                change('error')
            }
        })
    }

    const press = () => {
        const audio = element.current
        if (audio === null) return
        const action = speakPress(state, kept.current !== null)
        if (action === 'cancel') {
            fetching.current?.abort()
            fetching.current = null
            change('idle')
        } else if (action === 'stop') {
            audio.pause()
            audio.currentTime = 0
        } else if (action === 'play') {
            play(audio)
        } else {
            drop()
            const controller = new AbortController()
            fetching.current = controller
            change('loading')
            // Touching the element inside the press lets a strict browser play it once the audio arrives.
            audio.load()
            latest.current.load({ signal: controller.signal }).then(
                (answer) => {
                    if (controller.signal.aborted) return
                    fetching.current = null
                    const made = typeof answer !== 'string'
                    kept.current = { url: made ? URL.createObjectURL(answer) : answer, made }
                    audio.src = kept.current.url
                    play(audio)
                },
                () => {
                    if (controller.signal.aborted) return
                    fetching.current = null
                    change('error')
                },
            )
        }
    }

    const icon = {
        idle: <Volume2 aria-hidden />,
        loading: <Spinner aria-hidden role={undefined} aria-label={undefined} />,
        playing: <Square className="fill-current" aria-hidden />,
        error: <CircleAlert className="text-critical-ink" aria-hidden />,
    }[state]
    const name = { idle: words.speak, loading: words.loading, playing: words.stop, error: words.failed }[state]
    const text = { idle: words.speak, loading: words.speak, playing: words.stop, error: words.retry }[state]

    return (
        <>
            <audio
                ref={element}
                preload="auto"
                hidden
                onPlay={() => change('playing')}
                onPause={() => {
                    if (fetching.current === null) change('idle')
                }}
                onError={() => {
                    if (kept.current === null) return
                    drop()
                    change('error')
                }}
            />
            {variant === 'icon' ? (
                <IconButton
                    label={name}
                    aria-busy={state === 'loading' || undefined}
                    data-state={state}
                    className={className}
                    onClick={press}
                >
                    {icon}
                </IconButton>
            ) : (
                <Button
                    variant="ghost"
                    aria-label={state === 'idle' ? undefined : name}
                    aria-busy={state === 'loading' || undefined}
                    title={state === 'error' ? words.failed : undefined}
                    data-state={state}
                    className={className}
                    onClick={press}
                >
                    {icon}
                    {text}
                </Button>
            )}
        </>
    )
}
