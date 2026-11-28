import type { Meta, StoryObj } from '@storybook/react-vite'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Meter, MeterLabel, MeterValue } from '@winterop-com/sokkel-ui/primitives/meter'
import { Surface } from '@winterop-com/sokkel-ui/Section'

/**
 * How much of something there is on a known scale, as a bar: a disk filled, a quota used, a battery
 * left. With bounds the bar takes a tone; for work under way, use Progress.
 */
const meta: Meta = { title: 'Primitives/Display/Meter', parameters: { frame: 'column' } }
export default meta

/** A bar with no bounds, then the worker's disk at three fills against bounds of 70 and 90 percent: good, the warning tone, critical. */
export const Tones: StoryObj = {
    render: () => (
        <Stack gap="xl" className="max-w-md">
            <Meter value={42}>
                <MeterLabel>Rows kept</MeterLabel>
                <MeterValue />
            </Meter>
            {[46, 82, 96].map((value) => (
                <Meter key={value} value={value} low={70} high={90}>
                    <MeterLabel>Disk on worker</MeterLabel>
                    <MeterValue />
                </Meter>
            ))}
        </Stack>
    ),
}

/** A scale whose full end is the good one, a sensor's battery, with the value written in its own unit. */
export const HighIsGood: StoryObj = {
    name: 'High is good',
    render: () => (
        <Stack gap="xl" className="max-w-md">
            {[88, 34, 12].map((value) => (
                <Meter key={value} value={value} low={20} high={50} optimum="high">
                    <MeterLabel>Battery</MeterLabel>
                    <MeterValue>{() => `${String(value)}%`}</MeterValue>
                </Meter>
            ))}
        </Stack>
    ),
}

/** The api's quota for the month in a card, counted in requests. */
export const Quota: StoryObj = {
    render: () => (
        <Surface pad className="max-w-md">
            <Meter value={812_000} max={1_000_000} low={750_000} high={950_000}>
                <MeterLabel>Requests this month</MeterLabel>
                <MeterValue>{() => '812,000 of 1,000,000'}</MeterValue>
            </Meter>
        </Surface>
    ),
}
