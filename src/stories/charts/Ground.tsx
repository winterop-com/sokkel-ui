import type { ReactNode } from 'react'

import type { LegendItem } from '../../components/chart/ChartLegend'
import { cn } from '../../lib/cn'
import { TidevannMark } from '../fixtures/TidevannMark'

/** The page a chart story sits on: Tidevann's mark and what the charts cover, then the charts in a grid. */
export function Ground({ title, columns = 2, children }: { title: string; columns?: 1 | 2; children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground md:p-6">
            <div className="flex flex-col gap-3">
                <header className="flex items-center gap-2 text-sm">
                    <TidevannMark className="size-4 text-primary" />
                    <span className="font-medium">Tidevann</span>
                    <span className="text-muted-foreground">{title}</span>
                </header>
                <div className={cn('grid gap-3', columns === 2 && 'lg:grid-cols-2')}>{children}</div>
            </div>
        </div>
    )
}

/** A series a story draws: its name in the chart and the token it is drawn in. */
export interface StorySeries {
    name: string
    token: string
    values?: readonly number[]
}

/** The legend items for a story's series, colored by the same tokens as the chart. */
export const legendOf = (series: readonly StorySeries[]): LegendItem[] =>
    series.map((entry) => ({ key: entry.name, label: entry.name, color: `var(--${entry.token})`, values: entry.values }))
