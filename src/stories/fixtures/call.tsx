/** A call in Tidevann: its devices, its people, and the state a call bar toggles, held as a call app would. */

import { Captions, LayoutGrid } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { CallBarItem, CallBarProps, CallDeviceList } from '@winterop-com/sokkel-ui/CallBar'
import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { CallTile } from '@winterop-com/sokkel-ui/CallTile'
import { pictureOf } from './portraits'

export const MICROPHONES = [
    { id: 'mic-built-in', label: 'Built-in microphone' },
    { id: 'mic-desk', label: 'Desk microphone (USB)' },
    { id: 'mic-headset', label: 'Headset microphone' },
]

export const SPEAKERS = [
    { id: 'out-built-in', label: 'Built-in speakers' },
    { id: 'out-headset', label: 'Headset' },
]

export const CAMERAS = [
    { id: 'cam-built-in', label: 'Built-in camera' },
    { id: 'cam-desk', label: 'Desk camera (USB)' },
]

/** Who is on the call, and whether each is muted. */
export const ON_CALL = [
    { handle: 'ada', name: 'Ada Berg', image: pictureOf('ada'), muted: false },
    { handle: 'grace', name: 'Grace Holm', image: pictureOf('grace'), muted: true },
    { handle: 'linus', name: 'Linus Dahl', image: pictureOf('linus'), muted: false },
    { handle: 'margaret', name: 'Margaret Lund', image: pictureOf('margaret'), muted: true },
]

/** The state a call bar shows, all of it held here so every control does what it says. */
export interface CallState {
    muted: boolean
    cameraOff: boolean
    sharing: boolean
    handRaised: boolean
    captions: boolean
    grid: boolean
    microphone: string
    speaker: string
    camera: string
    /** The reactions given, oldest first. */
    given: string[]
    left: boolean
}

export const CALL_START: CallState = {
    muted: false,
    cameraOff: false,
    sharing: false,
    handRaised: false,
    captions: false,
    grid: true,
    microphone: 'mic-built-in',
    speaker: 'out-built-in',
    camera: 'cam-built-in',
    given: [],
    left: false,
}

/** A call's state and the call bar's props that change it. */
export function useCall(start: Partial<CallState> = {}) {
    const [call, setCall] = useState<CallState>({ ...CALL_START, ...start })
    const set = (change: Partial<CallState>) => setCall((now) => ({ ...now, ...change }))
    const microphones: CallDeviceList[] = [
        {
            id: 'microphones',
            label: 'Microphone',
            devices: MICROPHONES,
            selected: call.microphone,
            onSelect: (id) => set({ microphone: id }),
        },
        { id: 'speakers', label: 'Speaker', devices: SPEAKERS, selected: call.speaker, onSelect: (id) => set({ speaker: id }) },
    ]
    const cameras: CallDeviceList[] = [
        { id: 'cameras', label: 'Camera', devices: CAMERAS, selected: call.camera, onSelect: (id) => set({ camera: id }) },
    ]
    const more: CallBarItem[] = [
        {
            id: 'captions',
            label: 'Captions',
            icon: <Captions aria-hidden />,
            checked: call.captions,
            onSelect: () => set({ captions: !call.captions }),
        },
        {
            id: 'grid',
            label: 'Show everyone',
            icon: <LayoutGrid aria-hidden />,
            checked: call.grid,
            onSelect: () => set({ grid: !call.grid }),
        },
    ]
    const bar: CallBarProps = {
        muted: call.muted,
        onMutedChange: (muted) => set({ muted }),
        microphones,
        cameraOff: call.cameraOff,
        onCameraOffChange: (cameraOff) => set({ cameraOff }),
        cameras,
        sharing: call.sharing,
        onSharingChange: (sharing) => set({ sharing }),
        onReact: (emoji) => setCall((now) => ({ ...now, given: [...now.given, emoji] })),
        handRaised: call.handRaised,
        onHandRaisedChange: (handRaised) => set({ handRaised }),
        more,
        onLeave: () => set({ left: true }),
    }
    return { call, set, bar }
}

/**
 * The call's picture: a tile for each person on the call on a dark ground, the person calling first
 * as You, the last reaction given over it, captions at its foot when on, and the call bar (`bar`)
 * floating over the foot. With `fill` it fills the window's height, its tiles scrolling under the bar.
 */
export function CallStage({ call, bar, fill = false }: { call: CallState; bar: ReactNode; fill?: boolean }) {
    const last = call.given.at(-1)
    const people = call.grid ? ON_CALL.slice(1) : ON_CALL.slice(1, 2)
    return (
        <div className={cn('relative overflow-hidden bg-terminal', fill ? 'h-svh' : 'rounded-surface')}>
            <div className={cn('p-3 pb-20', fill && 'absolute inset-0 overflow-y-auto')}>
                <Columns count={2} min="sm" gap="sm">
                    <CallTile
                        name="You"
                        image={call.cameraOff ? undefined : ON_CALL[0].image}
                        muted={call.muted}
                        handRaised={call.handRaised}
                    />
                    {people.map((person) => (
                        <CallTile key={person.handle} name={person.name} image={person.image} muted={person.muted} />
                    ))}
                </Columns>
            </div>
            {last !== undefined && (
                <span key={call.given.length} className="pointer-events-none absolute top-4 right-5 font-emoji text-emoji" aria-hidden>
                    {last}
                </span>
            )}
            {call.captions && (
                <p className="absolute inset-x-6 bottom-18 text-center text-body text-terminal-foreground">
                    <span className="rounded-control bg-terminal/80 px-2 py-0.5">
                        grace: the import-orders run is back to green since this morning.
                    </span>
                </p>
            )}
            <div className="absolute inset-x-3 bottom-3">{bar}</div>
        </div>
    )
}
