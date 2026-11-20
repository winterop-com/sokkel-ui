import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { PlaybackTimeline } from '@winterop-com/sokkel-ui/PlaybackTimeline'
import { WATCH_ACTIVITY, WATCH_NOW } from '../fixtures/watch'

const meta: Meta = { title: 'Patterns/Playback timeline', parameters: { frame: 'padded' } }
export default meta

const HOUR = 3_600_000

function Timeline({ start = null, activity = true, span = 6 }: { start?: number | null; activity?: boolean; span?: number }) {
    const [value, setValue] = useState<number | null>(start)
    return (
        <PlaybackTimeline
            label="Harbor watch"
            from={WATCH_NOW - span * HOUR}
            to={WATCH_NOW}
            value={value}
            onValueChange={setValue}
            activity={activity ? WATCH_ACTIVITY : undefined}
            timeZone="UTC"
        />
    )
}

/** Live: the playhead at the live edge over six hours of activity; drag back, step, or press the axis to look back. */
export const Live: StoryObj = { render: () => <Timeline /> }

/** Played back to two hours ago: the time it shows in the readout, the activity before it in the primary color, Live to return. */
export const PlayingBack: StoryObj = { name: 'Playing back', render: () => <Timeline start={WATCH_NOW - 2 * HOUR} /> }

/** Two days with no activity strip: the ticks name the day at midnight and the hours between. */
export const Days: StoryObj = { render: () => <Timeline start={WATCH_NOW - 30 * HOUR} activity={false} span={48} /> }
