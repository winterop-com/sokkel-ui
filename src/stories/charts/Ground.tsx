import type { ReactNode } from 'react'

import type { LegendItem } from '../../components/chart/ChartLegend'
import { TidevannMark } from '../fixtures/TidevannMark'
import { TopBar } from '../../components/TopBar'
import { Columns, Stack } from '../../components/Layout'

/** The page a chart story sits on: Tidevann's mark and what the charts cover, then the charts in a grid. */
export function Ground({ title, columns = 2, children }: { title: string; columns?: 1 | 2; children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground md:p-6">
            <Stack>
                <TopBar mark={<TidevannMark />} trail={[{ label: 'Tidevann', href: '#' }, { label: title }]} />
                {columns === 2 ? (
                    <Columns count={2} min="xl" gap="md">
                        {children}
                    </Columns>
                ) : (
                    <Stack>{children}</Stack>
                )}
            </Stack>
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
