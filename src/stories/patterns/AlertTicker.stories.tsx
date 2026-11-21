import type { Meta, StoryObj } from '@storybook/react-vite'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import { AlertTicker } from '@winterop-com/sokkel-ui/AlertTicker'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { WALL_ALERTS } from '../fixtures/wall'

const meta: Meta = { title: 'Patterns/Alert ticker', parameters: { frame: 'padded' } }
export default meta

/** One alert: its dot in its tone, its words and when it happened. With one alert the ticker never moves and says no place. */
export const One: StoryObj = {
    render: () => <AlertTicker label="Alerts" items={WALL_ALERTS.slice(1, 2)} />,
}

/** Each tone held still, one strip an alert: critical (its dot pulsing), warning, news, good and quiet (a hollow dot), with its place among the five at the end. */
export const Tones: StoryObj = {
    render: () => (
        <Stack gap="sm">
            {WALL_ALERTS.map((alert, index) => (
                <AlertTicker key={alert.id} label="Alerts" items={WALL_ALERTS} index={index} paused />
            ))}
        </Stack>
    ),
}

/** The ticker running: it starts at the first alert and moves to the next every five seconds, the new one sliding in, and holds while the pointer is over it. */
export const Running: StoryObj = {
    render: () => <AlertTicker label="Alerts" items={WALL_ALERTS} />,
}

/** Alerts that are buttons, with an icon before the words: pressing the one shown opens it, said under the strip. */
export const Press: StoryObj = {
    render: function Render() {
        const [opened, setOpened] = useState<string>()
        return (
            <Stack gap="sm">
                <AlertTicker
                    label="Alerts"
                    items={WALL_ALERTS.map((alert) =>
                        alert.tone === 'critical' ? { ...alert, icon: <TriangleAlert aria-hidden /> } : alert,
                    )}
                    paused
                    onSelect={setOpened}
                />
                <p className="text-sm text-muted-foreground">{opened === undefined ? 'Nothing opened yet' : `Opened ${opened}`}</p>
            </Stack>
        )
    },
}

/** A strip too narrow for its words: the alert is cut with an ellipsis, and its time and place stay whole. */
export const Narrow: StoryObj = {
    render: () => <AlertTicker className="max-w-xs" label="Alerts" items={WALL_ALERTS} paused />,
}

/** No alerts: the strip keeps its height and says so. */
export const Empty: StoryObj = {
    render: () => <AlertTicker label="Alerts" items={[]} />,
}
