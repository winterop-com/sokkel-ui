import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { Columns, Fill, Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PeriodPicker } from '@winterop-com/sokkel-ui/PeriodPicker'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SubNav } from '@winterop-com/sokkel-ui/SubNav'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { Tree } from '@winterop-com/sokkel-ui/Tree'
import { Chart } from '@winterop-com/sokkel-ui-charts/Chart'
import { ChartFrame } from '@winterop-com/sokkel-ui-charts/ChartFrame'
import { useMemo, useState } from 'react'
import { go } from 'tidevann-shared/router'

import {
    childrenOf,
    DATA_ELEMENTS,
    LEVELS,
    orgUnit,
    ORG_UNIT_TREE,
    pathOf,
    PERIODS,
    periodLabel,
    ROOT,
    sitesUnder,
    TODAY,
    type OrgUnit,
} from '../data/metadata'
import { dataValue, reports } from '../data/values'
import { figure, NUMBER, useFoot } from '../ui'

interface ValueRow {
    id: string
    element: string
    combo: string
    value: number | null
}

/** The organization unit hierarchy in a tree, the chosen unit's facts, its data values for a month and its reporting over the year. */
export function OrgUnits({ selected: given }: { selected?: string }) {
    const unit = orgUnit(given) ?? (orgUnit(ROOT) as OrgUnit)
    const [query, setQuery] = useState('')
    const [period, setPeriod] = useState(PERIODS[PERIODS.length - 1])
    const path = pathOf(unit.id)
    const sites = sitesUnder(unit.id)
    const reported = reports(unit.id, period)
    useFoot(path.map((one) => one.name).join(' / '), undefined, [unit.id])

    const values: ValueRow[] = useMemo(
        () =>
            DATA_ELEMENTS.flatMap((element) =>
                element.categoryCombo.combos.map((combo) => ({
                    id: `${element.id}.${combo.id}`,
                    element: element.name,
                    combo: combo.name,
                    value: dataValue(element.id, combo.id, unit.id, period),
                })),
            ),
        [unit.id, period],
    )
    const year = useMemo(
        () =>
            PERIODS.map((one) => {
                const { actual, expected } = reports(unit.id, one)
                return { month: periodLabel(one), rate: expected === 0 ? null : Math.round((actual / expected) * 1000) / 10 }
            }),
        [unit.id],
    )

    const columns: DataColumn<ValueRow>[] = [
        {
            id: 'element',
            header: 'Data element',
            width: 'minmax(12rem,1.4fr)',
            cell: (one) => one.element,
            sortValue: (one) => one.element,
            stack: 'lead',
        },
        {
            id: 'combo',
            header: 'Category option combo',
            width: 'minmax(9rem,1fr)',
            cell: (one) => (one.combo === 'default' ? <span className="text-muted-foreground">default</span> : one.combo),
        },
        {
            id: 'value',
            header: 'Value',
            width: '8rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{figure(one.value)}</span>,
            sortValue: (one) => one.value ?? -1,
        },
    ]

    return (
        <Row gap="none" align="stretch" className="h-full min-h-0">
            <SubNav label="Hierarchy" search={<SearchField value={query} onChange={setQuery} placeholder="Search" />} defaultSize={264}>
                <Tree
                    label="Hierarchy"
                    nodes={ORG_UNIT_TREE}
                    selected={[unit.id]}
                    onSelect={(ids) => go(ids[0] === undefined || ids[0] === ROOT ? '/org-units' : `/org-units/${ids[0]}`)}
                    defaultExpanded={path.map((one) => one.id).concat(ORG_UNIT_TREE[0].children?.map((one) => one.id) ?? [])}
                    query={query}
                />
            </SubNav>
            <Fill>
                <Page>
                    <PageHeader
                        title={unit.name}
                        code={unit.id}
                        description={`${LEVELS[unit.level]} at level ${String(unit.level)}. Data is entered at sites; above a site, every value is the sum of the sites under it.`}
                        actions={<ApiLink path={`/api/organisationUnits/${unit.id}`} />}
                    />
                    <Columns count={2} min="lg" gap="inspector" align="start">
                        <Section title="Facts">
                            <DescriptionList
                                termWidth="7rem"
                                items={[
                                    { term: 'Code', value: unit.code, code: true },
                                    { term: 'Level', value: `${String(unit.level)}, ${LEVELS[unit.level]}` },
                                    {
                                        term: 'Path',
                                        value: (
                                            <span>
                                                {path.map((one, index) => (
                                                    <span key={one.id}>
                                                        {index > 0 && ' / '}
                                                        {one.id === unit.id ? (
                                                            one.name
                                                        ) : (
                                                            <TextLink href={`#/org-units/${one.id}`}>{one.name}</TextLink>
                                                        )}
                                                    </span>
                                                ))}
                                            </span>
                                        ),
                                    },
                                    ...(unit.level < 4
                                        ? [
                                              {
                                                  term: 'Under it',
                                                  value: childrenOf(unit.id)
                                                      .map((one) => one.name)
                                                      .join(', '),
                                              },
                                              { term: 'Sites', value: NUMBER.format(sites.length), numeric: true },
                                          ]
                                        : []),
                                    {
                                        term: `Reports, ${periodLabel(period)}`,
                                        value: `${String(reported.actual)} of ${String(reported.expected)}`,
                                        numeric: true,
                                    },
                                ]}
                            />
                        </Section>
                        <ChartFrame title="Reporting rate" subtitle="sites that sent the monthly report" className="h-64">
                            {(chart) => (
                                <Chart
                                    kind="line"
                                    label={`Reporting rate by month for ${unit.name}`}
                                    rows={year}
                                    x="month"
                                    y="rate"
                                    unit="%"
                                    fieldNames={{ rate: 'Reporting rate', month: 'Month' }}
                                    {...chart}
                                />
                            )}
                        </ChartFrame>
                    </Columns>
                    <Section
                        title="Data values"
                        description={
                            unit.level === 4
                                ? 'What the site reported.'
                                : `The sums of what the ${String(sites.length)} sites under it reported.`
                        }
                        actions={
                            <PeriodPicker
                                id="org-unit-period"
                                type="monthly"
                                value={period}
                                onValueChange={(one) => setPeriod(one ?? period)}
                                today={TODAY}
                                count={12}
                            />
                        }
                    >
                        <DataTable
                            variant="list"
                            columns={columns}
                            rows={values}
                            rowKey={(one) => one.id}
                            minWidth="auto"
                            words={{ empty: 'No data values.' }}
                        />
                    </Section>
                </Page>
            </Fill>
        </Row>
    )
}
