/** The player along the foot of the window: what plays, its chapters, speed, sleep timer and transcript. */

import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { SoundVisualizer } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { chapterStarts } from '@winterop-com/sokkel-ui-media/ChapterList'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { SleepTimerMenu } from '@winterop-com/sokkel-ui-media/SleepTimer'
import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { Transcript } from '@winterop-com/sokkel-ui-media/Transcript'
import { useMediaSession } from '@winterop-com/sokkel-ui-media/use-media-session'
import { ListOrdered } from 'lucide-react'
import { useMemo } from 'react'

import { go } from 'tidevann-shared/router'
import { episodeById, hostsOf, showById } from './catalog'
import { STAR, useWide } from './parts'
import { usePodcasts } from './state'

/** The speeds the player offers. */
export const RATES = [0.8, 1, 1.2, 1.5, 1.8, 2] as const

export function Player({
    fullscreen,
    onFullscreenChange,
    queueShown,
}: {
    fullscreen: boolean
    onFullscreenChange: (open: boolean) => void
    queueShown: boolean
}) {
    const state = usePodcasts()
    // On a phone the bar's line has no room for the queue, which the navigation holds.
    const wide = useWide()
    const { current, script, player, prefs, sleep } = state
    const episode = current === null ? undefined : episodeById.get(current)
    const show = episode === undefined ? undefined : showById.get(episode.show)
    const row = current === null ? undefined : state.episodes.get(current)
    const starts = useMemo(() => (script === undefined ? undefined : chapterStarts(script.chapters)), [script])

    useMediaSession(
        episode === undefined || show === undefined || script === undefined
            ? null
            : {
                  title: episode.title,
                  artist: hostsOf(show),
                  album: show.title,
                  duration: script.duration,
                  position: state.position,
                  rate: player.rate,
                  playing: state.playing,
                  skip: prefs.skip,
                  handlers: {
                      play: () => state.setPlaying(true),
                      pause: () => state.setPlaying(false),
                      seekbackward: (seconds) => state.skip(-seconds),
                      seekforward: (seconds) => state.skip(seconds),
                      seekto: state.seek,
                      nexttrack: () => void state.playNext(),
                  },
              },
    )

    if (episode === undefined || show === undefined || script === undefined || row === undefined) return null
    const transcript = <Transcript lines={script.lines} position={state.position} onSeek={state.seek} />
    return (
        <MediaBar
            title={
                <a href={`#/episode/${episode.id}`} className="hover:underline">
                    {episode.title}
                </a>
            }
            subtitle={
                <a href={`#/show/${show.id}`} className="hover:underline">
                    {show.title}
                </a>
            }
            artist={hostsOf(show)}
            album={show.title}
            artwork={<Artwork cover={show.cover} />}
            playing={state.playing}
            onPlayingChange={state.setPlaying}
            position={state.position}
            media={state.media}
            duration={script.duration}
            onSeek={state.seek}
            chapters={starts}
            skip={prefs.skip}
            onSkip={state.skip}
            rate={player.rate}
            rates={RATES}
            onRateChange={state.setRate}
            waveform={state.waveform}
            visualizer={
                state.media === null ? undefined : <SoundVisualizer source={state.media} playing={state.playing} label="What is playing" />
            }
            volume={player.volume}
            onVolumeChange={state.setVolume}
            muted={player.muted}
            onMutedChange={state.setMuted}
            fullscreen={fullscreen}
            onFullscreenChange={onFullscreenChange}
            expandable
            lyrics={transcript}
            fullscreenActions={<StarButton starred={row.starred} onStarredChange={(on) => state.star(episode.id, on)} words={STAR} />}
            extra={
                <>
                    <SleepTimerMenu
                        timer={sleep.timer}
                        remaining={sleep.remaining}
                        onTimerChange={sleep.set}
                        chapters={script.chapters.length > 1}
                    />
                    {wide && (
                        <TransportButton
                            label={`Queue, ${String(player.queue.length)} up next`}
                            pressed={queueShown}
                            onClick={() => go(queueShown ? '/home' : '/queue')}
                        >
                            <ListOrdered aria-hidden />
                        </TransportButton>
                    )}
                </>
            }
            words={{ lyrics: 'Transcript' }}
        />
    )
}
