import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'

import { DetectionOverlay } from '@winterop-com/sokkel-ui/DetectionOverlay'
import { DetectionTimeline, type TimelineSpan } from '@winterop-com/sokkel-ui/DetectionTimeline'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { detectionSpans } from '@winterop-com/sokkel-ui/lib/detections'
import { VideoPlayer, type VideoPlayerHandle } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { STREET_DETECTIONS } from '../fixtures/detections'
import street from '../media/fixtures/street.webm?url'

/**
 * Where things were seen over a video, as a playback bar marked with them: alerts on a lane of their
 * own, a lane per kind of thing, a playhead, and presses that seek the player.
 */
const meta: Meta = { title: 'Patterns/Detection timeline' }
export default meta

/** The street's walkers and vehicle as spans, the unknown walker's raised as an alert. */
const SPANS: TimelineSpan[] = detectionSpans(STREET_DETECTIONS).map((span) => ({ ...span, alert: span.affiliation === 'unknown' }))

/** The street's twelve seconds: the alert lane, then people and vehicles, with the playhead four seconds in. The walker lost behind the vehicle shows as two stretches. */
export const Timeline: StoryObj = {
    render: () => <DetectionTimeline spans={SPANS} duration={12} time={4} className="p-6" />,
}

function WithPlayerStory() {
    const player = useRef<VideoPlayerHandle>(null)
    const [time, setTime] = useState(4)
    return (
        <Stack gap="md" className="p-6">
            <VideoPlayer
                ref={player}
                src={`${street}#t=4`}
                preload="auto"
                title="Street"
                onTime={setTime}
                picture={<DetectionOverlay detections={STREET_DETECTIONS} />}
            />
            <DetectionTimeline spans={SPANS} duration={12} time={time} onSeek={(seconds) => player.current?.seekTo(seconds)} />
        </Stack>
    )
}

/** Under the player it drives: press a span to go to its start, or a lane anywhere to go to that moment; the playhead follows the video. */
export const WithPlayer: StoryObj = { name: 'With player', render: () => <WithPlayerStory /> }
