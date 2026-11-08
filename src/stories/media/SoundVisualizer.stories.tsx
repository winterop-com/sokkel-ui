import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState, type ReactNode } from 'react'

import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { THEMES } from '@winterop-com/sokkel-ui/lib/appearance'
import { PlayButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { SOUND_RAMPS } from '@winterop-com/sokkel-ui/media/sound'
import {
    SoundVisualizer,
    type SoundEffect,
    type SoundKind,
    type SoundRamp,
    type SoundRampName,
} from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Section, Surface } from '@winterop-com/sokkel-ui/Section'
import { Segmented, type Segment } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Toggle } from '@winterop-com/sokkel-ui/primitives/toggle'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { FALLING, FRAME } from './fixtures/sound'
import { tuneUrl } from './fixtures/tune'

/**
 * A live picture of what is playing, read from a media element or a microphone's stream through
 * Web Audio: a spectrum, an area, a wave or a ring, in one color or along a ramp, mirrored, glowing
 * or leaving trails. The still stories draw a frame of levels and samples without any audio; Live
 * plays a tune made in the page.
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

const RAMPS: readonly { title: string; ramp: SoundRamp }[] = [
    ...(Object.keys(SOUND_RAMPS) as SoundRampName[]).map((name) => ({ title: name, ramp: name })),
    { title: "['warning', 'primary', 'critical']", ramp: ['warning', 'primary', 'critical'] },
]

/**
 * The named ramps, each made of the theme's tokens, and stops given by hand: amber through the
 * theme's primary to red. Colored by height, so a tall bar runs through the whole ramp on its way up.
 */
export const Ramps: StoryObj = {
    parameters: { frame: 'padded' },
    render: () => (
        <Columns count={2} min="sm">
            {RAMPS.map((entry) => (
                <Section key={entry.title} title={entry.title} flush>
                    <div className="h-40">
                        <SoundVisualizer frame={FRAME} ramp={entry.ramp} />
                    </div>
                </Section>
            ))}
        </Columns>
    ),
}

/** Each bar, and each spoke of a ring, in the one color of the ramp its level reaches. */
export const ByLevel: StoryObj = {
    name: 'By level',
    render: () => (
        <Stack gap="md" className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Surface className="min-h-0 flex-1">
                <SoundVisualizer frame={FRAME} ramp="heat" rampBy="level" />
            </Surface>
            <Surface className="min-h-0 flex-1">
                <SoundVisualizer kind="ring" frame={FRAME} ramp="heat" rampBy="level" />
            </Surface>
        </Stack>
    ),
}

/** The named ramps in every theme, each tile scoped to its theme with `data-theme-scope`, in the scheme the toolbar sets. */
export const EveryTheme: StoryObj = {
    name: 'Every theme',
    parameters: { frame: 'padded' },
    render: () => (
        <Columns min="sm" gap="lg">
            {THEMES.map((theme) => (
                <Stack
                    key={theme.value}
                    gap="sm"
                    data-theme-scope={theme.value}
                    className="rounded-surface bg-background p-3 text-foreground"
                >
                    <span className="text-head">{theme.label}</span>
                    {(Object.keys(SOUND_RAMPS) as SoundRampName[]).map((name) => (
                        <div key={name} className="h-16">
                            <SoundVisualizer frame={FRAME} ramp={name} label={name} />
                        </div>
                    ))}
                </Stack>
            ))}
        </Columns>
    ),
}

/** The bars over their reflection, which fades toward the foot; an area mirrors the same way. */
export const Mirror: StoryObj = {
    render: () => (
        <Stack gap="md" className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Surface className="min-h-0 flex-1">
                <SoundVisualizer frame={FRAME} ramp="cool" mirror />
            </Surface>
            <Surface className="min-h-0 flex-1">
                <SoundVisualizer kind="area" frame={FRAME} ramp="cool" mirror />
            </Surface>
        </Stack>
    ),
}

/** What is lit blooming in its own colors along the ramp. Off while motion is reduced. */
export const Glow: StoryObj = {
    render: () => (
        <Ground>
            <SoundVisualizer frame={FRAME} ramp="heat" effect="glow" />
        </Ground>
    ),
}

/** Steps through a hit falling away once, one frame at a time, and holds the last. */
function FallingHit({ kind }: { kind: SoundKind }) {
    const [step, setStep] = useState(0)
    useEffect(() => {
        if (step >= FALLING.length - 1) return
        const request = requestAnimationFrame(() => setStep(step + 1))
        return () => cancelAnimationFrame(request)
    }, [step])
    return <SoundVisualizer kind={kind} frame={FALLING[step]} ramp="lagoon" effect="trails" />
}

/**
 * A hit falling away, frame by frame as an app passes levels it holds, each frame leaving a fading
 * afterimage above the next: the bars, and a wave's trace shrinking. It plays once and holds the
 * last frame. Off while motion is reduced.
 */
export const Trails: StoryObj = {
    render: () => (
        <Stack gap="md" className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Surface className="min-h-0 flex-1">
                <FallingHit kind="spectrum" />
            </Surface>
            <Surface className="min-h-0 flex-1">
                <FallingHit kind="wave" />
            </Surface>
        </Stack>
    ),
}

/** A tune made in the page, played through an audio element; it is made on the first play. */
function useTune() {
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
    const [playing, setPlaying] = useState(false)
    const toggle = () => {
        if (audio === null) return
        if (!audio.paused) {
            audio.pause()
            return
        }
        if (audio.getAttribute('src') === null) audio.src = tuneUrl()
        void audio.play()
    }
    const element = <audio ref={setAudio} loop onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    return { audio, playing, toggle, element }
}

/** A tune made in the page, played through an audio element the visualizer listens to. Still until played; the ring holds the cover in its middle. */
function LiveTune() {
    const tune = useTune()
    const [kind, setKind] = useState<SoundKind>('spectrum')
    const [ramp, setRamp] = useState<RampChoice>('color')
    const [effect, setEffect] = useState<SoundEffect>('none')
    const [mirror, setMirror] = useState(false)
    return (
        <Stack gap="md" className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Toolbar
                end={
                    <>
                        <Segmented label="Kind" value={kind} options={KINDS} onValueChange={setKind} />
                        <Segmented label="Colors" value={ramp} options={RAMP_CHOICES} onValueChange={setRamp} />
                        <Segmented label="Effect" value={effect} options={EFFECTS} onValueChange={setEffect} />
                        <Toggle variant="outline" size="sm" pressed={mirror} onPressedChange={setMirror}>
                            Mirror
                        </Toggle>
                    </>
                }
            >
                <PlayButton playing={tune.playing} onToggle={tune.toggle} words={{ play: 'Play', pause: 'Pause' }} />
                <MetaLine items={['A tune made in the page', '0:08, looping']} />
            </Toolbar>
            <Surface className="min-h-0 flex-1">
                <SoundVisualizer
                    source={tune.audio}
                    kind={kind}
                    ramp={ramp === 'color' ? undefined : ramp}
                    effect={effect}
                    mirror={mirror}
                    middle={kind === 'ring' ? <Artwork cover={{ motif: 'wave', from: 'violet', to: 'pink' }} /> : undefined}
                />
            </Surface>
            {tune.element}
        </Stack>
    )
}

type RampChoice = 'color' | SoundRampName

const RAMP_CHOICES: readonly Segment<RampChoice>[] = [
    { value: 'color', label: 'Plain' },
    { value: 'heat', label: 'Heat' },
    { value: 'cool', label: 'Cool' },
    { value: 'lagoon', label: 'Lagoon' },
    { value: 'ink', label: 'Ink' },
]

const EFFECTS: readonly Segment<SoundEffect>[] = [
    { value: 'none', label: 'None' },
    { value: 'glow', label: 'Glow' },
    { value: 'trails', label: 'Trails' },
]

/** The tune with its kind, colors, effect and mirror picked while it plays. Glow and trails are off while motion is reduced. */
export const Live: StoryObj = { render: () => <LiveTune /> }

const DELAYS: readonly Segment<string>[] = [
    { value: '0', label: 'None' },
    { value: '150', label: '150 ms' },
    { value: '300', label: '300 ms' },
    { value: '500', label: '500 ms' },
    { value: 'auto', label: 'Auto' },
]

function DelayedTune() {
    const tune = useTune()
    const [delay, setDelay] = useState('300')
    return (
        <Stack gap="md" className="h-svh bg-background p-4 text-foreground sm:p-6">
            <Toolbar end={<Segmented label="Delay" value={delay} options={DELAYS} onValueChange={setDelay} />}>
                <PlayButton playing={tune.playing} onToggle={tune.toggle} words={{ play: 'Play', pause: 'Pause' }} />
                <MetaLine items={['A tune made in the page', 'Held back']} />
            </Toolbar>
            <Surface className="min-h-0 flex-1">
                <SoundVisualizer source={tune.audio} delay={delay === 'auto' ? 'auto' : Number(delay)} />
            </Surface>
            {tune.element}
        </Stack>
    )
}

/**
 * The tune with its picture held back behind the sound, as an output's latency needs: by the
 * milliseconds picked, or by what the browser reports for the audio context with Auto. On wired
 * speakers a delay shows the bars trailing the sound; on a Bluetooth output (150 to 500 ms behind)
 * the right one brings them in step with what is heard.
 */
export const Delayed: StoryObj = { render: () => <DelayedTune /> }
