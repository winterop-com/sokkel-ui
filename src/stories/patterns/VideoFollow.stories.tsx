import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DetectionOverlay } from '@winterop-com/sokkel-ui/DetectionOverlay'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { VideoFollow } from '@winterop-com/sokkel-ui/VideoFollow'
import { STREET_DETECTIONS } from '../fixtures/detections'
import street from '../media/fixtures/street.webm?url'

/**
 * A video's view kept on one detection, as a map follows one track: the player comes in on the
 * part of the picture around it and moves with it, the boxes moving with the picture, and a banner
 * in the corner says what is followed, with a button that lets it go.
 */
const meta: Meta = { title: 'Patterns/Video follow' }
export default meta

function FollowStory({ start }: { start: number }) {
    const [followed, setFollowed] = useState<string | undefined>('p-23')
    const detection = STREET_DETECTIONS.find((one) => one.id === followed)
    return (
        <div className="p-6">
            <VideoPlayer
                src={`${street}#t=${String(start)}`}
                preload="auto"
                title="Street"
                picture={<DetectionOverlay detections={STREET_DETECTIONS} ids selected={followed} onSelect={setFollowed} />}
                overlay={
                    detection === undefined ? undefined : <VideoFollow detection={detection} onRelease={() => setFollowed(undefined)} />
                }
            />
        </div>
    )
}

/**
 * Following one walker, four seconds in: the view holds three of its heights around it. Play it and
 * the view moves with the walker; press another box to follow that one, or the banner's button to
 * see the whole street again.
 */
export const Following: StoryObj = { render: () => <FollowStory start={4} /> }

/**
 * Five seconds in, the walker is behind the vehicle and the finder has lost it: the view holds where
 * it was last seen and the banner says so, until it is found again.
 */
export const Lost: StoryObj = { render: () => <FollowStory start={5.2} /> }
