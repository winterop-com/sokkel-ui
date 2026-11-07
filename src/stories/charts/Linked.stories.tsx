import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '../../components/chart/kinds'
import { RAIN_DAYS } from '../fixtures/rainDays'
import { Framed, Ground } from './Ground'

/**
 * Panels on one shared axis, drawn from five months of rain and river flow at Tidevann's gauging
 * sites: `Chart` with the linked kind stacks a panel per field, or per region, each on its own
 * scale. Pointing at a day points at it in every panel, and the slider under them, a drag across
 * them, or a pinch zooms them together. A panel can hang from its top, as the rain does over the
 * flow it feeds.
 */
const meta: Meta = { title: 'Charts/Linked' }
export default meta

const SOUTH_ASIA = RAIN_DAYS.filter((row) => row.region === 'South Asia')
const EAST_AFRICA = RAIN_DAYS.filter((row) => row.region === 'East Africa')
const COLORS = { rainfall: 'chart-2', flow: 'kind-teal', runs: 'chart-4' }

const RAIN_AND_FLOW: ChartSpec = {
    rows: SOUTH_ASIA,
    x: 'date',
    y: ['rainfall', 'flow'],
    unit: [' mm', ' m³/s'],
    colors: COLORS,
    fill: 'gradient',
    panels: { rainfall: { mark: 'bar', hang: true }, flow: { mark: 'area', weight: 2 } },
}
const RAIN_FLOW_AND_RUNS: ChartSpec = {
    rows: EAST_AFRICA,
    x: 'date',
    y: ['rainfall', 'flow', 'runs'],
    unit: [' mm', ' m³/s', ''],
    colors: COLORS,
    fill: 'gradient',
    panels: { rainfall: { mark: 'bar', hang: true }, flow: { mark: 'area', weight: 2 }, runs: { mark: 'bar' } },
}
const FLOW_BY_REGION: ChartSpec = {
    rows: RAIN_DAYS,
    x: 'date',
    y: 'flow',
    series: 'region',
    unit: ' m³/s',
    zoom: ['Aug 1', 'Aug 31'],
}

/** South Asia's monsoon: the daily rain hanging from the top over the river's flow, which rises after it and falls away slowly. */
export const RainAndFlow: StoryObj = {
    name: 'Rain and flow',
    render: () => (
        <Ground title="Rivers, June to October" columns={1}>
            <Framed
                kind="linked"
                spec={RAIN_AND_FLOW}
                title="Rain and flow"
                subtitle="South Asia, per day"
                label="Daily rainfall over the river's flow in South Asia"
                bodyClassName="h-80"
            />
        </Ground>
    ),
}

/** East Africa's short rains arriving in October: the rain, the flow it raises, and the import runs the new readings start. */
export const ThreePanels: StoryObj = {
    name: 'Three panels',
    render: () => (
        <Ground title="Rivers, June to October" columns={1}>
            <Framed
                kind="linked"
                spec={RAIN_FLOW_AND_RUNS}
                title="Rain, flow and runs"
                subtitle="East Africa, per day"
                label="Daily rainfall, river flow and import runs in East Africa"
                bodyClassName="h-96"
            />
        </Ground>
    ),
}

/** Each region's river in a panel of its own, on its own scale, opened zoomed in to August. */
export const Zoomed: StoryObj = {
    render: () => (
        <Ground title="Rivers, June to October" columns={1}>
            <Framed
                kind="linked"
                spec={FLOW_BY_REGION}
                title="Flow by region"
                subtitle="per day, August in view"
                label="Each region's river flow per day, zoomed in to August"
                bodyClassName="h-96"
            />
        </Ground>
    ),
}
