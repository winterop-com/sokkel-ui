import type { Meta, StoryObj } from '@storybook/react-vite'

import { ChartFrame } from '../../components/chart/ChartFrame'
import { EChart } from '../../components/chart/EChart'
import { Columns } from '../../components/Layout'
import { Ground } from './Ground'
import { gauge } from './options'

/** Gauges on EChart: one value from 0 to 100 on an arc colored by where it falls among thresholds. */
const meta: Meta = { title: 'Charts/Gauge' }
export default meta

const HIGH_IS_GOOD: [number, string][] = [
    [0, 'status-failed'],
    [90, 'warning'],
    [97, 'status-succeeded'],
]
const LOW_IS_GOOD: [number, string][] = [
    [0, 'status-succeeded'],
    [70, 'warning'],
    [90, 'status-failed'],
]

const GAUGES = [
    { title: 'Success rate', option: gauge('today', 98.4, HIGH_IS_GOOD) },
    { title: 'Worker load', option: gauge('worker-3', 76, LOW_IS_GOOD) },
    { title: 'Disk used', option: gauge('scheduler', 93, LOW_IS_GOOD) },
]

/** Three gauges in their threshold colors: green, amber and red. */
export const Thresholds: StoryObj = {
    render: () => (
        <Ground title="Health, now" columns={1}>
            <Columns count={3} min="md" gap="md">
                {GAUGES.map((entry) => (
                    <ChartFrame
                        key={entry.title}
                        title={entry.title}
                        file={entry.title.toLowerCase().replace(' ', '-')}
                        bodyClassName="h-40"
                    >
                        {(state) => <EChart option={entry.option} label={entry.title} {...state} />}
                    </ChartFrame>
                ))}
            </Columns>
        </Ground>
    ),
}
