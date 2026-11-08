import type { Meta, StoryObj } from '@storybook/react-vite'

import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { SpeakButton } from '@winterop-com/sokkel-ui/media/SpeakButton'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { speakFails, speakLater } from '../fixtures/speech'

/**
 * A button that reads a text aloud with audio fetched on the first press and kept for the next:
 * idle, loading, playing and failed. The audio is made in the page, so nothing is fetched.
 */
const meta: Meta = {
    title: 'Media/Speak button',
    parameters: { frame: 'column' },
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

/** As an icon, for a message's hover bar: a press fetches the audio, spins while it comes, and plays it; a press while it plays stops it. */
export const Icon: StoryObj = { render: () => <SpeakButton load={speakLater} /> }

/** With its words, for a reply's row of actions. */
export const Labeled: StoryObj = { render: () => <SpeakButton load={speakLater} variant="labeled" /> }

/** Each state as an icon and with its words: waiting, loading, playing and failed. */
export const States: StoryObj = {
    render: () => (
        <Stack gap="lg">
            {(['icon', 'labeled'] as const).map((variant) => (
                <Row key={variant} gap="md" wrap>
                    {(['idle', 'loading', 'playing', 'error'] as const).map((state) => (
                        <SpeakButton key={state} load={speakLater} variant={variant} defaultState={state} />
                    ))}
                </Row>
            ))}
        </Stack>
    ),
}

/** A server that cannot read the text: the button says so after a moment, and the next press tries again. */
export const Fails: StoryObj = { render: () => <SpeakButton load={speakFails} variant="labeled" /> }
