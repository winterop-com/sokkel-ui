import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DetectionOverlay, type DetectionLook } from '@winterop-com/sokkel-ui/DetectionOverlay'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { STREET_DETECTIONS } from '../fixtures/detections'
import street from '../media/fixtures/street.webm?url'

/**
 * What a finder sees in a video, drawn over the picture: each detection's box with what it is and
 * how sure the finder was, in its affiliation's color, moving with the video frame by frame. The
 * clip is a drawn street; the detections are the app's, handed in as samples.
 */
const meta: Meta = { title: 'Patterns/Detection overlay' }
export default meta

const LOOKS: { look: DetectionLook; caption: string }[] = [
    { look: 'box', caption: 'box' },
    { look: 'brackets', caption: 'brackets' },
    { look: 'marker', caption: 'marker' },
]

/** The three looks side by side on the same frame, four seconds in: the whole box, its corners, and a dot for dense scenes. */
export const Looks: StoryObj = {
    render: () => (
        <Columns count={3} min="sm" className="p-6">
            {LOOKS.map(({ look, caption }) => (
                <Stack key={look} gap="sm">
                    <VideoPlayer
                        src={`${street}#t=4`}
                        preload="auto"
                        title={`Street, ${caption}`}
                        picture={<DetectionOverlay detections={STREET_DETECTIONS} time={4} look={look} />}
                    />
                    <p className="text-xs text-muted-foreground">{caption}</p>
                </Stack>
            ))}
        </Columns>
    ),
}

function FollowingStory({ look }: { look: DetectionLook }) {
    const [selected, setSelected] = useState<string | undefined>('p-23')
    return (
        <div className="p-6">
            <VideoPlayer
                src={`${street}#t=4`}
                preload="auto"
                title="Street"
                picture={
                    <DetectionOverlay detections={STREET_DETECTIONS} look={look} trail={2} ids selected={selected} onSelect={setSelected} />
                }
            />
        </div>
    )
}

/**
 * The overlay inside the player, following the video: play it and the boxes move with what they
 * hold, each trailing two seconds of its path. One walker is selected and the rest step back; a
 * press picks another, or lets the selected one go. The walker behind the vehicle is lost for a
 * second and found again.
 */
export const Following: StoryObj = { render: () => <FollowingStory look="box" /> }

/** The same with corner brackets, which hide less of who is inside. */
export const FollowingBrackets: StoryObj = { name: 'Following, brackets', render: () => <FollowingStory look="brackets" /> }
