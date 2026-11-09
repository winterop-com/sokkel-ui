import { StarButton } from '@winterop-com/sokkel-ui/StarButton'
import { TransportButton } from '@winterop-com/sokkel-ui/media/MediaControls'
import { SoundVisualizer } from '@winterop-com/sokkel-ui/media/SoundVisualizer'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { Lyrics } from '@winterop-com/sokkel-ui-media/Lyrics'
import { MediaBar } from '@winterop-com/sokkel-ui-media/MediaBar'
import { parseLyrics } from '@winterop-com/sokkel-ui-media/lrc'
import { useFramePosition } from '@winterop-com/sokkel-ui-media/use-frame-position'
import { useMediaSession } from '@winterop-com/sokkel-ui-media/use-media-session'
import { ListMusic } from 'lucide-react'
import { useMemo } from 'react'

import { albumOf, artistName } from '../catalog'
import { setFavorite, setSettings, useSettings, useStarred } from '../data'
import { isLook, lookProps, LOOKS } from '../look'
import { lyricsOf } from '../lyrics'
import { currentSong, hasNext, next, previous, seek, seekBy, setPlaying, setRepeat, setShuffle, usePlayer, usePosition } from '../player'

/** The words of what plays, following it on the frame clock, a press on a line seeking there. */
function SungWords({ text, element, playing }: { text: string; element: HTMLAudioElement | null; playing: boolean }) {
    const given = usePosition()
    const at = useFramePosition(given, element === null ? undefined : () => element.currentTime, playing)
    const parsed = useMemo(() => parseLyrics(text), [text])
    return <Lyrics lyrics={parsed} position={at} onSeek={seek} />
}

/**
 * The player bar along the window's foot: what plays, the transport, shuffle and repeat, the
 * speed, the volume and the queue's button; grown from its top edge into the layout the settings
 * pick, with the waveform of the song as its scrubber and the visualizer behind it; and the full
 * screen with its picker of looks, the words and a star. The operating system's media keys and
 * lock screen drive it too.
 */
export function Player({
    queueOpen,
    onQueueOpenChange,
    fullscreen,
    onFullscreenChange,
}: {
    queueOpen: boolean
    onQueueOpenChange: (open: boolean) => void
    fullscreen: boolean
    onFullscreenChange: (open: boolean) => void
}) {
    const state = usePlayer()
    const at = usePosition()
    const options = useSettings()
    const starred = useStarred('song')
    const song = currentSong(state)
    const album = song === undefined ? undefined : albumOf(song)
    const radio = state.radio !== null
    const text = song === undefined ? undefined : lyricsOf(song)

    useMediaSession(
        song === undefined
            ? null
            : {
                  title: song.title,
                  artist: artistName(song.artist),
                  album: album?.title,
                  duration: radio ? undefined : song.duration,
                  position: at,
                  rate: options.rate,
                  playing: state.playing,
                  handlers: {
                      play: () => setPlaying(true),
                      pause: () => setPlaying(false),
                      previoustrack: radio ? undefined : previous,
                      nexttrack: next,
                      seekto: radio ? undefined : (seconds) => seek(seconds),
                      seekbackward: radio ? undefined : (seconds) => seekBy(-seconds),
                      seekforward: radio ? undefined : (seconds) => seekBy(seconds),
                  },
              },
    )

    if (song === undefined || album === undefined) return null
    const look = lookProps(options.look, options.ramp, options.effect)
    const queueButton = (
        <TransportButton
            label={queueOpen ? 'Hide the queue' : 'Show the queue'}
            pressed={queueOpen}
            onClick={() => onQueueOpenChange(!queueOpen)}
        >
            <ListMusic aria-hidden />
        </TransportButton>
    )
    return (
        <MediaBar
            title={song.title}
            artist={song.with === undefined ? artistName(song.artist) : `${artistName(song.artist)} with ${song.with}`}
            album={album.title}
            year={radio ? undefined : album.year}
            trackNumber={radio ? undefined : state.queue.at + 1}
            trackCount={radio ? undefined : state.queue.order.length}
            artwork={<Artwork cover={album.cover} />}
            playing={state.playing}
            onPlayingChange={setPlaying}
            position={at}
            media={state.element}
            duration={song.duration}
            onSeek={seek}
            live={radio}
            rate={options.rate}
            onRateChange={radio ? undefined : (rate) => setSettings({ rate })}
            waveform={state.waveform}
            visualizer={
                options.barVisualizer || fullscreen ? (
                    <SoundVisualizer source={state.element} delay={options.delay} label="What is playing" {...look} />
                ) : undefined
            }
            volume={options.volume}
            onVolumeChange={(volume) => setSettings({ volume, muted: false })}
            muted={options.muted}
            onMutedChange={(muted) => setSettings({ muted })}
            onPrevious={radio ? undefined : previous}
            onNext={hasNext(state) ? next : undefined}
            shuffle={state.queue.shuffle}
            onShuffleChange={radio ? undefined : setShuffle}
            repeat={state.queue.repeat}
            onRepeatChange={radio ? undefined : setRepeat}
            extra={queueButton}
            layout={options.layout}
            // Held here always; zero is the one line, which the bar keeps as its least height.
            size={options.barSize ?? 0}
            onSizeChange={(size) => setSettings({ barSize: size })}
            fullscreen={fullscreen}
            onFullscreenChange={onFullscreenChange}
            lyrics={text === undefined ? undefined : <SungWords text={text} element={state.element} playing={state.playing} />}
            lyricsShown={options.lyrics && text !== undefined}
            onLyricsShownChange={(lyrics) => setSettings({ lyrics })}
            fullscreenActions={<StarButton starred={starred.has(song.id)} onStarredChange={(on) => setFavorite('song', song.id, on)} />}
            visualizerOptions={LOOKS}
            visualizerOption={options.look}
            onVisualizerOptionChange={(id) => {
                if (isLook(id)) setSettings({ look: id })
            }}
        />
    )
}
