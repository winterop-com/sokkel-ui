import type { Meta, StoryObj } from '@storybook/react-vite'

import { ScoreTable, type ScoreColumn, type ScoreRow } from '../../components/dashboard/ScoreTable'
import { ThresholdLegend } from '../../components/dashboard/ThresholdLegend'
import type { Threshold } from '../../components/dashboard/thresholds'
import { JOB_MEASURES, MONTHS, SITES } from '../fixtures/scores'
import { Ground } from './Ground'

/**
 * Scorecards: rows against columns of periods or measures, each value colored by the band it falls
 * in, with the threshold scale's key beside them.
 */
const meta: Meta = { title: 'Charts/Scorecard' }
export default meta

const SUCCESS: Threshold[] = [{ color: 'critical' }, { value: 90, color: 'warning' }, { value: 97, color: 'good' }]
const BANDS = ['Behind', 'Close', 'On target']

const MONTH_COLUMNS: ScoreColumn[] = MONTHS.map((month) => ({ key: month, label: month }))

const SITE_ROWS: ScoreRow[] = SITES.map((entry) => ({
    key: entry.site,
    label: entry.site,
    group: entry.region,
    values: Object.fromEntries(MONTHS.map((month, index) => [month, entry.rates[index]])),
}))

const MEASURE_COLUMNS: ScoreColumn[] = [
    { key: 'success', label: 'Success', unit: '%', decimals: 1, thresholds: SUCCESS },
    {
        key: 'p90',
        label: 'p90',
        format: (value) => `${value.toFixed(1)}s`,
        thresholds: [{ color: 'good' }, { value: 30, color: 'warning' }, { value: 120, color: 'critical' }],
    },
    {
        key: 'failures',
        label: 'Failures',
        thresholds: [{ color: 'good' }, { value: 25, color: 'warning' }, { value: 100, color: 'critical' }],
    },
    {
        key: 'freshness',
        label: 'Freshness',
        unit: ' min',
        thresholds: [{ color: 'good' }, { value: 15, color: 'warning' }, { value: 60, color: 'critical' }],
    },
]

const JOB_ROWS: ScoreRow[] = JOB_MEASURES.map((entry) => ({
    key: entry.job,
    label: entry.job,
    values: { success: entry.success, p90: entry.p90, failures: entry.failures, freshness: entry.freshness },
}))

/** Each site's monthly success rate, grouped by region, tinted by its band and marked up or down against the month before. */
export const Periods: StoryObj = {
    render: () => (
        <Ground title="Success rate by site, first half" columns={1}>
            <ScoreTable columns={MONTH_COLUMNS} rows={SITE_ROWS} thresholds={SUCCESS} unit="%" decimals={1} trend nameHeader="Site" />
            <ThresholdLegend thresholds={SUCCESS} labels={BANDS} unit="%" noData />
        </Ground>
    ),
}

/** Each job on four measures, every column on its own scale, the band shown as a dot beside the value. */
export const Measures: StoryObj = {
    render: () => (
        <Ground title="Jobs, this week" columns={1}>
            <ScoreTable columns={MEASURE_COLUMNS} rows={JOB_ROWS} fill="dot" nameHeader="Job" />
        </Ground>
    ),
}

/** The monthly scorecard with its cells filled solid by band, and the scale's key drawn as one strip. */
export const Solid: StoryObj = {
    render: () => (
        <Ground title="Success rate by site, first half" columns={1}>
            <ScoreTable
                columns={MONTH_COLUMNS}
                rows={SITE_ROWS}
                thresholds={SUCCESS}
                unit="%"
                decimals={1}
                fill="solid"
                nameHeader="Site"
            />
            <ThresholdLegend thresholds={SUCCESS} labels={BANDS} unit="%" layout="bar" title="Success rate" className="max-w-md" />
        </Ground>
    ),
}
