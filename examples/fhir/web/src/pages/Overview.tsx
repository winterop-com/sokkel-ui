import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { chartLegend } from '@winterop-com/sokkel-ui-charts/chart-legend'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useMemo } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { conceptText } from '../data/model'
import { history, resources, SERVER, type Version } from '../data/server'
import { TYPE_NAMES } from '../data/types'
import { NUMBER, useFoot, when } from '../ui'

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' })

const CHANGE_COLUMNS: DataColumn<Version>[] = [
    { id: 'key', header: 'Resource', width: 'minmax(12rem,1fr)', cell: (row) => <span className="font-mono">{row.key}</span> },
    { id: 'version', header: 'Version', width: '5rem', align: 'end', cell: (row) => row.versionId },
    { id: 'change', header: 'Change', width: '7rem', cell: (row) => <StatusChip status={row.change} /> },
    { id: 'by', header: 'By', width: '6rem', cell: (row) => row.by },
    { id: 'at', header: 'When', width: '11rem', cell: (row) => when(row.at) },
]

/** What the server holds, the vital signs measured month by month, and the latest changes. */
export function Overview() {
    const { rows, error } = useCollection(resources)
    const { rows: versions } = useCollection(history)
    const all = rows ?? []
    const counts = TYPE_NAMES.map((type) => ({ type, count: all.filter((row) => row.type === type).length }))
    const recent = [...(versions ?? [])].sort((left, right) => right.at.localeCompare(left.at)).slice(0, 10)
    useFoot(`${NUMBER.format(all.length)} resources on ${SERVER.address}`, undefined, [all.length])

    const measured = useMemo(() => {
        const byMonth = new Map<string, { month: string; at: string; vital: string; count: number }>()
        for (const row of rows ?? []) {
            if (row.type !== 'Observation') continue
            const at = String(row.resource.effectiveDateTime ?? '').slice(0, 7)
            if (at === '') continue
            const vital = conceptText(row.resource.code)
            const key = `${at}|${vital}`
            const month = MONTH.format(new Date(`${at}-15T12:00:00Z`))
            const found = byMonth.get(key) ?? { month, at, vital, count: 0 }
            found.count += 1
            byMonth.set(key, found)
        }
        return [...byMonth.values()].sort((left, right) => left.at.localeCompare(right.at))
    }, [rows])
    const spec = { rows: measured, x: 'month', y: 'count', series: 'vital', stack: 'stacked' as const }
    const legend = useMemo(() => chartLegend('bar', spec), [measured])

    return (
        <Page>
            <PageHeader
                title="Overview"
                description={`The FHIR server at ${SERVER.address}, ${SERVER.version}: what it holds, what was measured, and what changed last.`}
            />
            <PageState loading={rows === undefined && error === undefined} error={error}>
                <Stack gap="section">
                    <Columns count={4} min="xs">
                        {counts
                            .filter((one) => ['Patient', 'Observation', 'Condition', 'Library'].includes(one.type))
                            .map((one) => (
                                <Stat
                                    key={one.type}
                                    variant="tile"
                                    label={one.type}
                                    value={NUMBER.format(one.count)}
                                    onSelect={() => go(one.type === 'Library' ? '/cql' : `/resources/${one.type}`)}
                                />
                            ))}
                    </Columns>
                    <ChartFrame title="Vital signs measured" subtitle="per month, by measurement" legend={legend} bodyClassName="h-64">
                        {(state) => <Chart kind="bar" label="Vital signs measured per month by measurement" {...spec} {...state} />}
                    </ChartFrame>
                    <Section title="Latest changes">
                        <DataTable
                            columns={CHANGE_COLUMNS}
                            rows={recent}
                            rowKey={(row) => row.id}
                            onOpen={(row) =>
                                go(
                                    row.type === 'Library' && row.change !== 'delete'
                                        ? `/cql/${row.key.split('/')[1] ?? ''}`
                                        : `/resources/${row.key}`,
                                )
                            }
                            chevron
                            bar={false}
                            minWidth="36rem"
                        />
                    </Section>
                </Stack>
            </PageState>
        </Page>
    )
}
