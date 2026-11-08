import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PlayButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { SoundVisualizer, type SoundKind } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Section, Surface } from '@winterop-com/sokkel-ui/Section'
import { Segmented, type Segment } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Artwork } from '../fixtures/Artwork'
import { FRAME } from './fixtures/sound'
import { tuneUrl } from './fixtures/tune'

/**
 * A live picture of what is playing, read from a media element or a microphone's stream through
 * Web Audio: a spectrum, an area, a wave or a ring. The still stories draw a frame of levels and
 * samples without any audio; Live plays a tune made in the page.
 */
const meta: Meta = { title: 'Media/Sound visualizer' }
export default meta

const KINDS: readonly Segment<SoundKind>[] = [
    { value: 'spectrum', label: 'Spectrum' },
    { value: 'area', label: 'Area' },
    { value: 'wave', label: 'Wave' },
    { value: 'ring', label: 'Ring' },
]

/** The whole canvas, with a surface the drawing fills. */
function Ground({ children }: { children: ReactNode }) {
    return (
        <Stack className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Surface className="min-h-0 flex-1">{children}</Surface>
        </Stack>
    )
}

/** Each kind with nothing playing: a row of ticks, a floor, a flat line and a circle. */
export const AtRest: StoryObj = {
    name: 'At rest',
    parameters: { frame: 'padded' },
    render: () => (
        <Columns count={2} min="sm">
            {KINDS.map((kind) => (
                <Section key={kind.value} title={kind.label} flush>
                    <div className="h-40">
                        <SoundVisualizer kind={kind.value} />
                    </div>
                </Section>
            ))}
        </Columns>
    ),
}

/** A moment of music as bars standing on the floor, as many as the width holds, louder bands drawn stronger. */
export const Spectrum: StoryObj = {
    render: () => (
        <Ground>
            <SoundVisualizer kind="spectrum" frame={FRAME} />
        </Ground>
    ),
}

/** The same bars standing about the middle line. */
export const Centered: StoryObj = {
    render: () => (
        <Ground>
            <SoundVisualizer kind="spectrum" align="center" frame={FRAME} />
        </Ground>
    ),
}

/** The bars' tops joined into one curve and filled beneath. */
export const Area: StoryObj = {
    render: () => (
        <Ground>
            <SoundVisualizer kind="area" frame={FRAME} />
        </Ground>
    ),
}

/** The waveform itself, traced as an oscilloscope shows a held note. */
export const Wave: StoryObj = {
    render: () => (
        <Ground>
            <SoundVisualizer kind="wave" frame={FRAME} />
        </Ground>
    ),
}

/** The bands standing out from a circle, mirrored down both sides, with the album's cover in the middle. */
export const Ring: StoryObj = {
    render: () => (
        <Ground>
            <SoundVisualizer kind="ring" frame={FRAME} middle={<Artwork cover={{ motif: 'wave', from: 'violet', to: 'pink' }} />} />
        </Ground>
    ),
}

/** Drawn faint behind what is playing, as a large player shows it behind its title. */
export const Backdrop: StoryObj = {
    render: () => (
        <Ground>
            <SoundVisualizer kind="spectrum" frame={FRAME} backdrop>
                <Stack justify="end" gap="xs" className="size-full p-6">
                    <MetaLine items={['Track 3 of 9', 'Juniper', '2025']} />
                    <h2 className="text-page font-semibold">Harbor at Dusk</h2>
                    <p className="text-muted-foreground">Grace</p>
                </Stack>
            </SoundVisualizer>
        </Ground>
    ),
}

/** A tune made in the page, played through an audio element the visualizer listens to. Still until played. */
function LiveTune() {
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
    const [playing, setPlaying] = useState(false)
    const [kind, setKind] = useState<SoundKind>('spectrum')
    const toggle = () => {
        if (audio === null) return
        if (!audio.paused) {
            audio.pause()
            return
        }
        if (audio.getAttribute('src') === null) audio.src = tuneUrl()
        void audio.play()
    }
    return (
        <Stack gap="md" className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Toolbar end={<Segmented label="Kind" value={kind} options={KINDS} onValueChange={setKind} />}>
                <PlayButton playing={playing} onToggle={toggle} words={{ play: 'Play', pause: 'Pause' }} />
                <MetaLine items={['A tune made in the page', '0:08, looping']} />
            </Toolbar>
            <Surface className="min-h-0 flex-1">
                <SoundVisualizer source={audio} kind={kind} />
            </Surface>
            <audio ref={setAudio} loop onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        </Stack>
    )
}

export const Live: StoryObj = { render: () => <LiveTune /> }
