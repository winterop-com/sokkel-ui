import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Mic, Pause } from 'lucide-react'
import { useState } from 'react'

import { BarVisualizer } from '@winterop-com/sokkel-ui/primitives/bar-visualizer'
import { AudioScrubber, StaticWaveform, Waveform } from '@winterop-com/sokkel-ui/primitives/waveform'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/**
 * Audio shown as bars: a recording's waveform, a scrubber over a voice note, and the level bars a
 * voice input draws while it listens. The live and microphone variants need a media stream and are
 * not drawn here.
 */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="xl" className="mx-auto max-w-3xl">
            {children}
        </Stack>
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
            <Row gap="md" className="rounded-surface border border-border-strong bg-card p-3">
                <IconButton label="Pause" variant="secondary">
                    <Pause aria-hidden />
                </IconButton>
                <AudioScrubber data={LEVELS} currentTime={time} duration={42} onSeek={setTime} height={36} className="min-w-0 flex-1" />
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    0:{String(Math.round(time)).padStart(2, '0')} / 0:42
                </span>
            </Row>
        </Ground>
    )
}

function Listening() {
    return (
        <Ground>
            <Row gap="md" className="rounded-surface border border-border-strong bg-card p-3">
                <Mic className="size-4 text-destructive" aria-hidden />
                <BarVisualizer barCount={32} minHeight={12} centerAlign className="h-10 flex-1 bg-transparent p-0" />
                <span className="text-sm text-muted-foreground">Listening</span>
            </Row>
        </Ground>
    )
}

const meta: Meta = { title: 'Primitives/Media/Audio', parameters: { frame: 'padded' } }
export default meta

export const Waveforms_: StoryObj = { name: 'Waveforms', render: () => <Waveforms /> }
export const Scrubber: StoryObj = { name: 'Voice note', render: () => <VoiceNote /> }
export const Bars: StoryObj = { name: 'Listening', render: () => <Listening /> }
