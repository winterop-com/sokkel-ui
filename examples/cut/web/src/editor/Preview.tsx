import { Chip } from '@winterop-com/sokkel-ui/Chip'
import { MediaSlider } from '@winterop-com/sokkel-ui/media/MediaSlider'
import { PlayButton, TransportButton, VolumeControl } from '@winterop-com/sokkel-ui/media/MediaControls'
import { ChevronFirst, ChevronLast, StepBack, StepForward } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { FPS, timecode, type Edit } from '../model'
import { drawEditFrame } from '../render'
import type { Playback } from './use-playback'

/** The size the preview draws at, and half of it for a light preview. */
const FULL = { width: 960, height: 540 }

/**
 * The edit's picture at the playhead, drawn straight from the scenes, the scrub bar under it, and
 * the transport: to the start, a frame back, play, a frame on, to the end, the timecode and the
 * level.
 */
export function Preview({
    edit,
    length,
    playback,
    light,
    level,
    muted,
    onLevelChange,
    onMutedChange,
}: {
    edit: Edit
    length: number
    playback: Playback
    light: boolean
    level: number
    muted: boolean
    onLevelChange: (level: number) => void
    onMutedChange: (muted: boolean) => void
}) {
    const canvas = useRef<HTMLCanvasElement>(null)
    const width = light ? FULL.width / 2 : FULL.width
    const height = light ? FULL.height / 2 : FULL.height
    const { playhead } = playback

    useEffect(() => {
        const context = canvas.current?.getContext('2d')
        if (context === null || context === undefined) return
        drawEditFrame(context, edit, playhead, width, height)
    }, [edit, playhead, width, height])

    const at = Math.min(playhead, length)
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center bg-terminal p-2">
                <canvas
                    ref={canvas}
                    width={width}
                    height={height}
                    role="img"
                    aria-label={`The edit at ${timecode(at)}`}
                    className="aspect-video max-h-full w-full min-w-0 object-contain"
                />
            </div>
            <div className="flex flex-col gap-1 border-t border-border px-3 py-2">
                <MediaSlider
                    value={at}
                    max={Math.max(length, 1 / FPS)}
                    label="Playhead"
                    valueText={(value) => `${timecode(value)} of ${timecode(length)}`}
                    step={1 / FPS}
                    largeStep={1}
                    onChange={playback.seek}
                    onScrub={(value) => {
                        if (value !== null) playback.seek(value)
                    }}
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-sm tabular-nums">
                        {timecode(at)}
                        <span className="text-muted-foreground"> / {timecode(length)}</span>
                    </span>
                    <div className="flex flex-1 items-center justify-center gap-1">
                        <TransportButton label="To the start" onClick={() => playback.seek(0)}>
                            <ChevronFirst aria-hidden />
                        </TransportButton>
                        <TransportButton label="A frame back" onClick={() => playback.step(-1)}>
                            <StepBack aria-hidden />
                        </TransportButton>
                        <PlayButton
                            playing={playback.playing}
                            onToggle={playback.toggle}
                            size="md"
                            words={{ play: 'Play', pause: 'Pause' }}
                        />
                        <TransportButton label="A frame on" onClick={() => playback.step(1)}>
                            <StepForward aria-hidden />
                        </TransportButton>
                        <TransportButton label="To the end" onClick={() => playback.seek(length)}>
                            <ChevronLast aria-hidden />
                        </TransportButton>
                    </div>
                    {playback.rate !== 0 && playback.rate !== 1 && (
                        <Chip>{`${playback.rate < 0 ? '-' : ''}${String(Math.abs(playback.rate))}x`}</Chip>
                    )}
                    <VolumeControl
                        level={muted ? 0 : level}
                        muted={muted}
                        onMutedChange={onMutedChange}
                        onVolumeChange={onLevelChange}
                        compact
                        words={{ mute: 'Mute', unmute: 'Unmute', volume: 'Level' }}
                    />
                </div>
            </div>
        </div>
    )
}
