import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CameraControl, type CameraMove } from '@winterop-com/sokkel-ui/CameraControl'
import { Split, Stack } from '@winterop-com/sokkel-ui/Layout'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import street from '../media/fixtures/street.webm?url'

/**
 * The controls of a camera that turns and zooms: a pad of eight directions held while pressed, a
 * home button, a zoom in and out, and the places the camera keeps.
 */
const meta: Meta = { title: 'Patterns/Camera control' }
export default meta

const PRESETS = [
    { id: 'gate', name: 'Gate' },
    { id: 'quay', name: 'Quay' },
    { id: 'road', name: 'Road' },
    { id: 'yard', name: 'Yard' },
]

const noop = () => undefined

/** The pad, the zoom and four presets, the camera standing at the gate. */
export const Control: StoryObj = {
    render: () => (
        <CameraControl onMove={noop} onZoom={noop} onHome={noop} presets={PRESETS} preset="gate" onPreset={noop} className="p-6" />
    ),
}

/** The same with the camera offline: every control off. */
export const Offline: StoryObj = {
    render: () => <CameraControl onMove={noop} onZoom={noop} onHome={noop} presets={PRESETS} disabled className="p-6" />,
}

function BesideStory() {
    const [preset, setPreset] = useState('gate')
    const [said, setSaid] = useState('Standing')
    const told = (move: CameraMove | null) => setSaid(move === null ? 'Standing' : `Turning ${String(move.pan)}, ${String(move.tilt)}`)
    return (
        <Split
            className="p-6"
            width="sm"
            aside={
                <Stack gap="sm">
                    <CameraControl
                        onMove={told}
                        onZoom={(step) => setSaid(step === 0 ? 'Standing' : step > 0 ? 'Zooming in' : 'Zooming out')}
                        onHome={() => setPreset('gate')}
                        presets={PRESETS}
                        preset={preset}
                        onPreset={setPreset}
                    />
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                        {said}
                    </p>
                </Stack>
            }
        >
            <VideoPlayer src={`${street}#t=4`} preload="auto" title="Harbor gate" />
        </Split>
    )
}

/** Beside the camera it drives, saying what the camera is told: hold a direction or a zoom, or focus the pad and hold an arrow key. */
export const Beside: StoryObj = { render: () => <BesideStory /> }
