import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Fill, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { chapterStarts } from '@winterop-com/sokkel-ui-media/ChapterList'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { SleepTimerMenu, useSleepTimer, type SleepTimer } from '@winterop-com/sokkel-ui-media/SleepTimer'
import { Transcript } from '@winterop-com/sokkel-ui-media/Transcript'
import { EPISODE, EPISODE_CHAPTERS, EPISODE_TRANSCRIPT } from './fixtures/transcript'

const COVER: ArtworkCover = { motif: 'wave', from: 'blue', to: 'teal' }

const STARTS = chapterStarts(EPISODE_CHAPTERS)

/**
 * An episode in the player bar with the sleep timer at the bar's end, paused 1:36 in. Without
 * `shown`, `useSleepTimer` keeps the timer the menu sets: minutes count down while it plays, and
 * running out pauses it. With `shown`, the menu draws that timer still, as `remaining` seconds left.
 */
function Player({ shown, remaining }: { shown?: SleepTimer; remaining?: number }) {
    const [playing, setPlaying] = useState(false)
    const [position, setPosition] = useState(96)
    const [volume, setVolume] = useState(0.7)
    const sleep = useSleepTimer({ playing, position, chapters: STARTS, onSleep: () => setPlaying(false) })
    return (
        <Stack gap="none" className="h-svh bg-background text-foreground">
            <Fill>
                <Transcript lines={EPISODE_TRANSCRIPT} position={position} onSeek={setPosition} />
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
                skip={15}
                volume={volume}
                onVolumeChange={setVolume}
                extra={
                    shown === undefined ? (
                        <SleepTimerMenu timer={sleep.timer} remaining={sleep.remaining} onTimerChange={sleep.set} chapters />
                    ) : (
                        <SleepTimerMenu timer={shown} remaining={remaining} onTimerChange={() => undefined} chapters />
                    )
                }
            />
        </Stack>
    )
}

const meta: Meta = { title: 'Media/Sleep timer' }
export default meta

/** No timer: the moon at the bar's end, quiet, its menu offering minutes, the end of the chapter and the end of the episode. */
export const Off: StoryObj = { render: () => <Player /> }

/** A timer of fifteen minutes with 12:34 left, the moon in the accent and the time beside it. */
export const Counting: StoryObj = { render: () => <Player shown={15} remaining={754} /> }

/** A timer to the end of the chapter playing, the moon in the accent alone. */
export const Chapter: StoryObj = { render: () => <Player shown="chapter" /> }
