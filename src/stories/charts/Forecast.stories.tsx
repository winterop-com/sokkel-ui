import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ChartSpec } from '@winterop-com/sokkel-ui-charts/kinds'
import { FORECAST_START, HARBOR_ORDER_WEEKS, ORDER_WEEKS } from '../fixtures/orderForecast'
import { Framed, Ground } from './Ground'

/**
 * A forecast against the truth, drawn as a `fan`: the median through nested bands of percentiles,
 * the weeks observed before as a line and the weeks observed since as dots, and a mark where the
 * forecast starts. Tidevann's orders imported per week by import-orders.
 */
const meta: Meta = { title: 'Charts/Forecast' }
export default meta

const BANDS = [
    { low: 'q10', high: 'q90' },
    { low: 'q25', high: 'q75' },
] as const

const HARBOR: ChartSpec = {
    rows: HARBOR_ORDER_WEEKS,
    x: 'week',
    y: 'median',
    bands: BANDS,
    points: 'observed',
    history: 'observed',
    marks: [{ x: FORECAST_START, label: 'Forecast' }],
}

const BY_PROJECT: ChartSpec = { ...HARBOR, rows: ORDER_WEEKS, series: 'project' }

const UNBRIDGED: ChartSpec = { ...HARBOR, bridge: false }

/**
 * Harbor's orders imported per week: twelve weeks observed, then eight forecast as the median
 * within the 25th to 75th and the 10th to 90th percentiles, with the four weeks observed since as
 * dots against it. The median is drawn from the last week observed, so the two read as one line.
 */
export const Fan: StoryObj = {
    render: () => (
        <Ground title="Orders" columns={1}>
            <Framed
                kind="fan"
                spec={HARBOR}
                title="Orders imported"
                subtitle="per week, import-orders in harbor"
                label="Orders imported per week by import-orders in harbor, observed and forecast"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}

/** The same forecast for harbor and larkspur, a fan each in its project's color, against the weeks observed. */
export const TwoProjects: StoryObj = {
    name: 'Two projects',
    render: () => (
        <Ground title="Orders" columns={1}>
            <Framed
                kind="fan"
                spec={BY_PROJECT}
                title="Orders imported"
                subtitle="per week, import-orders by project"
                label="Orders imported per week by import-orders in harbor and larkspur, observed and forecast"
                bodyClassName="h-80"
            />
        </Ground>
    ),
}

/** The forecast with `bridge` off: the line observed stops at the week before, and the median starts on its own at the first week forecast. */
export const NoBridge: StoryObj = {
    name: 'No bridge',
    render: () => (
        <Ground title="Orders" columns={1}>
            <Framed
                kind="fan"
                spec={UNBRIDGED}
                title="Orders imported"
                subtitle="per week, import-orders in harbor"
                label="Orders imported per week by import-orders in harbor, observed and forecast, the forecast not joined to the weeks before"
                bodyClassName="h-72"
            />
        </Ground>
    ),
}
