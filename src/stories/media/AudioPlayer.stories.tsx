import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { AudioPlayer } from '@winterop-com/sokkel-ui/media/AudioPlayer'
import { tuneUrl } from './fixtures/tune'
import { waveformOf } from './fixtures/waveform'

/**
 * A recording in one line: play and pause, the scrubber and the time. For a clip sent in a message,
 * a voice note, or an answer read aloud. The recording is made in the page, so nothing is fetched.
 */
const meta: Meta = { title: 'Media/Audio player', parameters: { frame: 'column' } }
export default meta

/** With no levels known, the scrubber is the media slider. */
export const Slider: StoryObj = {
    render: () => <AudioPlayer src={tuneUrl()} duration={8} label="nightly-export.wav" />,
}

/** Given the recording's levels, the scrubber is its waveform, the played part filled. */
export const Waveform: StoryObj = {
    render: () => <AudioPlayer src={tuneUrl()} duration={8} waveform={waveformOf(3, 64)} label="voice-note.wav" />,
}

/** In a quiet card of its own, as a clip sits in a message, beside one with no waveform. */
export const Card: StoryObj = {
    render: () => (
        <Stack gap="md" className="max-w-sm">
            <AudioPlayer src={tuneUrl()} duration={8} waveform={waveformOf(5, 64)} label="voice-note.wav" variant="card" />
            <AudioPlayer src={tuneUrl()} duration={8} label="Read aloud" variant="card" />
        </Stack>
    ),
}
