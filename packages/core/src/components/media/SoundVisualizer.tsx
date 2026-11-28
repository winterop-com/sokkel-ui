import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

import { useReducedMotion } from '../../hooks/use-reduced-motion'
import { cn } from '../../lib/cn'
import {
    MUSIC_RANGE,
    areaPoints,
    autoBands,
    bandLevels,
    barLayout,
    holdPeak,
    isQuiet,
    mirrorBase,
    rampAlong,
    rampIndex,
    rampStops,
    rampSteps,
    resample,
    ringRadii,
    ringSpokes,
    settle,
    stopColor,
    trailFade,
    triggerAt,
    waveGain,
    wavePoints,
    WAVE_SPAN,
    type Point,
    type SoundAlign,
    type SoundEffect,
    type SoundFrame,
    type SoundKind,
    type SoundRamp,
    type SoundRampBy,
    type SoundRange,
} from './sound'
import { clampDelay, createDelay, outputDelay } from './sound-delay'
import { isAnalyser, isStream, soundGraph, sounding, type SoundSource, type SoundTap } from './sound-source'

export type { SoundAlign, SoundEffect, SoundFrame, SoundKind, SoundRamp, SoundRampBy, SoundRampName, SoundRange } from './sound'
export type { SoundSource } from './sound-source'

export interface SoundVisualizerProps {
    /**
     * What to listen to: a media element (audio or video) or a live stream such as a microphone's.
     * An element is wired to Web Audio on its first play and is heard through it from then on, so
     * a cross-origin one needs `crossOrigin` and a server that allows it; one without is never
     * wired and draws at rest. An app that wires its element into its own audio graph passes an
     * `AnalyserNode` from that graph instead, as an element can be wired only once.
     */
    source?: SoundSource | null
    /** For an analyser source, whether what it hears is playing; an element or a stream says so itself. */
    playing?: boolean
    /** A still picture drawn instead of listening: levels for a spectrum, an area or a ring, samples for a wave. */
    frame?: SoundFrame
    kind?: SoundKind
    /** Where a spectrum's bars and an area's curve stand: on the floor, or about the middle. */
    align?: SoundAlign
    /** How many bands; by default as many as the box holds. A frame's levels are stretched to fit. */
    bands?: number
    /** The frequencies the bands spread over, in hertz; music's range by default, `VOICE_RANGE` for speech. */
    range?: SoundRange
    /** The least a band stands, as a share of its reach, so a quiet band still shows. */
    floor?: number
    /** The most a band stands, as a share of its reach. */
    ceiling?: number
    /** The widest a bar is drawn, in pixels; a row of narrower bars is centered. */
    barWidth?: number
    /** The color token the drawing is inked in, by name: `primary`, `chart-3`, `kind-teal`. A `ramp` takes its place. */
    color?: string
    /**
     * The colors the drawing runs through from quiet to loud, in place of the one `color`: a named
     * ramp of the theme's tokens (`heat`, `cool`, `lagoon`, `ink`, `primary`, listed in
     * `SOUND_RAMPS`), or stops, each a token by name or a CSS color, such as
     * `['warning', 'primary', 'critical']` for amber through the theme's primary to red.
     */
    ramp?: SoundRamp
    /** What places a bar or a spoke on the ramp: its height in the box, or its level. */
    rampBy?: SoundRampBy
    /**
     * A reflection of a spectrum's bars or an area's curve below their baseline, fading toward the
     * foot; for a drawing standing on the floor.
     */
    mirror?: boolean
    /**
     * `glow` blooms what is lit in its own colors; `trails` leaves a short fading afterimage of the
     * frames before, while live or as an app's `frame` changes. Both are off while motion is reduced.
     */
    effect?: SoundEffect
    /** Drawn faint, to stand behind text such as a player's title. */
    backdrop?: boolean
    /**
     * How long the picture is held back behind the sound it reads, in milliseconds, so it moves
     * with what is heard: an analyser reads the sound before the output plays it, and a Bluetooth
     * output is 150 to 500 milliseconds behind. `auto` holds it back by the latency the browser
     * reports for the source's audio context, and by nothing where it reports none. At most a
     * second.
     */
    delay?: number | 'auto'
    /** Milliseconds added to `delay`, such as a hand-set correction on top of `auto` for an output whose latency the browser under-reports. */
    delayOffset?: number
    /** What the picture is called, for a screen reader. */
    label?: string
    /** Drawn over the picture in the same box, such as a title before a backdrop. */
    children?: ReactNode
    /** Drawn in a ring's middle, clipped to a circle inside it: a cover, a play button. */
    middle?: ReactNode
    className?: string
}

/**
 * A live picture of what is playing, read from a media element or a stream through Web Audio and
 * drawn on a canvas: a spectrum of bars, an area, a wave or a ring. It fills the box it is given,
 * draws in the theme's colors and follows the scheme as it changes.
 *
 * It draws in one color token, or along a `ramp` of tokens or CSS colors by height or by level; a
 * spectrum or an area can stand over its faded reflection (`mirror`), and `effect` adds a glow or
 * trails, both off while motion is reduced.
 *
 * It moves only while the source sounds and the box is in view. When the sound stops it falls to
 * rest and holds still, with no frame loop running; hidden or unmounted, it stops at once. A
 * `frame` draws without any audio.
 *
 * `data-state` on the box says what it is doing: `still`, `live`, or `unreadable` for a source Web
 * Audio cannot read.
 */
export function SoundVisualizer({
    source = null,
    playing = true,
    frame,
    kind = 'spectrum',
    align = 'bottom',
    bands,
    range = MUSIC_RANGE,
    floor = 0,
    ceiling = 1,
    barWidth,
    color = 'primary',
    ramp,
    rampBy = 'height',
    mirror = false,
    effect = 'none',
    backdrop = false,
    delay = 0,
    delayOffset = 0,
    label = 'Sound',
    children,
    middle,
    className,
}: SoundVisualizerProps) {
    const box = useRef<HTMLDivElement>(null)
    const canvas = useRef<HTMLCanvasElement>(null)
    const engine = useRef<Engine | null>(null)
    const reduced = useReducedMotion()
    const shownEffect = reduced ? 'none' : effect
    // Joined, so stops written inline in the render are not taken as a new ramp each time.
    const rampKey = ramp === undefined ? '' : rampStops(ramp).join('\n')

    useLayoutEffect(() => {
        if (box.current === null || canvas.current === null) return
        const made = createEngine(canvas.current, box.current)
        engine.current = made
        return () => {
            made.destroy()
            engine.current = null
        }
    }, [])

    const low = range.low
    const high = range.high
    useLayoutEffect(() => {
        engine.current?.set({
            kind,
            align,
            bands,
            range: { low, high },
            floor,
            ceiling,
            barWidth,
            ramp: rampKey === '' ? undefined : rampKey.split('\n'),
            rampBy,
            mirror,
            effect: shownEffect,
            backdrop,
            frame,
            playing,
            delay,
            delayOffset,
        })
    }, [
        kind,
        align,
        bands,
        low,
        high,
        floor,
        ceiling,
        barWidth,
        rampKey,
        rampBy,
        mirror,
        shownEffect,
        backdrop,
        frame,
        playing,
        delay,
        delayOffset,
    ])

    useLayoutEffect(() => {
        engine.current?.restyle()
    }, [color])

    useEffect(() => {
        engine.current?.listen(source)
    }, [source])

    return (
        <div ref={box} data-kind={kind} className={cn('relative h-full w-full min-w-0 overflow-hidden', className)}>
            <canvas
                ref={canvas}
                role="img"
                aria-label={label}
                style={{ color: `var(--${color})` }}
                className="pointer-events-none absolute inset-0 size-full"
            />
            {children !== undefined && <div className="relative size-full">{children}</div>}
            {middle !== undefined && kind === 'ring' && (
                <div className="absolute top-1/2 left-1/2 size-(--sound-middle) -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full">
                    {middle}
                </div>
            )}
        </div>
    )
}

// The mark `isSoundVisualizer` reads, so a slot can tell this part from any other node without importing it.
SoundVisualizer.soundVisualizer = true

interface Look {
    kind: SoundKind
    align: SoundAlign
    bands: number | undefined
    range: SoundRange
    floor: number
    ceiling: number
    barWidth: number | undefined
    /** The ramp's stops, quiet first, or none to ink in the one color. */
    ramp: readonly string[] | undefined
    rampBy: SoundRampBy
    mirror: boolean
    effect: SoundEffect
    backdrop: boolean
    frame: SoundFrame | undefined
    /** Whether an analyser source is playing; elements and streams say so themselves. */
    playing: boolean
    delay: number | 'auto'
    delayOffset: number
}

interface Engine {
    set: (look: Look) => void
    restyle: () => void
    listen: (source: SoundSource | null) => void
    destroy: () => void
}

/** A ring's middle, as a share of its inner circle's radius, across. */
const MIDDLE = 1.6
/** How strong a backdrop is drawn, against the full drawing. */
const BACKDROP = 0.32
/** How strong a silent band is drawn; a band grows to full strength with its level. */
const QUIET_INK = 0.55
/** The shortest a bar or spoke is drawn, in pixels, so a silent one still shows as a tick. */
const TICK = 2
const FRAME_MS = 1000 / 60
/** How many colors a ramp is mixed into, for a gradient up the box and for a bar colored by its level. */
const SHADES = 24
/** How strong a mirror's reflection starts at its baseline, fading to nothing at the foot. */
const REFLECTION = 0.45
/** The room between the bars and their reflection, in pixels. */
const MIRROR_GAP = 2
/** How far a glow reaches, in pixels: about how far the halo spreads past what is lit. */
const GLOW_REACH = 14
/** How strong the glow is drawn behind the picture. */
const GLOW = 0.9
/** How often the latency the browser reports is read again while drawing, in milliseconds, as an output can change. */
const REPORT_MS = 1000
const ELEMENT_EVENTS = ['play', 'playing', 'pause', 'ended', 'emptied'] as const
const STREAM_EVENTS = ['addtrack', 'removetrack'] as const

/** The drawing's loop and its observers, bound to one canvas for as long as it is mounted. */
function createEngine(canvas: HTMLCanvasElement, box: HTMLDivElement): Engine {
    const context = canvas.getContext('2d')
    let look: Look = {
        kind: 'spectrum',
        align: 'bottom',
        bands: undefined,
        range: MUSIC_RANGE,
        floor: 0,
        ceiling: 1,
        barWidth: undefined,
        ramp: undefined,
        rampBy: 'height',
        mirror: false,
        effect: 'none',
        backdrop: false,
        frame: undefined,
        playing: true,
        delay: 0,
        delayOffset: 0,
    }
    let width = 0
    let height = 0
    let ink = ''
    let corner = 0
    // The ramp mixed into colors the canvas paints, quiet first; empty to ink in the one color.
    let shades: string[] = []
    let rampKey = ''
    let gradient: CanvasGradient | null = null
    let gradientKey = ''
    // Two canvases a glow shrinks the picture through, made the first time one glows.
    let glows: [HTMLCanvasElement, HTMLCanvasElement] | null = null
    let visible = true
    let destroyed = false

    let source: SoundSource | null = null
    let asking: SoundSource | null = null
    let tap: SoundTap | null = null
    let bins: Uint8Array<ArrayBuffer> | null = null
    let wave: Float32Array<ArrayBuffer> | null = null
    let levels: number[] = []
    let samples: ArrayLike<number> = []
    let peak = 0
    let request = 0
    let last = 0
    let quietPainted = false
    // What was read lately, drawn as late as the output is behind.
    const heldBins = createDelay((length) => new Uint8Array(length))
    const heldWave = createDelay((length) => new Float32Array(length))
    let reported = 0
    let reportedAt = Number.NEGATIVE_INFINITY
    let lastHeard = 0

    const count = () => look.bands ?? autoBands(look.kind, width, height)

    /** Whether the source sounds now; an analyser has no events, so `playing` says for one. */
    const heard = (from: SoundSource) => (isAnalyser(from) ? look.playing : sounding(from))
    /** The events that say a source started or stopped; an analyser has none. */
    const eventsOf = (from: SoundSource): readonly string[] => (isAnalyser(from) ? [] : isStream(from) ? STREAM_EVENTS : ELEMENT_EVENTS)

    /** How far the picture is held back now, in milliseconds, reading the reported latency again now and then. */
    const holdBack = (time: number) => {
        if (look.delay === 'auto' && tap !== null && time - reportedAt > REPORT_MS) {
            reported = outputDelay(tap.analyser.context as Partial<AudioContext>)
            reportedAt = time
        }
        return clampDelay((look.delay === 'auto' ? reported : look.delay) + look.delayOffset)
    }

    /** Forgets what was held back, so a picture that starts again never draws the sound from before. */
    const forget = () => {
        heldBins.clear()
        heldWave.clear()
        reportedAt = Number.NEGATIVE_INFINITY
    }

    const setState = (state: 'still' | 'live' | 'unreadable') => {
        box.dataset.state = state
    }

    /**
     * Colors read in the canvas's own scope, so a ramp follows a `data-theme-scope` around it. One
     * that is no color comes back as the ink, and a token that is not set as the inherited color.
     */
    const readColors = (colors: readonly string[]) => {
        const kept = canvas.style.color
        const read = colors.map((color) => {
            canvas.style.color = kept
            canvas.style.color = color
            return getComputedStyle(canvas).color
        })
        canvas.style.color = kept
        return read
    }

    /** Mixes the ramp into the colors the canvas paints, in the theme as it is now. */
    const resolveRamp = () => {
        const stops = look.ramp ?? []
        rampKey = stops.join('\n')
        shades = stops.length === 0 ? [] : readColors(rampSteps(readColors(stops.map(stopColor)), stops.length === 1 ? 1 : SHADES))
        gradient = null
    }

    /** Whether the drawing has a reflection under it: a spectrum or an area standing on the floor. */
    const mirrored = () => look.mirror && look.align === 'bottom' && (look.kind === 'spectrum' || look.kind === 'area')

    /**
     * What the drawing is filled and stroked with: the ink, or the ramp as a gradient up the box
     * from the baseline, out from the middle line, or out from a ring's circle. Made again only
     * when the box, the kind or the ramp changes.
     */
    const fill = (draw: CanvasRenderingContext2D, base: number): string | CanvasGradient => {
        const quiet = shades[0]
        if (quiet === undefined) return ink
        if (shades.length === 1) return quiet
        const key = [look.kind, look.align, base, width, height, rampKey].join('|')
        if (gradient !== null && key === gradientKey) return gradient
        let made: CanvasGradient
        let centered = false
        if (look.kind === 'ring') {
            const { inner, reach } = ringRadii(width, height)
            made = draw.createRadialGradient(width / 2, height / 2, inner, width / 2, height / 2, inner + reach)
        } else if (look.kind === 'wave' || look.align === 'center') {
            made = draw.createLinearGradient(0, 0, 0, height)
            centered = true
        } else {
            made = draw.createLinearGradient(0, base, 0, 0)
        }
        for (const stop of rampAlong(shades.length, centered)) made.addColorStop(stop.offset, shades[stop.step] ?? quiet)
        gradient = made
        gradientKey = key
        return made
    }

    /**
     * Blooms the picture: shrunk by halves and stretched back over the whole box, drawn behind
     * itself, so what is lit glows in its own colors. A few small copies a frame, so it costs
     * little at any size.
     */
    const bloom = (draw: CanvasRenderingContext2D, ratio: number, strength: number) => {
        glows ??= [document.createElement('canvas'), document.createElement('canvas')]
        const halvings = Math.max(1, Math.round(Math.log2(GLOW_REACH * ratio)))
        let from: HTMLCanvasElement = canvas
        let wide = canvas.width
        let tall = canvas.height
        for (let step = 0; step < halvings; step += 1) {
            const into = glows[step % 2]
            const shrunk = into.getContext('2d')
            if (shrunk === null) return
            const nextWide = Math.max(1, Math.ceil(wide / 2))
            const nextTall = Math.max(1, Math.ceil(tall / 2))
            if (into.width < nextWide || into.height < nextTall) {
                into.width = Math.max(into.width, nextWide)
                into.height = Math.max(into.height, nextTall)
            }
            shrunk.clearRect(0, 0, nextWide, nextTall)
            shrunk.drawImage(from, 0, 0, wide, tall, 0, 0, nextWide, nextTall)
            from = into
            wide = nextWide
            tall = nextTall
        }
        draw.setTransform(1, 0, 0, 1, 0, 0)
        draw.globalCompositeOperation = 'destination-over'
        draw.globalAlpha = GLOW * strength
        draw.imageSmoothingEnabled = true
        draw.drawImage(from, 0, 0, wide, tall, 0, 0, canvas.width, canvas.height)
        draw.globalCompositeOperation = 'source-over'
    }

    /**
     * Draws the picture. `fade` above zero keeps the last one, wiped by that share, under the new
     * one, as trails draw; otherwise the canvas is cleared first.
     */
    const paint = (fade = 0) => {
        if (context === null || width <= 0 || height <= 0) return
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.globalAlpha = 1
        context.globalCompositeOperation = 'source-over'
        if (fade > 0 && fade < 1) {
            // Only the wipe's strength counts, never its color.
            context.globalCompositeOperation = 'destination-out'
            context.globalAlpha = fade
            context.fillStyle = ink
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.globalCompositeOperation = 'source-over'
            context.globalAlpha = 1
        } else context.clearRect(0, 0, canvas.width, canvas.height)
        const ratio = canvas.width / width
        context.setTransform(ratio, 0, 0, ratio, 0, 0)
        const room = mirrored() ? mirrorBase(height) : null
        const base = room?.base ?? height
        const style = fill(context, base)
        context.fillStyle = style
        context.strokeStyle = style
        const strength = look.backdrop ? BACKDROP : 1
        const shade =
            look.rampBy === 'level' && shades.length > 1 ? (level: number) => shades[rampIndex(level, shades.length)] ?? ink : undefined
        const shown = look.frame
        if (look.kind === 'wave') {
            paintWave(context, shown === undefined ? samples : (shown.samples ?? []), width, height, strength)
        } else {
            const wanted = count()
            const raw = shown === undefined ? levels : (shown.levels ?? [])
            const fitted = raw.length === wanted ? raw : raw.length === 0 ? Array.from({ length: wanted }, () => 0) : resample(raw, wanted)
            const span = look.ceiling - look.floor
            const scaled = fitted.map((level) => look.floor + span * Math.min(1, Math.max(0, level)))
            if (look.kind === 'spectrum') paintSpectrum(context, fitted, scaled, width, base, look, corner, strength, shade)
            else if (look.kind === 'area') paintArea(context, scaled, width, base, look.align, strength)
            else paintRing(context, fitted, scaled, width, height, corner, strength, shade)
        }
        if (room !== null) reflect(context, canvas, base * ratio, MIRROR_GAP * ratio, ink)
        if (look.effect === 'glow') bloom(context, ratio, strength)
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.globalAlpha = 1
    }

    const measure = () => {
        width = canvas.clientWidth
        height = canvas.clientHeight
        const ratio = window.devicePixelRatio || 1
        canvas.width = Math.max(1, Math.round(width * ratio))
        canvas.height = Math.max(1, Math.round(height * ratio))
        box.style.setProperty('--sound-middle', `${String(Math.floor(ringRadii(width, height).inner * MIDDLE))}px`)
        paint()
    }

    const restyle = () => {
        const style = getComputedStyle(canvas)
        ink = style.color
        corner = Number.parseFloat(style.getPropertyValue('--radius')) || 0
        resolveRamp()
        paint()
    }

    const step = (time: number) => {
        request = 0
        if (tap === null || source === null || !visible || destroyed) return
        const elapsed = last === 0 ? FRAME_MS : Math.min(100, time - last)
        last = time
        const delay = holdBack(time)
        const sounds = heard(source)
        if (sounds) lastHeard = time
        let quiet: boolean
        if (look.kind === 'wave') {
            if (wave?.length !== tap.analyser.fftSize) wave = new Float32Array(tap.analyser.fftSize)
            tap.analyser.getFloatTimeDomainData(wave)
            const start = triggerAt(wave, WAVE_SPAN)
            let trace = wave.subarray(start, start + WAVE_SPAN)
            heldBins.clear()
            if (delay > 0) {
                heldWave.push(trace, time)
                trace = heldWave.read(delay) ?? trace
            } else heldWave.clear()
            peak = holdPeak(peak, trace, elapsed)
            const gain = waveGain(peak)
            samples = trace.map((sample) => sample * gain)
            quiet = isQuiet(trace)
        } else {
            if (bins?.length !== tap.analyser.frequencyBinCount) bins = new Uint8Array(tap.analyser.frequencyBinCount)
            tap.analyser.getByteFrequencyData(bins)
            let reading = bins
            heldWave.clear()
            if (delay > 0) {
                heldBins.push(bins, time)
                reading = heldBins.read(delay) ?? bins
            } else heldBins.clear()
            levels = settle(levels, bandLevels(reading, count(), tap.sampleRate, look.range), elapsed)
            quiet = isQuiet(levels)
        }
        // A quiet frame is drawn clean, so what rests is the floor rather than a fading afterimage.
        if (!(quiet && quietPainted) && look.frame === undefined) paint(look.effect === 'trails' && !quiet ? trailFade(elapsed) : 0)
        quietPainted = quiet
        // After the sound stops the bands keep falling until they rest, and a held-back picture
        // plays out what the output has still to play, then the loop ends.
        if (sounds || !quiet || time - lastHeard < delay) {
            request = requestAnimationFrame(step)
        } else {
            last = 0
            forget()
            setState('still')
        }
    }

    const start = () => {
        if (request !== 0 || tap === null || source === null || !visible || destroyed || look.frame !== undefined) return
        setState('live')
        request = requestAnimationFrame(step)
    }

    const stop = () => {
        if (request !== 0) {
            cancelAnimationFrame(request)
            setState('still')
        }
        request = 0
        last = 0
        forget()
    }

    const acquire = async (wanted: SoundSource) => {
        asking = wanted
        const got = await soundGraph().listen(wanted)
        if (asking === wanted) asking = null
        if (destroyed || wanted !== source) {
            got?.release()
            return
        }
        if (got === null) {
            setState('unreadable')
            return
        }
        tap = got
        start()
    }

    const changed = () => {
        if (source === null) return
        if (heard(source)) {
            soundGraph().wake()
            if (tap === null && asking !== source) void acquire(source)
        }
        start()
    }

    const detach = () => {
        stop()
        if (source !== null) for (const name of eventsOf(source)) source.removeEventListener(name, changed)
        tap?.release()
        tap = null
        levels = []
        samples = []
        peak = 0
        quietPainted = false
    }

    const resized = new ResizeObserver(measure)
    resized.observe(box)
    // The scheme, the theme and token overrides are set on the root element.
    const themed = new MutationObserver(restyle)
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })
    const seen = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true
        if (visible) start()
        else stop()
    })
    seen.observe(box)
    setState('still')
    restyle()
    measure()

    return {
        set(next) {
            // A frame that follows another, as an app passes its own levels, leaves trails as the loop does.
            const stepped = next.frame !== undefined && look.frame !== undefined && next.frame !== look.frame
            look = next
            quietPainted = false
            reportedAt = Number.NEGATIVE_INFINITY
            if ((look.ramp ?? []).join('\n') !== rampKey) resolveRamp()
            // The canvases a glow shrinks through are let go once it is off.
            if (look.effect !== 'glow') glows = null
            if (look.frame !== undefined) stop()
            else if (source !== null) changed()
            const shown = look.frame
            const quiet = shown === undefined || isQuiet(look.kind === 'wave' ? (shown.samples ?? []) : (shown.levels ?? []))
            paint(stepped && look.effect === 'trails' && !quiet ? trailFade(FRAME_MS) : 0)
        },
        restyle,
        listen(next) {
            if (next === source) return
            detach()
            source = next
            setState('still')
            if (source !== null) {
                for (const name of eventsOf(source)) source.addEventListener(name, changed)
                changed()
            }
            paint()
        },
        destroy() {
            destroyed = true
            detach()
            source = null
            resized.disconnect()
            themed.disconnect()
            seen.disconnect()
        },
    }
}

const unit = (value: number) => Math.min(1, Math.max(0, value))

/** A bar with its corners from the radius token, the corners at its foot square when it stands on the floor. */
function bar(context: CanvasRenderingContext2D, x: number, y: number, wide: number, tall: number, round: number, footed: boolean) {
    if (round <= 0 || typeof context.roundRect !== 'function') {
        context.fillRect(x, y, wide, tall)
        return
    }
    context.beginPath()
    context.roundRect(x, y, wide, tall, footed ? [round, round, 0, 0] : round)
    context.fill()
}

function paintSpectrum(
    context: CanvasRenderingContext2D,
    levels: readonly number[],
    scaled: readonly number[],
    width: number,
    height: number,
    look: Look,
    corner: number,
    strength: number,
    shade?: (level: number) => string,
) {
    const { bar: wide, gap, offset } = barLayout(width, scaled.length, look.barWidth)
    const centered = look.align === 'center'
    const least = Math.min(height, TICK)
    scaled.forEach((level, index) => {
        const tall = Math.max(least, level * height)
        const x = offset + index * (wide + gap)
        const y = centered ? (height - tall) / 2 : height - tall
        const loud = unit(levels[index] ?? 0)
        context.globalAlpha = strength * (QUIET_INK + (1 - QUIET_INK) * loud)
        if (shade !== undefined) context.fillStyle = shade(loud)
        bar(context, x, y, wide, tall, Math.min(corner, wide / 2, tall / 2), !centered)
    })
}

/**
 * Draws what stands above the baseline again below it, upside down past a small gap, and fades it
 * toward the foot. In the canvas's own pixels; `ink` only wipes, so its color never shows.
 */
function reflect(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, baseline: number, gap: number, ink: string) {
    const base = Math.round(baseline)
    const room = canvas.height - base
    const span = Math.min(room, base)
    if (room <= 0 || span <= 0) return
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, base, canvas.width, room)
    context.setTransform(1, 0, 0, -1, 0, 2 * base + Math.round(gap))
    context.globalAlpha = REFLECTION
    context.drawImage(canvas, 0, base - span, canvas.width, span, 0, base - span, canvas.width, span)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'destination-out'
    const fade = context.createLinearGradient(0, base, 0, canvas.height)
    fade.addColorStop(0, 'transparent')
    fade.addColorStop(1, ink)
    context.fillStyle = fade
    context.fillRect(0, base, canvas.width, room)
    context.globalCompositeOperation = 'source-over'
}

/** A curve through the points, joined through the midpoints between neighbors and run flat to both edges. */
function curve(context: CanvasRenderingContext2D, points: readonly Point[], width: number, reverse: boolean) {
    const line = reverse ? [...points].reverse() : points
    const first = line[0]
    const end = line[line.length - 1]
    if (first === undefined || end === undefined) return
    context.lineTo(reverse ? width : 0, first.y)
    context.lineTo(first.x, first.y)
    for (let index = 1; index < line.length - 1; index += 1) {
        const here = line[index]
        const next = line[index + 1]
        if (here === undefined || next === undefined) continue
        context.quadraticCurveTo(here.x, here.y, (here.x + next.x) / 2, (here.y + next.y) / 2)
    }
    context.lineTo(end.x, end.y)
    context.lineTo(reverse ? 0 : width, end.y)
}

function paintArea(
    context: CanvasRenderingContext2D,
    scaled: readonly number[],
    width: number,
    height: number,
    align: SoundAlign,
    strength: number,
) {
    const centered = align === 'center'
    const base = centered ? height / 2 : height
    const reach = Math.max(0, (centered ? height / 2 : height) - TICK / 2)
    const top = areaPoints(scaled, width, base - TICK / 2, reach - TICK / 2)
    const under = top.map((point) => ({ x: point.x, y: 2 * base - point.y }))
    context.beginPath()
    context.moveTo(0, centered ? base : height)
    curve(context, top, width, false)
    if (centered) curve(context, under, width, true)
    else context.lineTo(width, height)
    context.closePath()
    context.globalAlpha = strength * 0.34
    context.fill()
    context.globalAlpha = strength
    context.lineWidth = Math.min(3, Math.max(1.5, height * 0.008))
    context.lineJoin = 'round'
    for (const edge of centered ? [top, under] : [top]) {
        context.beginPath()
        context.moveTo(0, edge[0]?.y ?? base)
        curve(context, edge, width, false)
        context.stroke()
    }
}

function paintWave(context: CanvasRenderingContext2D, samples: ArrayLike<number>, width: number, height: number, strength: number) {
    const line = Math.min(3, Math.max(1.5, height * 0.01))
    // The trace keeps clear of the top and bottom edges by half its own width.
    const points = wavePoints(samples, width, Math.max(0, height - line)).map((point) => ({ x: point.x, y: point.y + line / 2 }))
    context.globalAlpha = strength
    context.lineWidth = line
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.beginPath()
    points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y)
        else context.lineTo(point.x, point.y)
    })
    context.stroke()
}

function paintRing(
    context: CanvasRenderingContext2D,
    levels: readonly number[],
    scaled: readonly number[],
    width: number,
    height: number,
    corner: number,
    strength: number,
    shade?: (level: number) => string,
) {
    const { inner, reach } = ringRadii(width, height)
    if (inner <= 0 || scaled.length === 0) return
    const center = { x: width / 2, y: height / 2 }
    const slot = (Math.PI * inner) / scaled.length
    const thick = Math.min(8, Math.max(1, slot * 0.55))
    context.globalAlpha = strength * 0.3
    context.lineWidth = 1
    context.beginPath()
    context.arc(center.x, center.y, inner - thick, 0, Math.PI * 2)
    context.stroke()
    context.lineWidth = thick
    context.lineCap = corner > 0 ? 'round' : 'butt'
    const spokes = ringSpokes(scaled, center, inner, reach - thick, TICK)
    spokes.forEach((spoke, index) => {
        const loud = unit(levels[index % levels.length] ?? 0)
        context.globalAlpha = strength * (QUIET_INK + (1 - QUIET_INK) * loud)
        if (shade !== undefined) context.strokeStyle = shade(loud)
        context.beginPath()
        context.moveTo(spoke.from.x, spoke.from.y)
        context.lineTo(spoke.to.x, spoke.to.y)
        context.stroke()
    })
}
