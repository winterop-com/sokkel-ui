import { ChipBar } from '@winterop-com/sokkel-ui/ChipBar'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SearchX } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import { CATEGORIES, categoryLabel, EPISODES, SHOWS, showById, type Category } from '../catalog'
import { EpisodeList, Nothing, ShowGrid } from '../parts'
import { usePodcasts } from '../state'

/** Whether every word of `query` is in one of `texts`. */
export function matches(query: string, texts: readonly string[]): boolean {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const haystack = texts.join(' ').toLowerCase()
    return words.every((word) => haystack.includes(word))
}

/** The shows and released episodes a query finds. */
export function find(query: string, released: (id: string) => boolean) {
    const shows = SHOWS.filter((show) => matches(query, [show.title, show.blurb, show.hosts.join(' '), categoryLabel(show.category)]))
    const episodes = EPISODES.filter(
        (episode) =>
            released(episode.id) &&
            matches(query, [episode.title, episode.summary, episode.place, showById.get(episode.show)?.title ?? '', ...episode.chapters]),
    )
    return { shows, episodes }
}

const ALL = 'all'

/** Discover: every show by category, and a search across the shows and their episodes; the route holds both. */
export function Discover({ category, initial }: { category: string; initial: string }) {
    const state = usePodcasts()
    const chosen = CATEGORIES.some((one) => one.id === category) ? (category as Category) : ALL
    const [query, setQuery] = useState(initial)
    const typed = query.trim()
    const path = (to: string, words: string) => `/discover/${to}${words.trim() === '' ? '' : `/${encodeURIComponent(words.trim())}`}`
    const route = (to: string, words: string) => {
        setQuery(words)
        go(path(to, words))
    }
    // Typing keeps the address current without a step in the history for every letter.
    const type = (words: string) => {
        setQuery(words)
        window.history.replaceState(null, '', `#${path(chosen, words)}`)
    }
    const found = typed === '' ? undefined : find(typed, (id) => state.episodes.get(id)?.out === true)
    const inCategory = (found?.shows ?? SHOWS).filter((show) => chosen === ALL || show.category === chosen)
    const episodes = (found?.episodes ?? []).filter((episode) => chosen === ALL || showById.get(episode.show)?.category === chosen)
    return (
        <Stack gap="section">
            <PageHeader title="Discover" description="Shows about the sea, the land and the work in between." />
            <Stack gap="md">
                <SearchField value={query} onChange={type} placeholder="Search shows and episodes" />
                <ChipBar
                    label="Categories"
                    chips={[{ value: ALL, label: 'All' }, ...CATEGORIES.map((one) => ({ value: one.id, label: one.label }))]}
                    value={chosen}
                    onValueChange={(value) => route(value, query)}
                />
            </Stack>
            {found !== undefined && inCategory.length === 0 && episodes.length === 0 ? (
                <Nothing
                    icon={<SearchX aria-hidden />}
                    title="Nothing found"
                    action={
                        <Button size="sm" variant="outline" onClick={() => route(ALL, '')}>
                            Clear the search
                        </Button>
                    }
                >
                    No show or episode {chosen === ALL ? '' : `in ${categoryLabel(chosen)} `}mentions “{typed}”.
                </Nothing>
            ) : (
                <>
                    {inCategory.length > 0 && (
                        <Section title={found === undefined ? (chosen === ALL ? 'All shows' : categoryLabel(chosen)) : 'Shows'}>
                            <ShowGrid shows={inCategory.map((show) => show.id)} label="Shows" />
                        </Section>
                    )}
                    {episodes.length > 0 && (
                        <Section flush title="Episodes" meta={String(episodes.length)}>
                            <EpisodeList variant="plain" episodes={episodes.slice(0, 30)} />
                        </Section>
                    )}
                </>
            )}
        </Stack>
    )
}
