import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusItem } from '@winterop-com/sokkel-ui/StatusLine'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { eventsOf, households, receipts, type Household } from '../data/backend'
import { formOf } from '../data/forms'
import { placeName, regionNameOf } from '../data/geo'
import { answerText, count, onDay, StateChip, useFoot } from '../ui'

const SOURCE = formOf('FRM-ENROLL')?.sections[0]?.questions.find((question) => question.id === 'source')

/** The registered households, searched by identifier and filtered by region, water source and state, each opening its own page. */
export function Households() {
    const { rows, error } = useCollection(households)
    const { rows: all } = useCollection(receipts)
    const [query, setQuery] = useState('')
    const [regions, setRegions] = useState<string[]>([])
    const [sources, setSources] = useState<string[]>([])
    const [states, setStates] = useState<string[]>([])
    const homes = rows ?? []
    const shown = homes
        .filter(
            (home) =>
                home.identifier.toLowerCase().includes(query.trim().toLowerCase()) &&
                (regions.length === 0 || regions.includes(home.region)) &&
                (sources.length === 0 || sources.includes(home.source)) &&
                (states.length === 0 || states.includes(home.status)),
        )
        .sort((left, right) => right.registeredAt.localeCompare(left.registeredAt))
    const visits = (home: Household) => eventsOf(all ?? [], home.id).filter((receipt) => receipt.formId !== 'FRM-ENROLL').length
    const filtered = query.trim() !== '' || regions.length + sources.length + states.length > 0
    useFoot(
        `Showing ${String(shown.length)} of ${count(homes.length, 'household')}`,
        query.trim() === '' ? undefined : <StatusItem label="identifier">{query.trim()}</StatusItem>,
        [shown.length, homes.length, query],
    )

    const columns: DataColumn<Household>[] = [
        {
            id: 'identifier',
            header: 'Identifier',
            width: '10rem',
            cell: (home) => <span className="font-mono">{home.identifier}</span>,
            sortValue: (home) => home.identifier,
        },
        {
            id: 'region',
            header: 'Region',
            width: '8rem',
            cell: (home) => regionNameOf(home.region),
            sortValue: (home) => regionNameOf(home.region),
        },
        {
            id: 'site',
            header: 'Site',
            width: 'minmax(8rem,1fr)',
            cell: (home) => placeName(home.site),
            sortValue: (home) => placeName(home.site),
        },
        { id: 'size', header: 'People', width: '5rem', align: 'end', cell: (home) => home.size, sortValue: (home) => home.size },
        {
            id: 'source',
            header: 'Water source',
            width: '10rem',
            cell: (home) => answerText(SOURCE, home.source),
            sortValue: (home) => home.source,
        },
        { id: 'visits', header: 'Visits', width: '5rem', align: 'end', cell: visits, sortValue: visits },
        {
            id: 'registered',
            header: 'Registered',
            width: '8rem',
            cell: (home) => onDay(home.registeredAt),
            sortValue: (home) => home.registeredAt,
        },
        {
            id: 'status',
            header: 'State',
            width: '7rem',
            cell: (home) => <StateChip state={home.status} />,
            sortValue: (home) => home.status,
        },
    ]

    return (
        <Page className="h-full">
            <PageHeader
                title="Households"
                description="The households the water survey follows. One row is one registered household, named by the identifier the server gave it."
                actions={
                    <>
                        <ApiLink path={query.trim() === '' ? '/households' : `/households?identifier=${query.trim()}`} />
                        <Button size="sm" onClick={() => go('/forms/FRM-ENROLL')}>
                            <UserPlus aria-hidden />
                            Register
                        </Button>
                    </>
                }
            />
            <DataTable
                loading={rows === undefined && error === undefined}
                error={error}
                empty={
                    homes.length === 0 ? 'No household is registered yet. Register one with the household registration form.' : undefined
                }
                className="min-h-0 flex-1"
                search={<SearchField value={query} onChange={setQuery} placeholder="Identifier" />}
                toolbar={
                    <>
                        <FilterChip
                            facet="Region"
                            multiple
                            options={[...new Set(homes.map((home) => home.region))]
                                .sort()
                                .map((region) => ({ value: region, label: regionNameOf(region) }))}
                            selected={regions}
                            onSelectedChange={setRegions}
                        />
                        <FilterChip
                            facet="Water source"
                            multiple
                            options={(SOURCE?.options ?? []).map((option) => ({ value: option.value, label: option.label }))}
                            selected={sources}
                            onSelectedChange={setSources}
                        />
                        <FilterChip
                            facet="State"
                            multiple
                            options={[
                                { value: 'active', label: 'active' },
                                { value: 'completed', label: 'completed' },
                            ]}
                            selected={states}
                            onSelectedChange={setStates}
                        />
                    </>
                }
                columns={columns}
                rows={shown}
                rowKey={(home) => home.id}
                onOpen={(home) => go(`/people/${home.id}`)}
                chevron
                minWidth="56rem"
                words={filtered ? { empty: 'No household matches the search and the filters.' } : undefined}
            />
        </Page>
    )
}
