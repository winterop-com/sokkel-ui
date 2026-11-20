import type { Meta, StoryObj } from '@storybook/react-vite'

import { CallBar, type CallBarMenu } from '@winterop-com/sokkel-ui/CallBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { CallStage, useCall, type CallState } from '../fixtures/call'

/**
 * The controls of a video or audio call: the microphone and the camera with their device menus,
 * sharing the screen, reactions standing over the bar, raising a hand, more and leave. It floats
 * over the call's picture or docks at its foot, and moves its less needed controls into more as its
 * room narrows.
 */
const meta: Meta = { title: 'Patterns/Call bar', parameters: { frame: 'padded' } }
export default meta

/** A bar whose every control changes the call it shows, with room above it for a menu it opens. */
function Live({ start, open, placement, room }: { start?: Partial<CallState>; open?: CallBarMenu; placement?: 'docked'; room?: string }) {
    const { call, bar } = useCall(start)
    return (
        <TooltipProvider>
            <Stack gap="sm" className={room}>
                <CallBar {...bar} defaultOpenMenu={open} placement={placement} />
                <p className="text-center text-help text-muted-foreground">
                    {call.left
                        ? 'Left the call'
                        : `${call.muted ? 'Muted' : 'Speaking'}, camera ${call.cameraOff ? 'off' : 'on'}${call.given.length > 0 ? `, gave ${call.given.join(' ')}` : ''}`}
                </p>
            </Stack>
        </TooltipProvider>
    )
}

/** Every control at rest: a press on any of them changes the call, said under the bar. */
export const Plain: StoryObj = { render: () => <Live /> }

/** The microphone muted and the camera turned off, drawn in the critical tone; the screen shared and a hand raised, drawn pressed. */
export const Off: StoryObj = {
    name: 'Muted and off',
    render: () => <Live start={{ muted: true, cameraOff: true, sharing: true, handRaised: true }} />,
}

/** The microphone's chevron pressed: its microphones and speakers, the ones in use checked. */
export const Devices: StoryObj = { name: 'Device menu', render: () => <Live open="microphone" room="pt-72" /> }

/** The reactions toggle pressed: the reaction bar opens in the bar's own surface, above its controls, and a reaction given is said under it. */
export const Reactions: StoryObj = { render: () => <Live open="reactions" /> }

/** More pressed: the app's own rows, captions and the grid, each checked while on. */
export const More: StoryObj = { name: 'More menu', render: () => <Live open="more" start={{ captions: true }} room="pt-80" /> }

/** Docked across the foot of the call's picture rather than floating over it. */
export const Docked: StoryObj = { render: () => <Live placement="docked" /> }

/** The bar floating over a call's picture, its people in tiles; ⌘D and ⌘E (Ctrl elsewhere) mute and turn the camera off. */
function Call() {
    const { call, bar } = useCall()
    return (
        <TooltipProvider>
            <CallStage call={call} bar={<CallBar {...bar} shortcuts />} />
        </TooltipProvider>
    )
}

/** The bar over a call's picture: the tiles follow the microphone, the camera, a raised hand, captions and the reactions given. */
export const OverACall: StoryObj = { name: 'Over a call', render: () => <Call /> }
