import { createContext, useContext, useEffect, useMemo } from 'react'

import type { ChartKind, ChartSpec } from './kinds'

/** What a chart in a `ChartFrame` draws, for the frame's data view: its kind, its spec, and the field a grid splits it by. */
export interface FrameData {
    kind: ChartKind
    spec: ChartSpec
    facet?: string
}

/** Where a chart in a frame says what it draws; null outside a frame. */
export const FrameDataContext = createContext<((data: FrameData | null) => void) | null>(null)

/** Tells the frame around the chart what it draws, while it is drawn. Keep `spec` stable, as `useSpec` keeps it. */
export function useFrameData(kind: ChartKind, spec: ChartSpec, facet?: string): void {
    const tell = useContext(FrameDataContext)
    const data = useMemo(() => ({ kind, spec, facet }), [kind, spec, facet])
    useEffect(() => {
        if (tell === null) return
        tell(data)
        return () => tell(null)
    }, [tell, data])
}
