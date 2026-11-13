import { ApiLink } from '@winterop-com/sokkel-ui/ApiLink'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useCollection } from 'tidevann-shared/backend'
import { go } from 'tidevann-shared/router'

import { conceptText, quantityText, referenceText } from '../data/model'
import { resources, SERVER, type Stored } from '../data/server'
import { TYPE_NAMES, typeDef } from '../data/types'
import { count, onDay, stateOf, titleOf, useFoot, when } from '../ui'

const field = (row: Stored, name: string) => (row.resource as Record<string, unknown>)[name]

/** The columns a type's listing shows between its title and its last change. */
function typeColumns(type: string): DataColumn<Stored>[] {
    const text = (id: string, header: string, read: (row: Stored) => string, width = 'minmax(8rem,1fr)'): DataColumn<Stored> => ({
        id,
        header,
        width,
        cell: read,
        sortValue: read,
    })
    switch (type) {
        case 'Patient':
            return [
                text('gender', 'Gender', (row) => String(field(row, 'gender') ?? ''), '7rem'),
                text('birthDate', 'Born', (row) => onDay(field(row, 'birthDate') as string | undefined), '8rem'),
                text('city', 'City', (row) => (field(row, 'address') as { city?: string }[] | undefined)?.[0]?.city ?? '', '8rem'),
            ]
        case 'Practitioner':
            return [
                text('qualification', 'Qualification', (row) =>
                    conceptText((field(row, 'qualification') as { code?: unknown }[] | undefined)?.[0]?.code),
                ),
            ]
        case 'Organization':
            return [text('city', 'City', (row) => (field(row, 'address') as { city?: string }[] | undefined)?.[0]?.city ?? '')]
        case 'Observation':
            return [
                text('value', 'Value', (row) => quantityText(field(row, 'valueQuantity')), '8rem'),
                text('subject', 'Subject', (row) => referenceText(field(row, 'subject'))),
                text('effective', 'Observed', (row) => onDay(field(row, 'effectiveDateTime') as string | undefined), '8rem'),
            ]
        case 'Condition':
            return [
                text('subject', 'Subject', (row) => referenceText(field(row, 'subject'))),
                text('onset', 'Onset', (row) => onDay(field(row, 'onsetDateTime') as string | undefined), '8rem'),
            ]
        case 'Encounter':
            return [
                text('subject', 'Subject', (row) => referenceText(field(row, 'subject'))),
                text('class', 'Class', (row) => conceptText(field(row, 'class')), '8rem'),
            ]
        case 'Library':
            return [
                text('name', 'Name', (row) => String(field(row, 'name') ?? '')),
                text('version', 'Version', (row) => String(field(row, 'version') ?? ''), '6rem'),
            ]
        default:
            return []
    }
}

/** The resources of one type on the server, searched by their title, each opening its own page. */
export function Resources({ type }: { type: string }) {
    const { rows, error } = useCollection(resources)
    const [query, setQuery] = useState('')
    const def = typeDef(type)
    const all = rows ?? []
    const ofType = all.filter((row) => row.type === type)
    const asked = query.trim().toLowerCase()
    const shown = ofType.filter(
        (row) => asked === '' || titleOf(row.resource).toLowerCase().includes(asked) || row.resource.id.includes(asked),
    )
    useFoot(`Showing ${String(shown.length)} of ${count(ofType.length, type)}`, undefined, [shown.length, ofType.length, type])
    const hasState = ofType.some((row) => stateOf(row.resource) !== undefined)

    const columns: DataColumn<Stored>[] = [
        {
            id: 'title',
            header: type === 'Patient' || type === 'Practitioner' ? 'Name' : 'Title',
            width: 'minmax(12rem,2fr)',
            cell: (row) => titleOf(row.resource),
            sortValue: (row) => titleOf(row.resource),
        },
        {
            id: 'id',
            header: 'Id',
            width: '9rem',
            cell: (row) => <span className="font-mono">{row.resource.id}</span>,
            sortValue: (row) => row.resource.id,
        },
        ...typeColumns(type),
        ...(hasState
            ? [
                  {
                      id: 'state',
                      header: 'State',
                      width: '8rem',
                      cell: (row: Stored) => {
                          const state = stateOf(row.resource)
                          return state === undefined ? null : <StatusChip status={state} />
                      },
                      sortValue: (row: Stored) => stateOf(row.resource) ?? '',
                  },
              ]
            : []),
        {
            id: 'version',
            header: 'Version',
            width: '5rem',
            align: 'end',
            cell: (row) => row.resource.meta?.versionId ?? '',
            sortValue: (row) => Number(row.resource.meta?.versionId ?? 0),
        },
        {
            id: 'updated',
            header: 'Updated',
            width: '11rem',
            cell: (row) => when(row.resource.meta?.lastUpdated),
            sortValue: (row) => row.resource.meta?.lastUpdated ?? '',
        },
    ]

    return (
        <Page className="h-full">
            <PageHeader
                title="Resources"
                description="What the server holds, one type at a time. A resource opens as its JSON, to read, change and save as a new version."
                actions={
                    <>
                        <ApiLink path={`/${type}`} copyValue={`${SERVER.base}/${type}`} />
                        <Button size="sm" onClick={() => go(`/resources/${type}/new`)}>
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
                        <Segmented
                            label="Resource type"
                            size="sm"
                            value={type}
                            options={TYPE_NAMES.map((name) => ({
                                value: name,
                                label: name,
                                count: all.filter((row) => row.type === name).length,
                            }))}
                            onValueChange={(next) => go(`/resources/${next}`)}
                        />
                    }
                    columns={columns}
                    rows={shown}
                    rowKey={(row) => row.id}
                    onOpen={(row) => go(`/resources/${row.id}`)}
                    chevron
                    minWidth="48rem"
                    defaultSort={{ column: 'updated', direction: 'desc' }}
                    empty={asked === '' ? `The server holds no ${type} resources. ${def?.about ?? ''}` : `No ${type} matches the search.`}
                />
            </PageState>
        </Page>
    )
}
