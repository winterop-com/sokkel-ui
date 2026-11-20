import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

import { TrackRoster, type TrackAffiliation } from '@winterop-com/sokkel-ui/TrackRoster'
import { WATCH_NOW, watchRoster } from '../fixtures/watch'

const meta: Meta = { title: 'Patterns/Track roster' }
export default meta

function Roster({ defaultSelected = null, filtered = false }: { defaultSelected?: string | null; filtered?: boolean }) {
    const [selected, setSelected] = useState<string | null>(defaultSelected)
    const [judged, setJudged] = useState<Record<string, TrackAffiliation>>({})
    const tracks = useMemo(() => watchRoster(WATCH_NOW, judged), [judged])
    return (
        <TrackRoster
            className="h-svh"
            tracks={tracks}
            now={WATCH_NOW}
            selected={selected}
            onSelect={setSelected}
            onAffiliationChange={(id, affiliation) => setJudged((was) => ({ ...was, [id]: affiliation }))}
            defaultFilters={filtered ? [{ field: 'affiliation', operator: 'oneOf', values: ['hostile', 'unknown'] }] : undefined}
        />
    )
}

/** The harbor watch's tracks under their affiliations, friend first, each head with its count and folding its group; a search, filters and a sort menu in the bar. */
export const List: StoryObj = { render: () => <Roster /> }

/** A contact picked, as a press on the map picks it: its row drawn as chosen. */
export const Selected: StoryObj = { render: () => <Roster defaultSelected="contact-14" /> }

/** Filtered to the hostile and unknown tracks, the count saying how many of all are shown. */
export const Filtered: StoryObj = { render: () => <Roster filtered /> }
