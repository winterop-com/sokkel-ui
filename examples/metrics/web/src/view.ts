import type { TimeRangeValue } from '@winterop-com/sokkel-ui/dashboard/TimeRange'

import type { Zone } from './query'
import type { Variables } from './source'

/** What a dashboard is looking at and how it moves, shared by the dashboard and the panel editor. */
export interface View {
    range: TimeRangeValue
    vars: Variables
    /** Seconds between refreshes; 0 is off. */
    refresh: number
    paused: boolean
    zone: Zone
    /** The second the panels are drawn up to. */
    at: number
    refreshing: boolean
    refreshNow: () => void
    setRange: (range: TimeRangeValue) => void
    setVariables: (vars: Variables) => void
    setRefresh: (seconds: number) => void
    setPaused: (paused: boolean) => void
}
