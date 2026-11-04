import type { Meta, StoryObj } from '@storybook/react-vite'
import { Mic, Pause } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../../components/ui/button'
import { BarVisualizer } from '../../components/ui/bar-visualizer'
import { AudioScrubber, StaticWaveform, Waveform } from '../../components/ui/waveform'

/**
 * Audio shown as bars: a recording's waveform, a scrubber over a voice note, and the level bars a
 * voice input draws while it listens. The live and microphone variants need a media stream and are
 * not drawn here.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-3xl flex-col gap-6">{children}</div>
        </div>
    )
}

const LEVELS = Array.from({ length: 96 }, (_, index) => 0.2 + 0.7 * Math.abs(Math.sin(index / 5) * Math.cos(index / 13)))

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

function Waveforms() {
    return (
        <Ground>
            <Caption>waveform from levels</Caption>
            <Waveform data={LEVELS} height={56} barWidth={3} barGap={2} />
            <Caption>static, seeded</Caption>
            <StaticWaveform bars={64} seed={7} height={40} />
        </Ground>
    )
}

function VoiceNote() {
    const [time, setTime] = useState(14)
    return (
        <Ground>
            <div className="flex items-center gap-3 rounded-surface border border-border-strong bg-card p-3">
                <Button size="icon-sm" variant="secondary" aria-label="Pause">
                    <Pause aria-hidden />
                </Button>
                <AudioScrubber data={LEVELS} currentTime={time} duration={42} onSeek={setTime} height={36} className="min-w-0 flex-1" />
                <span className="font-mono text-xs text-muted-foreground tabular-nums">0:{String(time).padStart(2, '0')} / 0:42</span>
            </div>
        </Ground>
    )
}

function Listening() {
    return (
        <Ground>
            <div className="flex items-center gap-3 rounded-surface border border-border-strong bg-card p-3">
                <Mic className="size-4 text-destructive" aria-hidden />
                <BarVisualizer barCount={32} minHeight={12} centerAlign className="h-10 flex-1 bg-transparent p-0" />
                <span className="text-sm text-muted-foreground">Listening</span>
            </div>
        </Ground>
    )
}

const meta: Meta = { title: 'Primitives/Media/Audio' }
export default meta

export const Waveforms_: StoryObj = { name: 'Waveforms', render: () => <Waveforms /> }
export const Scrubber: StoryObj = { name: 'Voice note', render: () => <VoiceNote /> }
export const Bars: StoryObj = { name: 'Listening', render: () => <Listening /> }
