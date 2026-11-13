import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { DetailSheet } from '@winterop-com/sokkel-ui/DetailSheet'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { TextLink } from '@winterop-com/sokkel-ui/TextLink'
import { useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { indicators, validationRules } from '../data/backend'
import { DATA_ELEMENTS, DATA_SET, dataElement, PERIODS, periodLabel, ROOT, type DataElement } from '../data/metadata'
import { dataValue } from '../data/values'
import { count, figure, useFoot } from '../ui'

const LATEST_PERIOD = PERIODS[PERIODS.length - 1]

/** The data elements the server holds, with the indicators and rules that read each, one opened in a sheet. */
export function DataElements({ selected }: { selected?: string }) {
    const [query, setQuery] = useState('')
    const { rows: allIndicators } = useCollection(indicators)
    const { rows: allRules } = useCollection(validationRules)
    const readers = (element: DataElement) => ({
        indicators: (allIndicators ?? []).filter((one) => `${one.numerator} ${one.denominator}`.includes(element.id)),
        rules: (allRules ?? []).filter((one) => `${one.left} ${one.right}`.includes(element.id)),
    })
    const asked = query.trim().toLowerCase()
    const shown = DATA_ELEMENTS.filter((one) => asked === '' || `${one.name} ${one.code} ${one.id}`.toLowerCase().includes(asked))
    const open = selected === undefined ? undefined : dataElement(selected)
    useFoot(`Showing ${String(shown.length)} of ${count(DATA_ELEMENTS.length, 'data element')}`, undefined, [shown.length])

    const columns: DataColumn<DataElement>[] = [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(13rem,1.4fr)',
            cell: (one) => (
                <span>
                    <span className="font-medium">{one.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{one.id}</span>
                </span>
            ),
            sortValue: (one) => one.name,
            stack: 'lead',
        },
        {
            id: 'code',
            header: 'Code',
            width: '11rem',
            cell: (one) => <span className="font-mono text-xs">{one.code}</span>,
            sortValue: (one) => one.code,
        },
        {
            id: 'combo',
            header: 'Disaggregation',
            width: '9rem',
            cell: (one) =>
                one.categoryCombo.name === 'default' ? (
                    <span className="text-muted-foreground">none</span>
                ) : (
                    <Badge kind="violet">{one.categoryCombo.name}</Badge>
                ),
            sortValue: (one) => one.categoryCombo.name,
        },
        { id: 'type', header: 'Value type', width: '12rem', cell: (one) => <span className="font-mono text-xs">{one.valueType}</span> },
        {
            id: 'used',
            header: 'Read by',
            width: '9rem',
            cell: (one) => {
                const read = readers(one)
                const total = read.indicators.length + read.rules.length
                return total === 0 ? <span className="text-muted-foreground">nothing</span> : count(total, 'expression')
            },
        },
        {
            id: 'value',
            header: `Norway, ${periodLabel(LATEST_PERIOD)}`,
            width: '9rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{figure(dataValue(one.id, null, ROOT, LATEST_PERIOD))}</span>,
            sortValue: (one) => dataValue(one.id, null, ROOT, LATEST_PERIOD) ?? -1,
        },
    ]

    const read = open === undefined ? undefined : readers(open)

    return (
        <Page className="h-full">
            <PageHeader
                title="Data elements"
                description={`What the sites report each month in ${DATA_SET.name}. An expression names one as #{uid}, or one of its category option combos as #{uid.combo}.`}
                actions={<ApiLink path="/api/dataElements" />}
            />
            <DataTable
                className="min-h-0 flex-1"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                columns={columns}
                rows={shown}
                rowKey={(one) => one.id}
                onOpen={(one) => go(`/data-elements/${one.id}`)}
                opened={(one) => one.id === open?.id}
                chevron
                minWidth="56rem"
                rowHeight="auto"
                words={{ empty: 'No data element matches the search.' }}
            />
            <DetailSheet
                open={open !== undefined}
                onOpenChange={(next) => {
                    if (!next) go('/data-elements')
                }}
                title={open?.name ?? ''}
                code={open?.id}
                description={open?.description}
            >
                {open !== undefined && read !== undefined && (
                    <Stack gap="lg">
                        <DescriptionList
                            termWidth="9rem"
                            items={[
                                { term: 'Code', value: open.code, code: true },
                                { term: 'Short name', value: open.shortName },
                                { term: 'Value type', value: open.valueType, code: true },
                                { term: 'Aggregation', value: open.aggregationType, code: true },
                                { term: 'Category combo', value: open.categoryCombo.name },
                                { term: 'Data set', value: DATA_SET.name },
                            ]}
                        />
                        <Section title="Category option combos" variant="flat">
                            <DescriptionList
                                termWidth="9rem"
                                items={open.categoryCombo.combos.map((combo) => ({
                                    term: combo.name,
                                    value: `#{${open.id}.${combo.id}}`,
                                    code: true,
                                }))}
                            />
                        </Section>
                        <Section title={`Read by (${String(read.indicators.length + read.rules.length)})`} variant="flat">
                            {read.indicators.length + read.rules.length === 0 ? (
                                <p className="text-help text-muted-foreground">No indicator or validation rule reads this data element.</p>
                            ) : (
                                <Stack gap="xs">
                                    {read.indicators.map((one) => (
                                        <TextLink key={one.id} href={`#/indicators/${one.id}`} className="text-sm">
                                            {one.name} <span className="text-help text-muted-foreground">indicator</span>
                                        </TextLink>
                                    ))}
                                    {read.rules.map((one) => (
                                        <TextLink key={one.id} href={`#/validation-rules/${one.id}`} className="text-sm">
                                            {one.name} <span className="text-help text-muted-foreground">validation rule</span>
                                        </TextLink>
                                    ))}
                                </Stack>
                            )}
                        </Section>
                    </Stack>
                )}
            </DetailSheet>
        </Page>
    )
}
