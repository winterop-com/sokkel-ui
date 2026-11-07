'use client'

import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn'
import { SoundVisualizer, type SoundSource } from '../media/SoundVisualizer'
import { VOICE_RANGE } from '../media/sound'

/** Where a voice exchange stands: the bars listen while someone speaks or is heard, and rest otherwise. */
export type AgentState = 'connecting' | 'initializing' | 'listening' | 'speaking' | 'thinking'

export interface BarVisualizerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Voice assistant state: connecting, initializing and thinking hold the bars at rest in the quiet ink. */
    state?: AgentState
    /** Number of bars to display. */
    barCount?: number
    /** What to listen to: a live stream such as a microphone's, or a media element that plays. */
    source?: SoundSource | null
    /** The least and most a bar stands, as a percentage of the height. */
    minHeight?: number
    maxHeight?: number
    /** Stand the bars about the middle instead of on the floor. */
    centerAlign?: boolean
    /** What the bars are called, for a screen reader. */
    label?: string
}

/** The widest a voice bar is drawn; a row of them is centered in a wider box. */
const VOICE_BAR = 12

const RESTING: readonly (AgentState | undefined)[] = ['connecting', 'initializing', 'thinking']

/**
 * The level bars a voice input draws while it listens, in a muted well by default. Drawn by
 * `SoundVisualizer` as a spectrum over a voice's frequencies, so a microphone and a playing element
 * are read the same way.
 */
export function BarVisualizer({
    state,
    barCount = 15,
    source = null,
    minHeight = 20,
    maxHeight = 100,
    centerAlign = false,
    label = 'Voice level',
    className,
    ...props
}: BarVisualizerProps) {
    const resting = RESTING.includes(state)
    return (
        <div {...props} data-state={state} className={cn('h-32 w-full overflow-hidden rounded-lg bg-muted p-4', className)}>
            <SoundVisualizer
                source={resting ? null : source}
                kind="spectrum"
                align={centerAlign ? 'center' : 'bottom'}
                bands={barCount}
                range={VOICE_RANGE}
                floor={minHeight / 100}
                ceiling={maxHeight / 100}
                barWidth={VOICE_BAR}
                label={label}
                color={resting ? 'muted-foreground' : 'primary'}
            />
        </div>
    )
}
