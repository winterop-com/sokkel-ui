import type { Meta, StoryObj } from '@storybook/react-vite'
import { Maximize2, Scissors, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { useRef, useState } from 'react'

import {
    CLIP_TIMELINE_WORDS,
    ClipTimeline,
    zoomStep,
    type ClipChange,
    type TimelineClip,
    type TimelineTrack,
} from '@winterop-com/sokkel-ui/ClipTimeline'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Section } from '@winterop-com/sokkel-ui/Section'

/**
 * The multi-track timeline of a video editor: a row a track with its header at the start, clips as
 * blocks in their color under a ruler of timecode, and the playhead across every track.
 */
const meta: Meta = { title: 'Patterns/Clip timeline', parameters: { frame: 'padded' } }
export default meta

/** A source's loudness, the same every time: a few slow swells over a quick flutter. */
function peaks(count: number, seed: number): number[] {
    return Array.from({ length: count }, (_, index) => {
        const slow = 0.5 + 0.3 * Math.sin(index / (7 + seed) + seed)
        const quick = 0.2 * Math.abs(Math.sin(index * (1.7 + seed / 10)))
        return Math.min(Math.max(slow + quick - 0.1, 0.05), 1)
    })
}

const TRACKS: TimelineTrack[] = [
    { id: 'titles', name: 'Titles', kind: 'title' },
    { id: 'video', name: 'Video', kind: 'video' },
    { id: 'voice', name: 'Interview', kind: 'audio' },
    { id: 'ambience', name: 'Ambience', kind: 'audio' },
]

const CLIPS: TimelineClip[] = [
    { id: 'opening', track: 'titles', start: 0, duration: 4, label: 'Opening title' },
    { id: 'lower-third', track: 'titles', start: 12, duration: 5, label: 'Lower third ada' },
    { id: 'harbor-wide', track: 'video', start: 0, duration: 8, inPoint: 2, sourceDuration: 20, label: 'harbor-wide' },
    { id: 'interview-ada', track: 'video', start: 8, duration: 18, inPoint: 5, sourceDuration: 40, label: 'interview-ada', color: 'teal' },
    { id: 'juniper-pier', track: 'video', start: 26, duration: 8, sourceDuration: 12, label: 'juniper-pier' },
    { id: 'larkspur-aerial', track: 'video', start: 36, duration: 14, sourceDuration: 30, label: 'larkspur-aerial', color: 'pink' },
    {
        id: 'interview-ada-sound',
        track: 'voice',
        start: 8,
        duration: 18,
        inPoint: 5,
        sourceDuration: 40,
        label: 'interview-ada',
        color: 'teal',
        waveform: peaks(400, 3),
    },
    { id: 'ambience', track: 'ambience', start: 0, duration: 50, sourceDuration: 120, label: 'ambience', waveform: peaks(600, 1) },
]

/** A video track and its sound, read-only: a press or a drag on the ruler moves the playhead. */
export const TwoTracks: StoryObj = {
    name: 'Two tracks',
    render: function Render() {
        const [playhead, setPlayhead] = useState(10)
        return (
            <ClipTimeline
                tracks={TRACKS.slice(1, 3)}
                clips={CLIPS.filter((clip) => clip.track === 'video' || clip.track === 'voice')}
                duration={60}
                playhead={playhead}
                onPlayheadChange={setPlayhead}
            />
        )
    },
}

/** Close in: a second a few hundred pixels wide, the ruler counting frames and the lanes scrolling sideways. */
export const CloseZoom: StoryObj = {
    name: 'Close zoom',
    render: function Render() {
        const [playhead, setPlayhead] = useState(8.5)
        return <ClipTimeline tracks={TRACKS} clips={CLIPS} duration={60} playhead={playhead} onPlayheadChange={setPlayhead} zoom={240} />
    },
}

/** Applies a timeline's changes to the clips. */
function applied(clips: readonly TimelineClip[], changes: readonly ClipChange[]): TimelineClip[] {
    return clips.map((clip) => {
        const change = changes.find((each) => each.id === clip.id)
        return change === undefined ? clip : { ...clip, ...change }
    })
}

/**
 * The whole editor: clips chosen by a press (Shift adds), dragged along their track or onto another of
 * the same kind, trimmed at either end, split at the playhead with S or the button, deleted with
 * Delete (Shift closes the gap); the track headers mute, hide and lock, and the zoom buttons and the
 * command key with the wheel zoom.
 */
export const Editor: StoryObj = {
    render: function Render() {
        const [tracks, setTracks] = useState(TRACKS)
        const [clips, setClips] = useState(CLIPS)
        const [selected, setSelected] = useState<string[]>(['interview-ada'])
        const [playhead, setPlayhead] = useState(14)
        const [zoom, setZoom] = useState<number | undefined>(undefined)
        const [fit, setFit] = useState(10)
        const made = useRef(0)
        const split = (id: string, at: number) =>
            setClips((current) =>
                current.flatMap((clip) => {
                    if (clip.id !== id) return [clip]
                    made.current += 1
                    const cut = at - clip.start
                    return [
                        { ...clip, duration: cut },
                        {
                            ...clip,
                            id: `${clip.id}-${String(made.current)}`,
                            start: at,
                            duration: clip.duration - cut,
                            inPoint: (clip.inPoint ?? 0) + cut,
                        },
                    ]
                }),
            )
        const remove = (ids: string[], ripple: boolean) => {
            setClips((current) => {
                const gone = current.filter((clip) => ids.includes(clip.id))
                return current
                    .filter((clip) => !ids.includes(clip.id))
                    .map((clip) => {
                        if (!ripple) return clip
                        const before = gone.filter((each) => each.track === clip.track && each.start < clip.start)
                        return { ...clip, start: clip.start - before.reduce((sum, each) => sum + each.duration, 0) }
                    })
            })
            setSelected([])
        }
        const splittable = clips.filter(
            (clip) => selected.includes(clip.id) && clip.start < playhead && playhead < clip.start + clip.duration,
        )
        return (
            <Section
                title="Timeline"
                actions={
                    <Row gap="xs">
                        <IconButton
                            label="Split"
                            disabled={splittable.length === 0}
                            onClick={() => splittable.forEach((clip) => split(clip.id, playhead))}
                        >
                            <Scissors />
                        </IconButton>
                        <IconButton label="Delete" disabled={selected.length === 0} onClick={() => remove(selected, false)}>
                            <Trash2 />
                        </IconButton>
                        <IconButton label={CLIP_TIMELINE_WORDS.zoomOut} onClick={() => setZoom(zoomStep(zoom ?? fit, -1))}>
                            <ZoomOut />
                        </IconButton>
                        <IconButton label={CLIP_TIMELINE_WORDS.zoomFit} onClick={() => setZoom(undefined)}>
                            <Maximize2 />
                        </IconButton>
                        <IconButton label={CLIP_TIMELINE_WORDS.zoomIn} onClick={() => setZoom(zoomStep(zoom ?? fit, 1))}>
                            <ZoomIn />
                        </IconButton>
                    </Row>
                }
            >
                <ClipTimeline
                    tracks={tracks}
                    clips={clips}
                    duration={60}
                    playhead={playhead}
                    onPlayheadChange={setPlayhead}
                    selected={selected}
                    onSelectedChange={setSelected}
                    onClipsChange={(changes) => setClips((current) => applied(current, changes))}
                    onSplit={split}
                    onDelete={remove}
                    onTrackChange={(id, patch) =>
                        setTracks((current) => current.map((track) => (track.id === id ? { ...track, ...patch } : track)))
                    }
                    zoom={zoom}
                    onZoomChange={setZoom}
                    onFitChange={setFit}
                />
            </Section>
        )
    },
}

/** A locked video track whose clips stay put, a hidden title track and a muted sound track, each drawn faint or shaded. */
export const LockedTracks: StoryObj = {
    name: 'Locked tracks',
    render: function Render() {
        const [playhead, setPlayhead] = useState(20)
        const [tracks, setTracks] = useState<TimelineTrack[]>(
            TRACKS.map((track) =>
                track.id === 'video'
                    ? { ...track, locked: true }
                    : track.id === 'titles'
                      ? { ...track, hidden: true }
                      : track.id === 'ambience'
                        ? { ...track, muted: true }
                        : track,
            ),
        )
        const [clips, setClips] = useState(CLIPS)
        return (
            <ClipTimeline
                tracks={tracks}
                clips={clips}
                duration={60}
                playhead={playhead}
                onPlayheadChange={setPlayhead}
                onClipsChange={(changes) => setClips((current) => applied(current, changes))}
                onTrackChange={(id, patch) =>
                    setTracks((current) => current.map((track) => (track.id === id ? { ...track, ...patch } : track)))
                }
            />
        )
    },
}
