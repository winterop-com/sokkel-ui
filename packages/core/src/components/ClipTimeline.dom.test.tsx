// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
    ClipTimeline,
    clipTickStep,
    formatTimecode,
    placeClip,
    snapTime,
    zoomStep,
    type ClipChange,
    type ClipTimelineProps,
    type TimelineClip,
    type TimelineTrack,
} from './ClipTimeline'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
})

function draw(node: React.ReactNode): HTMLElement {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(node))
    return host
}

const TRACKS: TimelineTrack[] = [
    { id: 'titles', name: 'Titles', kind: 'title' },
    { id: 'video', name: 'Video', kind: 'video' },
    { id: 'voice', name: 'Interview', kind: 'audio', locked: true },
]

const CLIPS: TimelineClip[] = [
    { id: 'opening', track: 'titles', start: 0, duration: 4, label: 'Opening title' },
    { id: 'harbor-wide', track: 'video', start: 0, duration: 8, label: 'harbor-wide' },
    { id: 'interview-ada', track: 'video', start: 10, duration: 6, label: 'interview-ada' },
    { id: 'interview-ada-sound', track: 'voice', start: 10, duration: 6, label: 'interview-ada', waveform: [0.2, 0.8, 0.5, 0.9] },
]

function key(target: Element | null, init: KeyboardEventInit) {
    act(() => target?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })))
}

function timeline(props: Partial<ClipTimelineProps>) {
    return draw(<ClipTimeline tracks={TRACKS} clips={CLIPS} duration={30} playhead={0} onPlayheadChange={() => undefined} {...props} />)
}

describe('formatTimecode', () => {
    it('writes hours, minutes, seconds and frames', () => {
        expect(formatTimecode(0)).toBe('00:00:00:00')
        expect(formatTimecode(3661.5, 30)).toBe('01:01:01:15')
        expect(formatTimecode(2 + 12 / 25, 25)).toBe('00:00:02:12')
        expect(formatTimecode(-4)).toBe('00:00:00:00')
    })
})

describe('snapTime', () => {
    it('snaps to the nearest target within reach, else to a frame', () => {
        expect(snapTime(4.1, [0, 4, 8], 0.2)).toBe(4)
        expect(snapTime(4.5, [0, 4, 8], 0.2, 10)).toBe(4.5)
        expect(snapTime(4.52, [], 0.2, 10)).toBeCloseTo(4.5)
    })
})

describe('placeClip', () => {
    const others = [
        { start: 0, duration: 8 },
        { start: 10, duration: 6 },
    ]
    it('keeps a free place, and moves off a clip to the nearest free place beside it', () => {
        expect(placeClip(20, 4, others)).toBe(20)
        expect(placeClip(15, 4, others)).toBe(16)
        expect(placeClip(7, 2, others)).toBe(8)
    })
    it('refuses a place with nothing free near it', () => {
        expect(placeClip(3, 1, [{ start: 0, duration: 20 }])).toBeNull()
    })
})

describe('zoom', () => {
    it('steps a quarter at a time within its bounds', () => {
        expect(zoomStep(40, 1)).toBe(50)
        expect(zoomStep(1000, 1)).toBe(600)
    })
    it('picks a tick step that leaves room for the timecode', () => {
        expect(clipTickStep(10)).toBe(10)
        expect(clipTickStep(300, 30)).toBeCloseTo(10 / 30)
    })
})

describe('ClipTimeline', () => {
    it('draws a header and a lane for each track, and each clip in its lane', () => {
        const page = timeline({})
        expect(page.querySelectorAll('[data-track-header]')).toHaveLength(3)
        expect(page.querySelectorAll('[data-track-lane]')).toHaveLength(3)
        expect(page.querySelector('[data-track-lane="video"] [data-clip="interview-ada"]')).not.toBeNull()
        expect(page.querySelector('[data-clip="interview-ada-sound"] svg')).not.toBeNull()
        expect(page.textContent).toContain('00:00:00:00')
    })

    it('chooses a clip by a press, and adds one with Shift', () => {
        const heard: string[][] = []
        const page = timeline({ selected: ['harbor-wide'], onSelectedChange: (ids) => heard.push(ids) })
        const clip = page.querySelector<HTMLElement>('[data-clip="interview-ada"]')
        act(() => clip?.click())
        act(() => clip?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true })))
        expect(heard).toEqual([['interview-ada'], ['harbor-wide', 'interview-ada']])
    })

    it('moves the playhead a frame with the arrows and a second with Shift', () => {
        const heard: number[] = []
        const page = timeline({ playhead: 2, onPlayheadChange: (at) => heard.push(at) })
        const head = page.querySelector('[data-playhead]')
        key(head, { key: 'ArrowRight' })
        key(head, { key: 'ArrowLeft', shiftKey: true })
        key(head, { key: 'Home' })
        expect(heard[0]).toBeCloseTo(2 + 1 / 30)
        expect(heard[1]).toBeCloseTo(1)
        expect(heard[2]).toBe(0)
        expect(page.querySelector('[aria-live]')?.textContent).toBe('Playhead at 00:00:00:00')
    })

    it('moves the chosen clip a frame with Alt, never onto another', () => {
        const heard: ClipChange[][] = []
        const page = timeline({ selected: ['interview-ada'], onClipsChange: (changes) => heard.push(changes) })
        const clip = page.querySelector('[data-clip="interview-ada"]')
        key(clip, { key: 'ArrowLeft', altKey: true })
        expect(heard).toHaveLength(1)
        expect(heard[0][0].id).toBe('interview-ada')
        expect(heard[0][0].start).toBeCloseTo(10 - 1 / 30)
        const blocked = timeline({
            clips: CLIPS.map((clip) => (clip.id === 'interview-ada' ? { ...clip, start: 8 } : clip)),
            selected: ['interview-ada'],
            onClipsChange: (changes) => heard.push(changes),
        })
        key(blocked.querySelector('[data-clip="interview-ada"]'), { key: 'ArrowLeft', altKey: true })
        expect(heard).toHaveLength(1)
        expect(blocked.querySelector('[aria-live]')?.textContent).toBe('interview-ada cannot go there')
    })

    it('splits the chosen clips the playhead stands in with S, and leaves a locked one', () => {
        const heard: [string, number][] = []
        const page = timeline({
            playhead: 12,
            selected: ['interview-ada', 'interview-ada-sound', 'harbor-wide'],
            onSplit: (id, at) => heard.push([id, at]),
        })
        key(page.querySelector('[data-clip="interview-ada"]'), { key: 's' })
        expect(heard).toEqual([['interview-ada', 12]])
    })

    it('deletes the chosen clips with Delete, and closes the gap with Shift', () => {
        const heard: [string[], boolean][] = []
        const page = timeline({ selected: ['harbor-wide'], onDelete: (ids, ripple) => heard.push([ids, ripple]) })
        const clip = page.querySelector('[data-clip="harbor-wide"]')
        key(clip, { key: 'Delete' })
        key(clip, { key: 'Backspace', shiftKey: true })
        expect(heard).toEqual([
            [['harbor-wide'], false],
            [['harbor-wide'], true],
        ])
    })

    it('draws the header toggles only with onTrackChange, and hears them', () => {
        expect(timeline({}).querySelectorAll('[data-track-header] button')).toHaveLength(0)
        const heard: unknown[] = []
        const page = timeline({ onTrackChange: (id, patch) => heard.push([id, patch]) })
        const voice = page.querySelector('[data-track-header="voice"]')
        const buttons = voice?.querySelectorAll('button') ?? []
        expect(buttons).toHaveLength(2)
        act(() => buttons[0].click())
        act(() => buttons[1].click())
        expect(heard).toEqual([
            ['voice', { muted: true }],
            ['voice', { locked: false }],
        ])
    })
})
