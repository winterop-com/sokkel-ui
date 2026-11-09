import { BarList } from '@winterop-com/sokkel-ui/BarList'
import { DataTable, type DataColumn } from '@winterop-com/sokkel-ui/DataTable'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Hash } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { useVault } from '../state'
import { noteActions, noteColumns } from './AllNotes'

interface TagRow {
    id: string
    notes: number
    /** When a note under it last changed. */
    latest: number
}

/** Every tag with how many notes carry it, or one tag's notes. */
export function Tags({ tag }: { tag?: string }) {
    const state = useVault()
    const { vault, open } = state
    const [query, setQuery] = useState('')

    if (tag !== undefined) {
        const notes = vault.tagged.get(tag) ?? []
        return (
            <>
                <PageHeader
                    title={`#${tag}`}
                    count={`${String(notes.length)} ${notes.length === 1 ? 'note' : 'notes'}`}
                    onBack={() => go('/tags')}
                    description="The notes that carry this tag."
                />
                <DataTable
                    variant="list"
                    minWidth="auto"
                    stackLayout="compact"
                    columns={noteColumns(vault)}
                    rows={notes}
                    rowKey={(note) => note.id}
                    defaultSort={{ column: 'updated', direction: 'desc' }}
                    onOpen={(note) => open(note.id)}
                    rowActions={noteActions(state)}
                    empty={`No note carries #${tag} now.`}
                />
            </>
        )
    }

    const rows: TagRow[] = [...vault.tagged.entries()].map(([id, notes]) => ({
        id,
        notes: notes.length,
        latest: Math.max(...notes.map((note) => note.updated)),
    }))
    const needle = query.trim().replace(/^#/, '').toLowerCase()
    const shown = needle === '' ? rows : rows.filter((row) => row.id.toLowerCase().includes(needle))
    const most = Math.max(1, ...rows.map((row) => row.notes))
    const columns: DataColumn<TagRow>[] = [
        {
            id: 'tag',
            header: 'Tag',
            width: 'minmax(12rem,1fr)',
            cell: (row) => (
                <Row gap="2xs" className="min-w-0">
                    <Hash className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate font-medium">{row.id}</span>
                </Row>
            ),
            sortValue: (row) => row.id,
        },
        { id: 'notes', header: 'Notes', width: '6rem', align: 'end', cell: (row) => row.notes, sortValue: (row) => row.notes },
        {
            id: 'latest',
            header: 'Last used',
            width: '8.5rem',
            stack: 'secondary',
            cell: (row) => <RelativeTime date={row.latest} length="short" className="text-muted-foreground" />,
            sortValue: (row) => row.latest,
        },
    ]

    return (
        <>
            <PageHeader title="Tags" count={`${String(rows.length)} tags`} description="Write # and a word in a note to tag it." />
            <Row gap="section" align="start" stackBelow="lg">
                <DataTable
                    className="min-w-0 flex-1"
                    variant="list"
                    minWidth="auto"
                    stackLayout="compact"
                    columns={columns}
                    rows={shown}
                    rowKey={(row) => row.id}
                    defaultSort={{ column: 'notes', direction: 'desc' }}
                    onOpen={(row) => go(`/tags/${encodeURIComponent(row.id)}`)}
                    chevron
                    search={<SearchField value={query} onChange={setQuery} placeholder="Filter" />}
                    empty="No tag is named like that."
                />
                <Section title="Most used" className="w-full lg:w-80 lg:shrink-0">
                    <BarList
                        label="Tags by how many notes carry them"
                        items={[...rows]
                            .sort((a, b) => b.notes - a.notes)
                            .slice(0, 8)
                            .map((row) => ({ id: row.id, label: `#${row.id}`, value: row.notes / most }))}
                        format={(value) => String(Math.round(value * most))}
                    />
                </Section>
            </Row>
        </>
    )
}
