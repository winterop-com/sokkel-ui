import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { FilterChip } from '@winterop-com/sokkel-ui/FilterChip'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Badge } from '@winterop-com/sokkel-ui/primitives/badge'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { useState } from 'react'

import { EVALUATED } from '../data/expression'
import { EVALUATED_VARIABLES } from '../data/program'
import { ADDED, LATEST, namesOf, VERSIONS } from '../data/versions'
import { count, useFoot, useVersion } from '../ui'

interface Name {
    id: string
    name: string
    kind: 'function' | 'variable'
    languages: string
    since: string
    known: boolean
    evaluated: boolean
}

/** Every function and program variable the latest server knows, with the version each came in and whether the running version knows it. */
export function Functions() {
    const version = useVersion()
    const [query, setQuery] = useState('')
    const [kinds, setKinds] = useState<string[]>([])
    const [shownKnown, setShownKnown] = useState<string[]>([])
    const known = namesOf(version)
    const all = namesOf(LATEST)
    const rows: Name[] = [
        ...all.functions.map((name) => ({
            id: `f:${name}`,
            name,
            kind: 'function' as const,
            languages: name.startsWith('d2:') ? 'rule' : 'both',
            since: ADDED[name] ?? `${VERSIONS[0]} or before`,
            known: known.functions.includes(name),
            evaluated: EVALUATED[name] !== undefined,
        })),
        ...all.variables.map((name) => ({
            id: `v:${name}`,
            name: `V{${name}}`,
            kind: 'variable' as const,
            languages: 'rule',
            since: ADDED[name] ?? `${VERSIONS[0]} or before`,
            known: known.variables.includes(name),
            evaluated: EVALUATED_VARIABLES.includes(name),
        })),
    ]
    const asked = query.trim().toLowerCase()
    const shown = rows.filter(
        (one) =>
            (asked === '' || one.name.toLowerCase().includes(asked)) &&
            (kinds.length === 0 || kinds.includes(one.kind)) &&
            (shownKnown.length === 0 || shownKnown.includes(one.known ? 'known' : 'unknown')),
    )
    const missing = rows.filter((one) => !one.known).length
    useFoot(`${version} knows ${String(rows.length - missing)} of ${count(rows.length, 'name')}`, undefined, [version, missing])

    const columns: DataColumn<Name>[] = [
        {
            id: 'name',
            header: 'Name',
            width: 'minmax(12rem,1.4fr)',
            cell: (one) => <span className="font-mono text-sm">{one.name}</span>,
            sortValue: (one) => one.name,
            stack: 'lead',
        },
        { id: 'kind', header: 'Kind', width: '7rem', cell: (one) => one.kind, sortValue: (one) => one.kind },
        {
            id: 'languages',
            header: 'Language',
            width: '10rem',
            cell: (one) => (one.languages === 'rule' ? <Badge kind="pink">dhis2-rule</Badge> : <Badge kind="teal">both</Badge>),
            sortValue: (one) => one.languages,
        },
        { id: 'since', header: 'Since', width: '9rem', cell: (one) => one.since, sortValue: (one) => one.since },
        {
            id: 'known',
            header: `On ${version}`,
            width: '8rem',
            cell: (one) => <StatusChip status={one.known ? 'valid' : 'invalid'} label={one.known ? 'known' : 'unknown'} />,
            sortValue: (one) => (one.known ? 1 : 0),
        },
        {
            id: 'evaluated',
            header: 'Run here',
            width: '7rem',
            cell: (one) => (one.evaluated ? 'yes' : <span className="text-muted-foreground">no</span>),
            sortValue: (one) => (one.evaluated ? 1 : 0),
        },
    ]

    return (
        <Page className="h-full">
            <PageHeader
                title="Functions"
                description={`The names DHIS2's expression languages know, as the server lists them. Switching the version hands the editors another list: on ${version}, ${count(missing, 'name')} of the latest are read as plain names and checked as unknown. "Run here" says which the workbench's own evaluator runs.`}
            />
            <DataTable
                className="min-h-0 flex-1"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                toolbar={
                    <>
                        <FilterChip
                            facet="Kind"
                            multiple
                            options={[
                                { value: 'function', label: 'function' },
                                { value: 'variable', label: 'variable' },
                            ]}
                            selected={kinds}
                            onSelectedChange={setKinds}
                        />
                        <FilterChip
                            facet={`On ${version}`}
                            multiple
                            options={[
                                { value: 'known', label: 'known' },
                                { value: 'unknown', label: 'unknown' },
                            ]}
                            selected={shownKnown}
                            onSelectedChange={setShownKnown}
                        />
                    </>
                }
                columns={columns}
                rows={shown}
                rowKey={(one) => one.id}
                minWidth="48rem"
                words={{ empty: 'No name matches the search and the filters.' }}
            />
        </Page>
    )
}
