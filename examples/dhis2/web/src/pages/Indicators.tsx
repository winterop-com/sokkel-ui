import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { indicators, indicatorValue, INDICATOR_TYPES, type Indicator, type IndicatorType } from '../data/backend'
import { check } from '../data/check'
import { DE, PERIODS, periodLabel, ROOT, uid } from '../data/metadata'
import { count, describeItems, figure, useFoot, useVersion, verdict } from '../ui'

const LATEST_PERIOD = PERIODS[PERIODS.length - 1]

/** The indicators the server holds, each checked against its version and worked out for the whole country in the latest month. */
export function Indicators() {
    const version = useVersion()
    const { rows, error } = useCollection(indicators)
    const [query, setQuery] = useState('')
    const [types, setTypes] = useState<string[]>([])
    const [states, setStates] = useState<string[]>([])

    const worked = useMemo(
        () =>
            (rows ?? []).map((one) => {
                const numerator = check(one.numerator, 'expression', { version })
                const denominator = check(one.denominator, 'expression', { version })
                const state = verdict(numerator, denominator)
                const value =
                    numerator.node !== null && denominator.node !== null && state !== 'invalid'
                        ? indicatorValue(numerator.node, denominator.node, one.type, ROOT, LATEST_PERIOD).value
                        : null
                return { ...one, state, value, findings: numerator.findings.length + denominator.findings.length }
            }),
        [rows, version],
    )
    type Row = (typeof worked)[number]

    const asked = query.trim().toLowerCase()
    const shown = worked.filter(
        (one) =>
            (asked === '' || `${one.name} ${one.code} ${one.id}`.toLowerCase().includes(asked)) &&
            (types.length === 0 || types.includes(one.type)) &&
            (states.length === 0 || states.includes(one.state)),
    )
    const invalid = worked.filter((one) => one.state === 'invalid').length
    useFoot(`Showing ${String(shown.length)} of ${count(worked.length, 'indicator')}`, undefined, [shown.length, worked.length])

    const columns: DataColumn<Row>[] = [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(14rem,1.2fr)',
            cell: (one) => (
                <span>
                    <span className="font-medium">{one.name}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{one.id}</span>
                </span>
            ),
            sortValue: (one) => one.name,
            stack: 'lead',
        },
        { id: 'type', header: 'Type', width: '8rem', cell: (one) => INDICATOR_TYPES[one.type].label, sortValue: (one) => one.type },
        {
            id: 'formula',
            header: 'Formula',
            width: 'minmax(16rem,2fr)',
            cell: (one) => (
                <span className="text-muted-foreground">
                    {describeItems(one.numerator)} <span className="text-faint">over</span> {describeItems(one.denominator)}
                </span>
            ),
            stack: 'secondary',
        },
        {
            id: 'state',
            header: 'Check',
            width: '8rem',
            cell: (one) => <StatusChip status={one.state} label={one.findings === 0 ? 'valid' : count(one.findings, 'finding')} />,
            sortValue: (one) => one.state,
        },
        {
            id: 'value',
            header: `Norway, ${periodLabel(LATEST_PERIOD)}`,
            width: '10rem',
            align: 'end',
            cell: (one) => <span className="tabular-nums">{figure(one.value, INDICATOR_TYPES[one.type].unit)}</span>,
            sortValue: (one) => one.value ?? -Infinity,
        },
    ]

    const create = () => {
        const made = (worked.length + 1).toString().padStart(3, '0')
        const code = `IND_NEW_${made}`
        indicators
            .create(
                {
                    code,
                    name: `New indicator ${made}`,
                    description: '',
                    type: 'percent',
                    numerator: `#{${DE.referrals.id}}`,
                    denominator: `#{${DE.visits.id}}`,
                },
                uid(`ind:${code}:${Date.now().toString(36)}`),
            )
            .then(
                (one: Indicator) => go(`/indicators/${one.id}`),
                (failure: unknown) =>
                    toast.error('Not created', { description: failure instanceof Error ? failure.message : String(failure) }),
            )
    }

    return (
        <Page className="h-full">
            <PageHeader
                title="Indicators"
                description={`A numerator over a denominator, each an expression over data elements, constants and reporting rates, times the type's factor. Each is checked against the server's version, ${version}, and worked out for the country in the latest month.`}
                actions={
                    <>
                        <ApiLink path="/api/indicators" />
                        <Button size="sm" onClick={create}>
                            <Plus aria-hidden />
                            New
                        </Button>
                    </>
                }
            />
            <PageState loading={rows === undefined && error === undefined} error={error}>
                <DataTable
                    className="min-h-0 flex-1"
                    search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                    toolbar={
                        <>
                            <FilterChip
                                facet="Type"
                                multiple
                                options={(Object.keys(INDICATOR_TYPES) as IndicatorType[]).map((type) => ({
                                    value: type,
                                    label: INDICATOR_TYPES[type].label,
                                }))}
                                selected={types}
                                onSelectedChange={setTypes}
                            />
                            <FilterChip
                                facet="Check"
                                multiple
                                options={[
                                    { value: 'valid', label: 'valid' },
                                    { value: 'warnings', label: 'warnings' },
                                    { value: 'invalid', label: 'invalid' },
                                ]}
                                selected={states}
                                onSelectedChange={setStates}
                            />
                        </>
                    }
                    columns={columns}
                    rows={shown}
                    rowKey={(one) => one.id}
                    onOpen={(one) => go(`/indicators/${one.id}`)}
                    chevron
                    minWidth="56rem"
                    rowHeight="auto"
                    foot={invalid > 0 ? `${count(invalid, 'indicator')} cannot run on ${version}.` : undefined}
                    words={
                        asked !== '' || types.length > 0 || states.length > 0
                            ? { empty: 'No indicator matches the search and the filters.' }
                            : undefined
                    }
                />
            </PageState>
        </Page>
    )
}
