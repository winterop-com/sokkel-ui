import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchResults } from '@winterop-com/sokkel-ui/SearchResults'
import {
    countFacets,
    filterGroups,
    queryWords,
    type SearchChosen,
    type SearchFacet,
    type SearchGroup,
} from '@winterop-com/sokkel-ui/lib/search'
import { CalendarDays, FileText } from 'lucide-react'
import { useState } from 'react'

import { useVault } from '../state'
import { lineAround, type Vault } from '../vault'

/**
 * Every note holding every word of a query, in its name or its text, in any case: those named by it
 * first, then those that say it, each with the line it is said in. Faceted by kind and by folder.
 */
export function searchVault(vault: Vault, query: string, chosen: SearchChosen): { groups: SearchGroup[]; facets: SearchFacet[] } {
    const words = queryWords(query)
    if (words.length === 0) return { groups: [], facets: [] }
    const named: SearchGroup['results'][number][] = []
    const said: SearchGroup['results'][number][] = []
    const newest = [...vault.notes].sort((a, b) => b.updated - a.updated)
    for (const note of newest) {
        const title = note.title.toLowerCase()
        const body = note.body.toLowerCase()
        if (!words.every((word) => title.includes(word) || body.includes(word))) continue
        const first = words.map((word) => body.indexOf(word)).find((at) => at !== -1)
        const where = vault.path(note.folder) || 'Vault'
        const result = {
            id: note.id,
            title: note.title,
            detail: first === undefined ? where : lineAround(note.body, first, first + 1, 110),
            meta: where,
            icon: note.day === undefined ? FileText : CalendarDays,
            facets: { folder: where },
        }
        if (words.every((word) => title.includes(word))) named.push(result)
        else said.push(result)
    }
    const groups: SearchGroup[] = [
        { kind: 'names', title: 'In the name', results: named },
        { kind: 'text', title: 'In the text', results: said },
    ]
    return { groups: filterGroups(groups, chosen), facets: countFacets(groups, [{ id: 'folder', title: 'Folder' }], chosen, 'Found') }
}

/** The vault searched in full: every note holding the words, with the line each says them in, narrowed by kind and folder. */
export function SearchPage({ query }: { query: string }) {
    const { vault, open } = useVault()
    const [typed, setTyped] = useState(query)
    const [chosen, setChosen] = useState<SearchChosen>({})
    const found = searchVault(vault, typed, chosen)
    return (
        <>
            <PageHeader title="Search" description="Every note holding all the words, in its name or its text." />
            <SearchResults
                query={typed}
                onQueryChange={(next) => {
                    setTyped(next)
                    // The address follows the query without a step in the history for each key.
                    window.history.replaceState(null, '', next.trim() === '' ? '#/search' : `#/search/${encodeURIComponent(next)}`)
                }}
                groups={found.groups}
                facets={found.facets}
                chosen={chosen}
                onChosenChange={setChosen}
                onOpen={(result) => open(result.id)}
                state="done"
                words={{
                    placeholder: 'Search the vault',
                    empty: (typed) => (typed === '' ? 'Type a word to search every note.' : `No note holds “${typed}”.`),
                }}
            />
        </>
    )
}
