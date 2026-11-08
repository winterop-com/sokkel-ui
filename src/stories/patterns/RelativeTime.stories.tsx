import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Specimen } from '../fixtures/Specimen'

/** A time said relative to now, the exact instant on hover and focus. */
const meta: Meta = { title: 'Patterns/Relative time', parameters: { frame: 'column' } }
export default meta

const NOW = new Date('2026-11-04T14:02:00Z')
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(NOW.getTime() - ms)

/** From under a minute to over a year, past and ahead, each in the largest whole unit. */
export const Distances: StoryObj = {
    render: () => (
        <Stack gap="sm" align="start">
            {[20_000, 3 * MINUTE, 2 * HOUR, DAY, 4 * DAY, 15 * DAY, 70 * DAY, 400 * DAY, -45 * MINUTE, -2 * DAY].map((ms) => (
                <RelativeTime key={ms} date={ago(ms)} now={NOW} timeZone="UTC" />
            ))}
        </Stack>
    ),
}

/** The same distance in Intl's three lengths, and in other locales. */
export const Lengths: StoryObj = {
    render: () => (
        <Stack gap="md">
            <Specimen label="long">
                <RelativeTime date={ago(3 * MINUTE)} now={NOW} timeZone="UTC" />
            </Specimen>
            <Specimen label="short">
                <RelativeTime date={ago(3 * MINUTE)} now={NOW} timeZone="UTC" length="short" />
            </Specimen>
            <Specimen label="narrow">
                <RelativeTime date={ago(3 * MINUTE)} now={NOW} timeZone="UTC" length="narrow" />
            </Specimen>
            <Specimen label="locale nb">
                <RelativeTime date={ago(DAY)} now={NOW} timeZone="UTC" locale="nb" />
            </Specimen>
            <Specimen label="locale de">
                <RelativeTime date={ago(2 * HOUR)} now={NOW} timeZone="UTC" locale="de" />
            </Specimen>
        </Stack>
    ),
}

/** In a run's line of facts, as a list says when each run finished. */
export const InLine: StoryObj = {
    name: 'In a line',
    render: () => (
        <MetaLine
            items={['nightly-export', 'succeeded', <RelativeTime key="at" date={ago(12 * MINUTE)} now={NOW} timeZone="UTC" />, 'by grace']}
        />
    ),
}
