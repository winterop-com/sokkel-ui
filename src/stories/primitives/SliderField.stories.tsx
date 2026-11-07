import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '../../components/Layout'
import { SettingRow } from '../../components/SettingRow'
import { SliderField } from '../../components/SliderField'

const meta: Meta = { title: 'Primitives/Inputs/Slider field', parameters: { frame: 'column' } }
export default meta

/** The name and the value on a line above the slider. */
export const Plain: StoryObj = {
    render: function Render() {
        const [workers, setWorkers] = useState(4)
        return (
            <SliderField id="plain-workers" label="Workers" value={workers} onChange={setWorkers} min={1} max={16} className="max-w-sm" />
        )
    },
}

/** A unit after the value, a value written to one decimal, and a help line under each slider. */
export const Help: StoryObj = {
    name: 'With help',
    render: function Render() {
        const [delay, setDelay] = useState(250)
        const [ratio, setRatio] = useState(0.8)
        return (
            <Stack gap="xl" className="max-w-sm">
                <SliderField
                    id="help-delay"
                    label="Retry delay"
                    value={delay}
                    onChange={setDelay}
                    max={2000}
                    step={50}
                    unit="ms"
                    help="How long a failed step waits before it runs again."
                />
                <SliderField
                    id="help-ratio"
                    label="Pass ratio"
                    value={ratio}
                    onChange={setRatio}
                    max={1}
                    step={0.05}
                    format={(value) => value.toFixed(2)}
                    help="The share of rows the validate step needs to pass."
                />
            </Stack>
        )
    },
}

/** In a settings row, which names the setting, so the slider shows only its value beside it. */
export const Inline: StoryObj = {
    render: function Render() {
        const [delay, setDelay] = useState(500)
        return (
            <SettingRow
                className="max-w-2xl"
                title="Live update delay"
                description="How long a running job waits before its log is redrawn."
                control={
                    <SliderField
                        id="inline-delay"
                        label="Live update delay"
                        inline
                        value={delay}
                        onChange={setDelay}
                        max={2000}
                        step={100}
                        unit="ms"
                    />
                }
            />
        )
    },
}
