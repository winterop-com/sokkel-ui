import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

import { Columns, Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { SoundVisualizer } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { ChapterList, chapterStarts } from '@winterop-com/sokkel-ui-media/ChapterList'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { Transcript } from '@winterop-com/sokkel-ui-media/Transcript'
import { FRAME } from './fixtures/sound'
import { EPISODE, EPISODE_CHAPTERS, EPISODE_TRANSCRIPT } from './fixtures/transcript'
import { waveformOf } from './fixtures/waveform'

const COVER: ArtworkCover = { motif: 'wave', from: 'blue', to: 'teal' }

const STARTS = chapterStarts(EPISODE_CHAPTERS)

/**
 * An episode paused at `start` seconds: its transcript filling the screen over the player bar,
 * beside its chapters with `chapters`, or in the bar's fullscreen view with `fullscreen`. Seeking
 * in the bar, pressing a chapter or pressing a line moves them all.
 */
function Episode({ start, chapters = false, fullscreen = false }: { start: number; chapters?: boolean; fullscreen?: boolean }) {
    const [playing, setPlaying] = useState(false)
    const [position, setPosition] = useState(start)
    const [rate, setRate] = useState(1)
    const [volume, setVolume] = useState(0.7)
    const waveform = useMemo(() => waveformOf(5), [])
    const transcript = <Transcript lines={EPISODE_TRANSCRIPT} position={position} onSeek={setPosition} />
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <Fill>
                {fullscreen ? null : chapters ? (
                    <Columns count={2} min="lg" gap="none" className="h-full">
                        <Fill scroll className="p-4">
                            <ChapterList
                                chapters={EPISODE_CHAPTERS}
                                duration={EPISODE.duration}
                                position={position}
                                progress="left"
                                onSeek={setPosition}
                            />
                        </Fill>
                        {transcript}
                    </Columns>
                ) : (
                    transcript
                )}
            </Fill>
            <MediaBar
                title={EPISODE.title}
                artist={EPISODE.hosts}
                album={EPISODE.show}
                artwork={<Artwork cover={COVER} />}
                playing={playing}
                onPlayingChange={setPlaying}
                position={position}
                duration={EPISODE.duration}
                onSeek={setPosition}
                chapters={STARTS}
                skip={{ back: 15, forward: 30 }}
                rate={rate}
                onRateChange={setRate}
                waveform={waveform}
                volume={volume}
                onVolumeChange={setVolume}
                visualizer={fullscreen ? <SoundVisualizer frame={FRAME} label="What is playing" /> : undefined}
                lyrics={fullscreen ? transcript : undefined}
                defaultFullscreen={fullscreen}
                defaultLyricsShown={fullscreen}
                words={{ lyrics: 'Transcript' }}
            />
        </Stack>
    )
}

const meta: Meta = { title: 'Media/Transcript' }
export default meta

/**
 * An episode's transcript over the player bar, 1:36 in: the line being said inked and kept in the
 * middle, the rest quiet, each under its time and the speaker written where the voice changes.
 * Pressing a line, or seeking in the bar, moves the transcript to it. The bar skips back 15
 * seconds and forward 30, as a podcast player does, each button with its own number.
 */
export const Following: StoryObj = { render: () => <Episode start={96} /> }

/** The transcript beside the episode's chapters, the chapter and the line playing marked in both. */
export const Chapters: StoryObj = { render: () => <Episode start={150} chapters /> }

/** The transcript in the player's fullscreen view, shown by the corner button in the visualizer's place. */
export const Fullscreen: StoryObj = { render: () => <Episode start={96} fullscreen /> }
