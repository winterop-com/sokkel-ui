import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { CameraWall, type Camera } from '@winterop-com/sokkel-ui/CameraWall'
import { DetectionOverlay } from '@winterop-com/sokkel-ui/DetectionOverlay'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { STREET_DETECTIONS } from '../fixtures/detections'
import clip from '../media/fixtures/clip.webm?url'
import street from '../media/fixtures/street.webm?url'

/**
 * Cameras side by side, as a watch room shows them: each feed with its name, its state and how many
 * things the finder sees in it, one taken large to watch closely with the rest still in view.
 */
const meta: Meta = { title: 'Patterns/Camera wall' }
export default meta

const CAMERAS: Camera[] = [
    { id: 'harbor-gate', name: 'Harbor gate', state: 'recording', src: `${street}#t=4`, detections: 3, alert: true },
    { id: 'harbor-quay', name: 'Harbor quay', state: 'live', src: `${clip}#t=6` },
    { id: 'juniper-yard', name: 'Juniper yard', state: 'live', src: `${street}#t=9`, detections: 1 },
    { id: 'juniper-dock', name: 'Juniper dock', state: 'connecting' },
    { id: 'larkspur-road', name: 'Larkspur road', state: 'offline' },
    { id: 'larkspur-lot', name: 'Larkspur lot', state: 'recording', src: `${clip}#t=18` },
]

/** Six cameras in every state: recording with one calling for a look, live, connecting and offline. Narrow the canvas and the wall takes columns away. */
export const Wall: StoryObj = {
    render: () => <CameraWall cameras={CAMERAS} playing={false} className="p-6" />,
}

function FocusedStory() {
    const [focused, setFocused] = useState<string | undefined>('harbor-gate')
    const cameras = CAMERAS.map((camera) =>
        camera.id === focused && camera.id === 'harbor-gate'
            ? {
                  ...camera,
                  picture: (
                      <VideoPlayer
                          src={`${street}#t=4`}
                          preload="auto"
                          title={camera.name}
                          picture={<DetectionOverlay detections={STREET_DETECTIONS} look="brackets" />}
                      />
                  ),
              }
            : camera,
    )
    return <CameraWall cameras={cameras} focused={focused} onFocusChange={setFocused} playing={false} className="p-6" />
}

/**
 * The gate camera taken large, first and two tiles across, drawn as a player with the finder's
 * boxes over it; the rest stay in view around it. Press another tile to take it large, or the large
 * one's button to put it back.
 */
export const Focused: StoryObj = { render: () => <FocusedStory /> }
