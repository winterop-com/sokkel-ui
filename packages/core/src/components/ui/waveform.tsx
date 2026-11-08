'use client'

import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'

export type WaveformProps = HTMLAttributes<HTMLDivElement> & {
    data?: readonly number[]
    barWidth?: number
    barHeight?: number
    barGap?: number
    barRadius?: number
    barColor?: string
    fadeEdges?: boolean
    fadeWidth?: number
    /** Whether a quieter bar is drawn fainter as well as shorter. */
    shade?: boolean
    height?: string | number
    active?: boolean
    onBarClick?: (index: number, value: number) => void
}

export const Waveform = ({
    data = [],
    barWidth = 4,
    barHeight: baseBarHeight = 4,
    barGap = 2,
    barRadius = 2,
    barColor,
    fadeEdges = true,
    fadeWidth = 24,
    shade = true,
    height = 128,
    onBarClick,
    className,
    ...props
}: WaveformProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const heightStyle = typeof height === 'number' ? `${height}px` : height

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const resizeObserver = new ResizeObserver(() => {
            const rect = container.getBoundingClientRect()
            const dpr = window.devicePixelRatio || 1

            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            canvas.style.width = `${rect.width}px`
            canvas.style.height = `${rect.height}px`

            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.scale(dpr, dpr)
                renderWaveform()
            }
        })

        const renderWaveform = () => {
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const rect = canvas.getBoundingClientRect()
            ctx.clearRect(0, 0, rect.width, rect.height)

            const computedBarColor = barColor || getComputedStyle(canvas).color || '#000'

            const barCount = Math.floor(rect.width / (barWidth + barGap))
            const centerY = rect.height / 2

            for (let i = 0; i < barCount; i++) {
                const dataIndex = Math.floor((i / barCount) * data.length)
                const value = data[dataIndex] || 0
                const barHeight = Math.max(baseBarHeight, value * rect.height * 0.8)
                const x = i * (barWidth + barGap)
                const y = centerY - barHeight / 2

                ctx.fillStyle = computedBarColor
                ctx.globalAlpha = shade ? 0.3 + value * 0.7 : 1

                if (barRadius > 0) {
                    ctx.beginPath()
                    ctx.roundRect(x, y, barWidth, barHeight, barRadius)
                    ctx.fill()
                } else {
                    ctx.fillRect(x, y, barWidth, barHeight)
                }
            }

            if (fadeEdges && fadeWidth > 0 && rect.width > 0) {
                const gradient = ctx.createLinearGradient(0, 0, rect.width, 0)
                const fadePercent = Math.min(0.2, fadeWidth / rect.width)

                gradient.addColorStop(0, 'rgba(255,255,255,1)')
                gradient.addColorStop(fadePercent, 'rgba(255,255,255,0)')
                gradient.addColorStop(1 - fadePercent, 'rgba(255,255,255,0)')
                gradient.addColorStop(1, 'rgba(255,255,255,1)')

                ctx.globalCompositeOperation = 'destination-out'
                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, rect.width, rect.height)
                ctx.globalCompositeOperation = 'source-over'
            }

            ctx.globalAlpha = 1
        }

        resizeObserver.observe(container)
        renderWaveform()

        // The bars are painted in the canvas's own text color, so they are painted again when the
        // document's scheme, theme or token overrides change.
        const lookObserver = new MutationObserver(renderWaveform)
        lookObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] })

        return () => {
            resizeObserver.disconnect()
            lookObserver.disconnect()
        }
    }, [data, barWidth, baseBarHeight, barGap, barRadius, barColor, fadeEdges, fadeWidth, shade])

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onBarClick) return

        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = e.clientX - rect.left
        const barIndex = Math.floor(x / (barWidth + barGap))
        const dataIndex = Math.floor((barIndex * data.length) / Math.floor(rect.width / (barWidth + barGap)))

        if (dataIndex >= 0 && dataIndex < data.length) {
            onBarClick(dataIndex, data[dataIndex])
        }
    }

    return (
        <div className={cn('relative', className)} ref={containerRef} style={{ height: heightStyle }} {...props}>
            <canvas className="block h-full w-full" onClick={handleClick} ref={canvasRef} />
        </div>
    )
}

export type ScrollingWaveformProps = Omit<WaveformProps, 'data' | 'onBarClick'> & {
    speed?: number
    barCount?: number
    data?: number[]
}

export const ScrollingWaveform = ({
    speed = 50,
    barCount = 60,
    barWidth = 4,
    barHeight: baseBarHeight = 4,
    barGap = 2,
    barRadius = 2,
    barColor,
    fadeEdges = true,
    fadeWidth = 24,
    height = 128,
    data,
    className,
    ...props
}: ScrollingWaveformProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const barsRef = useRef<Array<{ x: number; height: number }>>([])
    const animationRef = useRef<number>(0)
    const lastTimeRef = useRef<number>(0)
    const seedRef = useRef(Math.random())
    const dataIndexRef = useRef(0)
    const heightStyle = typeof height === 'number' ? `${height}px` : height

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const resizeObserver = new ResizeObserver(() => {
            const rect = container.getBoundingClientRect()
            const dpr = window.devicePixelRatio || 1

            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            canvas.style.width = `${rect.width}px`
            canvas.style.height = `${rect.height}px`

            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.scale(dpr, dpr)
            }

            if (barsRef.current.length === 0) {
                const step = barWidth + barGap
                let currentX = rect.width
                let index = 0
                const seededRandom = (i: number) => {
                    const x = Math.sin(seedRef.current * 10000 + i) * 10000
                    return x - Math.floor(x)
                }
                while (currentX > -step) {
                    barsRef.current.push({
                        x: currentX,
                        height: 0.2 + seededRandom(index++) * 0.6,
                    })
                    currentX -= step
                }
            }
        })

        resizeObserver.observe(container)
        return () => resizeObserver.disconnect()
    }, [barWidth, barGap])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const animate = (currentTime: number) => {
            const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0
            lastTimeRef.current = currentTime

            const rect = canvas.getBoundingClientRect()
            ctx.clearRect(0, 0, rect.width, rect.height)

            const computedBarColor = barColor || getComputedStyle(canvas).getPropertyValue('--foreground') || '#000'

            const step = barWidth + barGap
            for (let i = 0; i < barsRef.current.length; i++) {
                barsRef.current[i].x -= speed * deltaTime
            }

            barsRef.current = barsRef.current.filter((bar) => bar.x + barWidth > -step)

            while (barsRef.current.length === 0 || barsRef.current[barsRef.current.length - 1].x < rect.width) {
                const lastBar = barsRef.current[barsRef.current.length - 1]
                const nextX = lastBar ? lastBar.x + step : rect.width

                let newHeight: number
                if (data && data.length > 0) {
                    newHeight = data[dataIndexRef.current % data.length] || 0.1
                    dataIndexRef.current = (dataIndexRef.current + 1) % data.length
                } else {
                    const time = Date.now() / 1000
                    const uniqueIndex = barsRef.current.length + time * 0.01
                    const seededRandom = (index: number) => {
                        const x = Math.sin(seedRef.current * 10000 + index * 137.5) * 10000
                        return x - Math.floor(x)
                    }
                    const wave1 = Math.sin(uniqueIndex * 0.1) * 0.2
                    const wave2 = Math.cos(uniqueIndex * 0.05) * 0.15
                    const randomComponent = seededRandom(uniqueIndex) * 0.4
                    newHeight = Math.max(0.1, Math.min(0.9, 0.3 + wave1 + wave2 + randomComponent))
                }

                barsRef.current.push({
                    x: nextX,
                    height: newHeight,
                })
                if (barsRef.current.length > barCount * 2) break
            }

            const centerY = rect.height / 2
            for (const bar of barsRef.current) {
                if (bar.x < rect.width && bar.x + barWidth > 0) {
                    const barHeight = Math.max(baseBarHeight, bar.height * rect.height * 0.6)
                    const y = centerY - barHeight / 2

                    ctx.fillStyle = computedBarColor
                    ctx.globalAlpha = 0.3 + bar.height * 0.7

                    if (barRadius > 0) {
                        ctx.beginPath()
                        ctx.roundRect(bar.x, y, barWidth, barHeight, barRadius)
                        ctx.fill()
                    } else {
                        ctx.fillRect(bar.x, y, barWidth, barHeight)
                    }
                }
            }

            if (fadeEdges && fadeWidth > 0) {
                const gradient = ctx.createLinearGradient(0, 0, rect.width, 0)
                const fadePercent = Math.min(0.2, fadeWidth / rect.width)

                gradient.addColorStop(0, 'rgba(255,255,255,1)')
                gradient.addColorStop(fadePercent, 'rgba(255,255,255,0)')
                gradient.addColorStop(1 - fadePercent, 'rgba(255,255,255,0)')
                gradient.addColorStop(1, 'rgba(255,255,255,1)')

                ctx.globalCompositeOperation = 'destination-out'
                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, rect.width, rect.height)
                ctx.globalCompositeOperation = 'source-over'
            }

            ctx.globalAlpha = 1

            animationRef.current = requestAnimationFrame(animate)
        }

        animationRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [speed, barCount, barWidth, baseBarHeight, barGap, barRadius, barColor, fadeEdges, fadeWidth, data])

    return (
        <div className={cn('relative flex items-center', className)} ref={containerRef} style={{ height: heightStyle }} {...props}>
            <canvas className="block h-full w-full" ref={canvasRef} />
        </div>
    )
}

export type AudioScrubberProps = Omit<WaveformProps, 'onBarClick' | 'fadeEdges' | 'fadeWidth' | 'active' | 'shade'> & {
    /** Seconds from the start. */
    currentTime?: number
    /** Length in seconds; zero or less turns seeking off. */
    duration?: number
    /** The time chosen: on a press, when a drag is let go, and on each key. */
    onSeek?: (time: number) => void
    /** The time under the pointer while it drags, and `null` once the drag ends. */
    onScrub?: (time: number | null) => void
    /** A round handle at the playhead, shown while the scrubber is hovered, focused or dragged. */
    showHandle?: boolean
    /** How far one arrow key moves the time, and how far Page Up, Page Down and a shifted arrow move it, in seconds. */
    step?: number
    largeStep?: number
    /** The scrubber's accessible name. */
    label?: string
    /** What a screen reader says for a time. */
    valueText?: (time: number) => string
    /** The played bars' color as a CSS color, the accent by default. The rest take `barColor`, or the element's own text color. */
    playedColor?: string
    /** Whether a quieter bar is drawn fainter as well as shorter; off, so the played part reads as one fill. */
    shade?: boolean
}

/** The levels drawn while a recording's own are not known: an even row, so no shape is made up. */
const FLAT_LEVELS: readonly number[] = Array.from({ length: 64 }, () => 0.3)

/**
 * A scrubber drawn as a recording's waveform: the bars already played are filled in the accent and
 * the rest stay quiet. A press or a drag picks a time; the arrow keys step by `step`, Page Up and
 * Page Down (or a shifted arrow) by `largeStep`, and Home and End go to either end.
 *
 * While the pointer drags, the scrubber draws the dragged time and reports it through `onScrub`;
 * `onSeek` is called once, when the drag is let go, so a playing source is not asked to seek on
 * every move. A key is reported through `onSeek` at once.
 */
export const AudioScrubber = ({
    data = [],
    currentTime = 0,
    duration = 100,
    onSeek,
    onScrub,
    showHandle = true,
    step = 5,
    largeStep = 30,
    label = 'Seek',
    valueText,
    barWidth = 3,
    barHeight,
    barGap = 1,
    barRadius = 1,
    barColor,
    playedColor,
    shade = false,
    height = 128,
    className,
    style,
    ...props
}: AudioScrubberProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const dragging = useRef(false)
    const [dragged, setDragged] = useState<number | null>(null)

    const levels = data.length > 0 ? data : FLAT_LEVELS
    const seekable = duration > 0
    const clamp = (time: number) => Math.min(Math.max(0, duration), Math.max(0, Number.isFinite(time) ? time : 0))
    const time = clamp(dragged ?? currentTime)
    const played = seekable ? (time / duration) * 100 : 0
    const heightStyle = typeof height === 'number' ? `${height}px` : height

    const timeAt = (clientX: number) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect || rect.width === 0) return 0
        return (Math.max(0, Math.min(clientX - rect.left, rect.width)) / rect.width) * duration
    }
    const drag = (next: number | null) => {
        dragging.current = next !== null
        setDragged(next)
        onScrub?.(next)
    }
    const bars = { barWidth, barHeight, barGap, barRadius, shade, fadeEdges: false, height: '100%' }

    return (
        <div
            {...props}
            ref={containerRef}
            role="slider"
            aria-label={label}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, duration)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={valueText?.(time)}
            aria-disabled={!seekable || undefined}
            tabIndex={seekable ? 0 : -1}
            data-slot="audio-scrubber"
            data-dragging={dragged !== null || undefined}
            className={cn(
                'group/scrubber relative cursor-pointer touch-none rounded-mini text-faint/50 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default',
                className,
            )}
            style={{ ...style, height: heightStyle }}
            onPointerDown={(event) => {
                if (!seekable || event.button !== 0) return
                event.preventDefault()
                event.currentTarget.setPointerCapture(event.pointerId)
                event.currentTarget.focus()
                drag(timeAt(event.clientX))
            }}
            onPointerMove={(event) => {
                if (dragging.current) drag(timeAt(event.clientX))
            }}
            onPointerUp={(event) => {
                if (!dragging.current) return
                const chosen = timeAt(event.clientX)
                drag(null)
                onSeek?.(chosen)
            }}
            onPointerCancel={() => {
                if (dragging.current) drag(null)
            }}
            onKeyDown={(event) => {
                if (!seekable) return
                const by = event.shiftKey ? largeStep : step
                const moves: Record<string, number> = {
                    ArrowRight: time + by,
                    ArrowUp: time + by,
                    ArrowLeft: time - by,
                    ArrowDown: time - by,
                    PageUp: time + largeStep,
                    PageDown: time - largeStep,
                    Home: 0,
                    End: duration,
                }
                const next = moves[event.key]
                if (next === undefined) return
                event.preventDefault()
                onSeek?.(clamp(next))
            }}
        >
            <Waveform data={levels} barColor={barColor} {...bars} />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 text-primary"
                style={{ clipPath: `inset(0 ${String(100 - played)}% 0 0)` }}
            >
                <Waveform data={levels} barColor={playedColor} {...bars} />
            </div>
            {showHandle && seekable && (
                <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background opacity-0 transition-opacity group-hover/scrubber:opacity-100 group-focus-visible/scrubber:opacity-100 group-data-dragging/scrubber:opacity-100"
                    style={{ left: `${String(played)}%` }}
                />
            )}
        </div>
    )
}

export type StaticWaveformProps = WaveformProps & {
    bars?: number
    seed?: number
}

export const StaticWaveform = ({ bars = 40, seed = 42, ...props }: StaticWaveformProps) => {
    const data = useMemo(() => {
        const random = (seedValue: number) => {
            const x = Math.sin(seedValue) * 10000
            return x - Math.floor(x)
        }

        return Array.from({ length: bars }, (_, i) => 0.2 + random(seed + i) * 0.6)
    }, [bars, seed])

    return <Waveform data={data} {...props} />
}
