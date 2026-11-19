/** The words a chart writes itself, apart from the builders, so a chart asks for them before any builder loads. */
import type { WordsPart } from '@winterop-com/sokkel-ui/lib/words'

/** The words a chart writes itself, beside the names its rows give. */
export interface ChartWords {
    count: string
    total: string
    rise: string
    fall: string
    change: string
    low: string
    lower: string
    median: string
    upper: string
    high: string
    outlier: string
    ofFirst: string
    target: string
    observed: string
    /** The one group a scatter or a parallel chart draws without `series`. */
    all: string
    /** Between the ends of a range in a tooltip, `10 to 90`. */
    to: string
    /** The figure a candlestick's category opens at. */
    open: string
    /** The figure a candlestick's category closes at. */
    close: string
    /** A moving average's name, before the categories it spans: `Average 5`. */
    average: string
}

export const CHART_WORDS: ChartWords = {
    count: 'Count',
    total: 'Total',
    rise: 'Rise',
    fall: 'Fall',
    change: 'Change',
    low: 'Low',
    lower: 'Lower quartile',
    median: 'Median',
    upper: 'Upper quartile',
    high: 'High',
    outlier: 'Outlier',
    ofFirst: 'of first',
    target: 'Target',
    observed: 'Observed',
    all: 'All',
    to: 'to',
    open: 'Open',
    close: 'Close',
    average: 'Average',
}

/** Where a catalog holds the words a chart writes itself. */
export const CHART_PART: WordsPart<ChartWords> = { id: 'chart', words: CHART_WORDS }
