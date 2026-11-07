import { useMemo, type ReactNode } from 'react'

import { Chart, chartLegend } from '../../components/chart/Chart'
import { ChartFrame } from '../../components/chart/ChartFrame'
import type { ChartKind, ChartSpec } from '../../components/chart/kinds'
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

/** A chart drawn from rows in its frame, with the frame's legend for the same spec and its file named for the title. */
export function Framed({
    kind,
    spec,
    title,
    subtitle,
    label,
    bodyClassName,
}: {
    kind: ChartKind
    spec: ChartSpec
    title: string
    subtitle?: string
    label: string
    /** The chart area's size, when the kind wants more room than a frame's default. */
    bodyClassName?: string
}) {
    const legend = useMemo(() => chartLegend(kind, spec), [kind, spec])
    return (
        <ChartFrame
            title={title}
            subtitle={subtitle}
            legend={legend}
            file={title.toLowerCase().replaceAll(' ', '-')}
            bodyClassName={bodyClassName}
        >
            {(state) => <Chart kind={kind} label={label} {...spec} {...state} />}
        </ChartFrame>
    )
}
