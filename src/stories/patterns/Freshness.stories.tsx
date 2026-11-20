import type { Meta, StoryObj } from '@storybook/react-vite'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Freshness } from '@winterop-com/sokkel-ui/Freshness'
import { WATCH_NOW } from '../fixtures/watch'

const meta: Meta = { title: 'Patterns/Freshness', parameters: { frame: 'padded' } }
export default meta

const SECOND = 1000
const MINUTE = 60 * SECOND

/** Each state against the watch's fixed now: live, a few seconds, a minute and more (quieter, stale), and past five minutes (lost, in the warning tone). */
export const States: StoryObj = {
    render: () => (
        <DescriptionList
            className="max-w-sm"
            items={[
                { term: 'Just in', value: <Freshness at={WATCH_NOW - 1 * SECOND} now={WATCH_NOW} /> },
                { term: 'Seconds', value: <Freshness at={WATCH_NOW - 12 * SECOND} now={WATCH_NOW} /> },
                { term: 'Stale', value: <Freshness at={WATCH_NOW - 2 * MINUTE} now={WATCH_NOW} /> },
                { term: 'Lost', value: <Freshness at={WATCH_NOW - 9 * MINUTE} now={WATCH_NOW} /> },
                { term: 'Hours', value: <Freshness at={WATCH_NOW - 3 * 60 * MINUTE} now={WATCH_NOW} /> },
                { term: 'Never', value: <Freshness at={null} now={WATCH_NOW} /> },
            ]}
        />
    ),
}

/** The thresholds an app sets for a slower feed: live for a minute, stale after ten, lost after half an hour. */
export const Thresholds: StoryObj = {
    render: () => (
        <DescriptionList
            className="max-w-sm"
            items={[
                {
                    term: '40 s',
                    value: (
                        <Freshness
                            at={WATCH_NOW - 40 * SECOND}
                            now={WATCH_NOW}
                            thresholds={{ live: MINUTE, stale: 10 * MINUTE, lost: 30 * MINUTE }}
                        />
                    ),
                },
                {
                    term: '12 min',
                    value: (
                        <Freshness
                            at={WATCH_NOW - 12 * MINUTE}
                            now={WATCH_NOW}
                            thresholds={{ live: MINUTE, stale: 10 * MINUTE, lost: 30 * MINUTE }}
                        />
                    ),
                },
                {
                    term: '45 min',
                    value: (
                        <Freshness
                            at={WATCH_NOW - 45 * MINUTE}
                            now={WATCH_NOW}
                            thresholds={{ live: MINUTE, stale: 10 * MINUTE, lost: 30 * MINUTE }}
                        />
                    ),
                },
            ]}
        />
    ),
}
