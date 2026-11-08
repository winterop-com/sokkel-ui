import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { SoundVisualizer } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { Lyrics } from '@winterop-com/sokkel-ui-media/Lyrics'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { TIMED, UNTIMED } from './fixtures/lyrics'
import { FRAME } from './fixtures/sound'
import { waveformOf } from './fixtures/waveform'

interface Song {
    title: string
    artist: string
    album: string
    duration: number
    cover: ArtworkCover
    words: string
}

const LOW_TIDE: Song = {
    title: 'Low Tide',
    artist: 'Ada',
    album: 'Larkspur',
    duration: 192,
    cover: { motif: 'wave', from: 'blue', to: 'teal' },
    words: TIMED,
}

const NORTHERN_COAST: Song = {
    title: 'Northern Coast',
    artist: 'Grace',
    album: 'Juniper',
    duration: 236,
    cover: { motif: 'sun', from: 'violet', to: 'pink' },
    words: UNTIMED,
}

/**
 * A song playing paused at `start` seconds: its lyrics filling the screen over the player bar, or
 * in the bar's fullscreen view with `fullscreen`. Seeking in the bar or pressing a line moves both.
 */
function Song({ song, start, fullscreen = false }: { song: Song; start: number; fullscreen?: boolean }) {
    const [playing, setPlaying] = useState(false)
    const [position, setPosition] = useState(start)
    const [volume, setVolume] = useState(0.7)
    const waveform = useMemo(() => waveformOf(3), [])
    const lyrics = <Lyrics lyrics={song.words} position={position} onSeek={setPosition} />
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <Fill>{!fullscreen && lyrics}</Fill>
            <MediaBar
                title={song.title}
                artist={song.artist}
                album={song.album}
                artwork={<Artwork cover={song.cover} />}
                playing={playing}
                onPlayingChange={setPlaying}
                position={position}
                duration={song.duration}
                onSeek={setPosition}
                waveform={waveform}
                volume={volume}
                onVolumeChange={setVolume}
                visualizer={fullscreen ? <SoundVisualizer frame={FRAME} label="What is playing" /> : undefined}
                lyrics={fullscreen ? lyrics : undefined}
                defaultFullscreen={fullscreen}
                defaultLyricsShown={fullscreen}
            />
        </Stack>
    )
}

const meta: Meta = { title: 'Media/Lyrics' }
export default meta

/**
 * A song's timed lyrics over the player bar, 1:41 in: the line being sung inked in the middle and
 * the rest faint, its chorus sung three times from one LRC line with three stamps. Pressing a
 * line, or seeking in the bar, moves the lyrics to it.
 */
export const Timed: StoryObj = { render: () => <Song song={LOW_TIDE} start={101} /> }

/** A song's lyrics with no times, read as a page from the top in verses, following nothing. */
export const Untimed: StoryObj = { render: () => <Song song={NORTHERN_COAST} start={40} /> }

/**
 * The timed lyrics in the player's fullscreen view, shown by the lyrics button in its corner in the
 * visualizer's place, between what plays and the waveform.
 */
export const Fullscreen: StoryObj = { render: () => <Song song={LOW_TIDE} start={101} fullscreen /> }
