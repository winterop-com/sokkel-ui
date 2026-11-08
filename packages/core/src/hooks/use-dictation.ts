import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Dictation: speech turned into text for a field, with no engine of the library's own. The app
 * either transcribes a recording itself (`transcribe`: the microphone is recorded with
 * `MediaRecorder` and the recording handed over when the person stops), or opts in to the browser's
 * own speech recognition (`recognition`), which some browsers run on their maker's servers, so it
 * is never used unasked. Given both, the browser's recognition is used where there is one and the
 * recording elsewhere; given neither, or neither works here, there is nothing to dictate with.
 */

/** Where a dictation stands: waiting, hearing, turning what it heard into text, or failed. */
export type DictationState = 'idle' | 'recording' | 'transcribing' | 'error'

/** How a dictation hears: a recording for the app's transcriber, or the browser's recognition. */
export type DictationMode = 'recording' | 'recognition'

/** Why a dictation failed: the microphone was refused, there is none (or nothing to record with), or the text could not be had. */
export type DictationProblem = 'refused' | 'missing' | 'failed'

/** What the page offers to dictate with. */
export interface DictationSupport {
    /** The browser has speech recognition. */
    recognition: boolean
    /** The browser records with `MediaRecorder`, and a microphone can be asked for. */
    recording: boolean
}

/** How a dictation hears, from what the app gives and what the page offers; null when it cannot here. */
export function dictationMode(
    given: { transcribe?: unknown; recognition?: boolean; microphone?: unknown },
    support: DictationSupport,
): DictationMode | null {
    if (given.recognition === true && support.recognition) return 'recognition'
    if (given.transcribe !== undefined && support.recording) return 'recording'
    return null
}

/**
 * `value` with `text` put in at `at` (the end by default, and never past it), a space kept between
 * it and a word on either side; the text is trimmed, and nothing changes when it is empty.
 */
export function insertTranscript(value: string, text: string, at = value.length): { value: string; caret: number } {
    const spoken = text.trim()
    const place = Math.max(0, Math.min(at, value.length))
    if (spoken === '') return { value, caret: place }
    const before = value.slice(0, place)
    const after = value.slice(place)
    const lead = before === '' || /\s$/.test(before) ? '' : ' '
    const tail = after === '' || /^\s/.test(after) ? '' : ' '
    const inserted = `${lead}${spoken}${tail}`
    return { value: `${before}${inserted}${after}`, caret: before.length + lead.length + spoken.length }
}

/** Why a failure happened, from the error a microphone, a recorder or a recognizer gave. */
export function dictationProblem(error: unknown): DictationProblem {
    const name = error instanceof Error || error instanceof DOMException ? error.name : typeof error === 'string' ? error : ''
    if (['NotAllowedError', 'SecurityError', 'not-allowed', 'service-not-allowed'].includes(name)) return 'refused'
    if (['NotFoundError', 'NotReadableError', 'OverconstrainedError', 'NotSupportedError', 'audio-capture'].includes(name)) return 'missing'
    return 'failed'
}

/** One result of the browser's recognition: its best guess first. */
interface RecognitionResult {
    readonly length: number
    readonly [index: number]: { readonly transcript: string }
}

/** What the browser's recognition has heard so far, from its results in order. */
export function recognitionText(results: ArrayLike<RecognitionResult>): string {
    let text = ''
    for (let index = 0; index < results.length; index += 1) {
        const result = results[index]
        if (result.length > 0) text += result[0].transcript
    }
    return text.replace(/\s+/g, ' ').trim()
}

/** The browser's speech recognition, as far as dictation uses it. */
interface Recognizer {
    continuous: boolean
    interimResults: boolean
    lang: string
    onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null
    onerror: ((event: { error: string }) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
    abort: () => void
}

type RecognizerClass = new () => Recognizer

function recognizerClass(): RecognizerClass | undefined {
    if (typeof window === 'undefined') return undefined
    const found = window as unknown as { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass }
    return found.SpeechRecognition ?? found.webkitSpeechRecognition
}

/** What this page offers to dictate with; nothing outside a browser. */
export function dictationSupport(microphone?: unknown): DictationSupport {
    if (typeof window === 'undefined') return { recognition: false, recording: false }
    const recorder = typeof MediaRecorder !== 'undefined'
    const asks = microphone !== undefined || typeof navigator.mediaDevices?.getUserMedia === 'function'
    return { recognition: recognizerClass() !== undefined, recording: recorder && asks }
}

export interface DictationOptions {
    /** Turns a recording into text; the microphone is recorded and the recording handed over when the person stops. */
    transcribe?: (audio: Blob, options: { signal: AbortSignal }) => Promise<string>
    /** Uses the browser's own speech recognition where it has one, ahead of `transcribe`. */
    recognition?: boolean
    /** The language spoken, as a BCP 47 tag, for the browser's recognition: the page's language when absent. */
    lang?: string
    /** Opens what is recorded: the microphone through `getUserMedia` when absent. */
    microphone?: () => Promise<MediaStream>
    /** The longest a recording runs, in seconds, before it stops on its own and is transcribed. */
    limit?: number
    /** The state it starts in, for a still such as a story: nothing records, and stopping or cancelling returns to idle. */
    defaultState?: DictationState
    /** Hears the text once a dictation ends with some. */
    onText: (text: string) => void
    /** Hears each failure with its error. */
    onError?: (error: unknown) => void
}

/** A dictation's state and its moves, for a field's microphone button. */
export interface Dictation {
    state: DictationState
    /** How it hears here; null when there is nothing to dictate with. */
    mode: DictationMode | null
    /** Why it failed, while `error`. */
    problem: DictationProblem | undefined
    /** Whole seconds since the recording began. */
    seconds: number
    /** The stream recorded, while recording, for a level drawn from it. */
    stream: MediaStream | null
    /** What the browser's recognition has heard so far. */
    heard: string
    /** Starts hearing; the microphone is asked for now. */
    start: () => void
    /** Stops hearing and turns what was heard into text. */
    stop: () => void
    /** Stops hearing, or stops the transcription, and drops what was heard. */
    cancel: () => void
}

/** A running dictation's own ends: `finish` keeps what was heard, `drop` throws it away. */
interface Session {
    finish: () => void
    drop: () => void
}

/**
 * Dictation for a field: `start` asks for the microphone and hears, `stop` turns what was heard
 * into text and hands it to `onText`, and `cancel` drops it, while a recording or a transcription
 * runs. The state says which, with the seconds heard, the stream for a level, and why it failed.
 * `Composer` draws it with its `dictation`; an app's own field can use it the same way.
 */
export function useDictation(options: DictationOptions): Dictation {
    const latest = useRef(options)
    useLayoutEffect(() => {
        latest.current = options
    })
    const [support] = useState(() => dictationSupport(options.microphone))
    const mode = dictationMode(options, support)
    const [state, setState] = useState<DictationState>(options.defaultState ?? 'idle')
    const [problem, setProblem] = useState<DictationProblem | undefined>(options.defaultState === 'error' ? 'failed' : undefined)
    const [seconds, setSeconds] = useState(0)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [heard, setHeard] = useState('')
    const session = useRef<Session | null>(null)
    const clock = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

    const stopClock = () => {
        clearInterval(clock.current)
        clock.current = undefined
    }

    const startClock = (onLimit: () => void) => {
        const began = performance.now()
        setSeconds(0)
        clock.current = setInterval(() => {
            const elapsed = (performance.now() - began) / 1000
            setSeconds(Math.floor(elapsed))
            const limit = latest.current.limit
            if (limit !== undefined && elapsed >= limit) onLimit()
        }, 250)
    }

    const done = (text: string) => {
        session.current = null
        setHeard('')
        setState('idle')
        if (text.trim() !== '') latest.current.onText(text.trim())
    }

    const fail = (error: unknown, mine: Session) => {
        if (session.current !== mine) return
        session.current = null
        stopClock()
        setStream(null)
        setProblem(dictationProblem(error))
        setState('error')
        latest.current.onError?.(error)
    }

    const record = () => {
        const controller = new AbortController()
        let recorder: MediaRecorder | null = null
        let media: MediaStream | null = null
        let dropped = false
        const release = () => {
            for (const track of media?.getTracks() ?? []) track.stop()
            setStream(null)
            stopClock()
        }
        const mine: Session = {
            finish: () => {
                // Stopped while the microphone is still being asked for: there is nothing to keep.
                if (recorder === null) cancel()
                else if (recorder.state !== 'inactive') recorder.stop()
            },
            drop: () => {
                dropped = true
                controller.abort()
                if (recorder !== null && recorder.state !== 'inactive') recorder.stop()
                release()
            },
        }
        session.current = mine
        const open = latest.current.microphone ?? (() => navigator.mediaDevices.getUserMedia({ audio: true }))
        open().then(
            (opened) => {
                media = opened
                if (session.current !== mine) {
                    release()
                    return
                }
                const chunks: Blob[] = []
                const made = new MediaRecorder(opened)
                recorder = made
                made.ondataavailable = (event) => {
                    if (event.data.size > 0) chunks.push(event.data)
                }
                made.onstop = () => {
                    release()
                    if (dropped || session.current !== mine) return
                    const audio = new Blob(chunks, { type: made.mimeType || chunks[0]?.type || 'audio/webm' })
                    const transcribe = latest.current.transcribe
                    if (audio.size === 0 || transcribe === undefined) {
                        done('')
                        return
                    }
                    setState('transcribing')
                    transcribe(audio, { signal: controller.signal }).then(
                        (text) => {
                            if (!controller.signal.aborted && session.current === mine) done(text)
                        },
                        (error: unknown) => {
                            if (!controller.signal.aborted) fail(error, mine)
                        },
                    )
                }
                made.start()
                setStream(opened)
                startClock(() => mine.finish())
            },
            (error: unknown) => fail(error, mine),
        )
    }

    const recognize = () => {
        const Made = recognizerClass()
        if (Made === undefined) return
        const recognizer = new Made()
        let text = ''
        let refusal: string | undefined
        let dropped = false
        const mine: Session = {
            finish: () => {
                setState('transcribing')
                recognizer.stop()
            },
            drop: () => {
                dropped = true
                stopClock()
                recognizer.abort()
            },
        }
        session.current = mine
        recognizer.continuous = true
        recognizer.interimResults = true
        recognizer.lang = latest.current.lang ?? (document.documentElement.lang || navigator.language)
        recognizer.onresult = (event) => {
            text = recognitionText(event.results)
            setHeard(text)
        }
        recognizer.onerror = (event) => {
            if (event.error !== 'aborted' && event.error !== 'no-speech') refusal = event.error
        }
        recognizer.onend = () => {
            stopClock()
            if (dropped || session.current !== mine) return
            if (refusal !== undefined) fail(refusal, mine)
            else done(text)
        }
        try {
            recognizer.start()
        } catch (error) {
            fail(error, mine)
            return
        }
        startClock(() => mine.finish())
    }

    const start = () => {
        if (state === 'recording' || state === 'transcribing') return
        setProblem(undefined)
        setHeard('')
        setSeconds(0)
        if (mode === null) {
            setProblem('missing')
            setState('error')
            return
        }
        setState('recording')
        if (mode === 'recognition') recognize()
        else record()
    }

    const stop = () => {
        if (session.current === null) {
            if (state === 'recording' || state === 'transcribing') setState('idle')
            return
        }
        session.current.finish()
    }

    function cancel() {
        const running = session.current
        session.current = null
        running?.drop()
        stopClock()
        setStream(null)
        setHeard('')
        setProblem(undefined)
        setState('idle')
    }

    useEffect(
        () => () => {
            const running = session.current
            session.current = null
            running?.drop()
            clearInterval(clock.current)
        },
        [],
    )

    return { state, mode, problem, seconds, stream, heard, start, stop, cancel }
}
