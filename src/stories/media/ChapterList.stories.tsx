import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { ChapterList, chapterStarts, type MediaChapter } from '@winterop-com/sokkel-ui-media/ChapterList'
import { chapterIndex } from '@winterop-com/sokkel-ui-media/chapters'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { fileAt, timelineDuration } from '@winterop-com/sokkel-ui-media/timeline'

/** A short book in one file: its chapters and where each starts. */
const ALMANAC: MediaChapter[] = [
    { title: 'Low Water', start: 0 },
    { title: 'The Harbor Wall', start: 2_140 },
    { title: 'Juniper Point', start: 4_310 },
    { title: 'Larkspur Fields', start: 7_020 },
    { title: 'Northern Coast', start: 9_480 },
    { title: 'The Long Bay', start: 12_600 },
    { title: 'Spring Tide', start: 15_900 },
    { title: 'High Water', start: 19_200 },
]
const ALMANAC_LENGTH = 22_320

const PLACES = ['Harbor', 'Juniper', 'Larkspur', 'Coast', 'Valley', 'Ridge', 'Bay', 'Island']
const TIMES = ['Morning', 'Evening', 'Winter', 'Spring']

/** A long book in four files of about two hours each. */
const PARTS = [7_412, 6_980, 7_655, 7_203]
const LENGTH = timelineDuration(PARTS)

/** Thirty chapters across the whole, their starts not lined up with the files, so several run from one file into the next. */
const CHAPTERS: MediaChapter[] = Array.from({ length: 30 }, (_, index) => ({
    title: `${TIMES[index % TIMES.length]} at ${PLACES[(index * 3) % PLACES.length]}`,
    start: index === 0 ? 0 : Math.round((LENGTH / 30) * index + ((index * 37) % 120)),
}))
const STARTS = chapterStarts(CHAPTERS)

const COVER: ArtworkCover = { motif: 'bands', from: 'teal', to: 'jade' }

const meta: Meta = { title: 'Media/Chapter list' }
export default meta

/** A short book's chapters 12:34 into the third, playing: each start under its title, the length at the end, and the time left in the one playing. */
export const Chapters: StoryObj = {
    render: function Render() {
        const [position, setPosition] = useState(4_310 + 754)
        return (
            <Stack className="min-h-svh bg-background p-4 text-foreground sm:p-8">
                <ChapterList
                    chapters={ALMANAC}
                    duration={ALMANAC_LENGTH}
                    position={position}
                    playing
                    progress="left"
                    onSeek={setPosition}
                />
            </Stack>
        )
    },
}

/**
 * A book over four files, played as one timeline, 25 minutes into its twenty-second chapter: the
 * chapter list in a pane that scrolls, the chapter playing brought to its middle on the first draw
 * with a line along its foot, and the bar stepping and measuring by chapter. The head says which
 * file plays and how far into it, mapped from the whole with `fileAt`.
 */
export const AcrossFiles: StoryObj = {
    name: 'Across files',
    render: function Render() {
        const [playing, setPlaying] = useState(true)
        const [position, setPosition] = useState(STARTS[21] + 1_500)
        const [rate, setRate] = useState(1.25)
        const [volume, setVolume] = useState(0.8)
        const place = fileAt(PARTS, position)
        const chapter = CHAPTERS[Math.max(0, chapterIndex(STARTS, position))]
        const seek = (seconds: number) => setPosition(Math.min(LENGTH, Math.max(0, seconds)))
        return (
            <Stack gap="none" className="h-svh bg-background text-foreground">
                <PaneHeader
                    title="Tidewater Almanac"
                    meta={`${String(CHAPTERS.length)} chapters`}
                    description={`Part ${String(place.file + 1)} of ${String(PARTS.length)}, ${formatTime(place.offset)} in`}
                />
                <Fill scroll className="p-2">
                    <ChapterList
                        chapters={CHAPTERS}
                        duration={LENGTH}
                        position={position}
                        playing={playing}
                        progress="bar"
                        onSeek={seek}
                        variant="plain"
                    />
                </Fill>
                <MediaBar
                    title={chapter.title}
                    artist="Grace"
                    album="Tidewater Almanac"
                    artwork={<Artwork cover={COVER} />}
                    playing={playing}
                    onPlayingChange={setPlaying}
                    position={position}
                    duration={LENGTH}
                    onSeek={seek}
                    chapters={STARTS}
                    timeline="chapter"
                    skip={15}
                    rate={rate}
                    onRateChange={setRate}
                    volume={volume}
                    onVolumeChange={setVolume}
                />
            </Stack>
        )
    },
}
