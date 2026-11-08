import type { Meta, StoryObj } from '@storybook/react-vite'
import { Maximize, Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { formatTime } from '@winterop-com/sokkel-ui/media/time'
import { VideoPlayer, type VideoError, type VideoPlayerHandle, type VideoSource } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { ButtonGroup } from '@winterop-com/sokkel-ui/primitives/button-group'
import { hlsSource } from '@winterop-com/sokkel-ui-media/hls-source'
import captions from './fixtures/captions.vtt?url'
import clip from './fixtures/clip.webm?url'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** A player in the middle of a plain page, with what plays under it. The clip is a local, silent gradient. */
function Ground({ children, after }: { children: ReactNode; after?: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
            <Stack>
                {children}
                <div>
                    <p className="text-sm font-medium">Coastline, morning to evening</p>
                    <MetaLine items={['Margaret', '1:36']} />
                </div>
                {after}
            </Stack>
        </div>
    )
}

/** What a player says through its events, one line each, for a log under it. */
function useEventLog() {
    const [lines, setLines] = useState<LogLine[]>([])
    const second = useRef(-1)
    const add = (line: LogLine) => {
        setLines((previous) => [...previous, line])
    }
    return {
        lines,
        onTime: (seconds: number) => {
            const whole = Math.floor(seconds)
            if (whole === second.current) return
            second.current = whole
            add({ source: 'onTime', text: formatTime(seconds) })
        },
        onEnded: () => {
            add({ source: 'onEnded', text: 'played to the end' })
        },
        onError: (error: VideoError) => {
            add({
                source: 'onError',
                level: error.fatal ? 'error' : 'warning',
                text: `${error.kind}${error.fatal ? ', gave up' : ', trying again'}: ${error.message}`,
            })
        },
    }
}

/** A player given `startAt`, with what its events tell written under it. */
function Resumed() {
    const log = useEventLog()
    return (
        <Ground after={<LogView lines={log.lines} follow wrap numbered={false} className="max-h-48" />}>
            <VideoPlayer
                src={clip}
                preload="auto"
                startAt={72}
                defaultControlsVisible
                title="Coastline, morning to evening"
                onTime={log.onTime}
                onEnded={log.onEnded}
                onError={log.onError}
            />
        </Ground>
    )
}

/** A player whose keys and controls are the screen's, driving it through its handle. */
function DrivenFromOutside() {
    const player = useRef<VideoPlayerHandle>(null)
    useShortcuts(
        [
            { id: 'video-toggle', key: 'k', label: 'Play or pause', group: 'Video', run: () => player.current?.toggle() },
            { id: 'video-back', key: 'j', label: 'Back 10 seconds', group: 'Video', repeat: true, run: () => player.current?.seekBy(-10) },
            {
                id: 'video-forward',
                key: 'l',
                label: 'Forward 10 seconds',
                group: 'Video',
                repeat: true,
                run: () => player.current?.seekBy(10),
            },
            { id: 'video-mute', key: 'm', label: 'Mute', group: 'Video', run: () => player.current?.toggleMute() },
            { id: 'video-fullscreen', key: 'f', label: 'Fullscreen', group: 'Video', run: () => player.current?.toggleFullscreen() },
        ],
        [],
    )
    return (
        <Ground
            after={
                <Row wrap>
                    <ButtonGroup>
                        <Button variant="outline" aria-label="Back 10 seconds" onClick={() => player.current?.seekBy(-10)}>
                            <RotateCcw aria-hidden />
                        </Button>
                        <Button variant="outline" onClick={() => player.current?.play()}>
                            <Play aria-hidden />
                            Play
                        </Button>
                        <Button variant="outline" onClick={() => player.current?.pause()}>
                            <Pause aria-hidden />
                            Pause
                        </Button>
                        <Button variant="outline" aria-label="Forward 10 seconds" onClick={() => player.current?.seekBy(10)}>
                            <RotateCw aria-hidden />
                        </Button>
                    </ButtonGroup>
                    <Button variant="outline" onClick={() => player.current?.toggleMute()}>
                        <Volume2 aria-hidden />
                        Mute
                    </Button>
                    <Button variant="outline" onClick={() => player.current?.toggleFullscreen()}>
                        <Maximize aria-hidden />
                        Fullscreen
                    </Button>
                </Row>
            }
        >
            <VideoPlayer ref={player} src={`${clip}#t=24`} preload="auto" keys={false} title="Coastline, morning to evening" />
        </Ground>
    )
}

/** A player fed an HTTP live stream, with what its events tell written under it. */
function Streamed() {
    const log = useEventLog()
    return (
        <Ground after={<LogView lines={log.lines} follow wrap numbered={false} className="max-h-48" />}>
            <VideoPlayer
                source={hlsSource('media/stream/stream.m3u8')}
                startAt={24}
                defaultControlsVisible
                title="Coastline, morning to evening"
                onTime={log.onTime}
                onEnded={log.onEnded}
                onError={log.onError}
            />
        </Ground>
    )
}

/** A source that fails at once, for the failure as the player says it. */
const BROKEN: VideoSource = {
    id: 'broken',
    attach: (_video, report) => {
        report({ kind: 'network', message: 'The stream answered 503', fatal: true })
        return () => undefined
    },
}

/** A player whose source fails, with its tries spent at once. */
function GaveUp() {
    const log = useEventLog()
    return (
        <Ground after={<LogView lines={log.lines} wrap numbered={false} />}>
            <VideoPlayer source={BROKEN} retries={0} title="Coastline, morning to evening" onError={log.onError} />
        </Ground>
    )
}

const meta: Meta = { title: 'Media/Video' }
export default meta

/** Paused at a frame before the first play: only the play button is drawn over the picture. */
export const PausedFrame: StoryObj = {
    name: 'Paused frame',
    render: () => (
        <Ground>
            <VideoPlayer src={`${clip}#t=24`} preload="auto" />
        </Ground>
    ),
}

/** The controls drawn over the same frame, with English captions on. */
export const ControlsShown: StoryObj = {
    name: 'Controls shown',
    render: () => (
        <Ground>
            <VideoPlayer
                src={`${clip}#t=24`}
                preload="auto"
                defaultControlsVisible
                title="Coastline, morning to evening"
                tracks={[
                    { src: captions, label: 'English', lang: 'en', default: true },
                    { src: captions, label: 'English (plain)', lang: 'en-x-plain' },
                ]}
            />
        </Ground>
    ),
}

/**
 * Resumed where the viewer left off: `startAt` puts it at 1:12 once the clip has its length, and the
 * log under it shows what `onTime` (once a second here), `onEnded` and `onError` tell the screen
 * around it, as an app keeps the viewer's place.
 */
export const Resume: StoryObj = { render: () => <Resumed /> }

/**
 * Driven from outside: `keys={false}` leaves every key to the app, whose own controls and keys, bound
 * with `useShortcuts` (K plays and pauses, J and L skip ten seconds, M mutes, F fills the screen),
 * drive the player through the handle on `ref`.
 */
export const OutsideControls: StoryObj = { name: 'Outside controls', render: () => <DrivenFromOutside /> }

/**
 * An HTTP live stream through `hlsSource` from the media package: played natively where the browser
 * plays HLS itself, as Safari does, and otherwise through hls.js, loaded the first time it plays. The
 * stream is the clip cut into four segments and served with the stories.
 */
export const HlsStream: StoryObj = { name: 'HLS stream', render: () => <Streamed /> }

/** Its tries spent: the player says the video could not be played, with a button to try again. */
export const Failed: StoryObj = { render: () => <GaveUp /> }
