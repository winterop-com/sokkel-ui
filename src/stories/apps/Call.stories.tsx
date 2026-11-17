import type { Meta, StoryObj } from '@storybook/react-vite'

import { CallBar } from '@winterop-com/sokkel-ui/CallBar'
import { Center, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { CallStage, useCall } from '../fixtures/call'

/**
 * A video call filling the window: a tile for each person on the call, and the call bar floating
 * over its foot, every control real. Muting, the camera, a raised hand, captions and the grid show
 * on the tiles, a reaction given shows over them, ⌘D and ⌘E (Ctrl elsewhere) mute and turn the
 * camera off, and Leave ends the call with a way back in.
 */
const meta: Meta = { title: 'Apps/Call', parameters: { layout: 'fullscreen' } }
export default meta

function CallApp() {
    const { call, set, bar } = useCall()
    if (call.left)
        return (
            <Center className="min-h-svh bg-background p-6 text-foreground">
                <Stack align="center" gap="md">
                    <p className="text-section-title">You left harbor, weekly review</p>
                    <Button onClick={() => set({ left: false })}>Rejoin</Button>
                </Stack>
            </Center>
        )
    return (
        <TooltipProvider>
            <CallStage call={call} bar={<CallBar {...bar} shortcuts />} fill />
        </TooltipProvider>
    )
}

/** A call with four people, the bar's every control changing what the tiles show. */
export const Call: StoryObj = { render: () => <CallApp /> }
