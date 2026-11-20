// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { filterRows } from '../lib/filters'
import { TrackRoster, trackFilterFields, type TrackRosterItem } from './TrackRoster'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

const NOW = Date.UTC(2026, 10, 20, 14, 30)

const TRACKS: TrackRosterItem[] = [
    { id: 'pilot-2', name: 'Pilot 2', kind: 'vessel', affiliation: 'friend', updatedAt: NOW - 1000 },
    { id: 'survey-1', name: 'Survey 1', kind: 'aircraft', affiliation: 'friend', states: ['Simulated'], updatedAt: NOW - 3000 },
    { id: 'contact-14', name: 'Contact 14', kind: 'vessel', affiliation: 'hostile', updatedAt: NOW - 4000 },
    { id: 'contact-9', name: 'Contact 9', kind: 'vessel', affiliation: 'unknown', updatedAt: NOW - 540_000 },
]

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
})

function draw(node: React.ReactNode): HTMLElement {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root?.render(node))
    return host
}

describe('trackFilterFields', () => {
    it('filters on the affiliation, the kinds there are, and the states', () => {
        const fields = trackFilterFields(TRACKS)
        expect(fields.map((field) => field.id)).toEqual(['affiliation', 'kind', 'state'])
        expect(fields[1].options?.map((option) => option.value)).toEqual(['vessel', 'aircraft'])
        const hostile = filterRows(TRACKS, [{ field: 'affiliation', operator: 'oneOf', values: ['hostile'] }], fields)
        expect(hostile.map((track) => track.id)).toEqual(['contact-14'])
        const simulated = filterRows(TRACKS, [{ field: 'state', operator: 'oneOf', values: ['Simulated'] }], fields)
        expect(simulated.map((track) => track.id)).toEqual(['survey-1'])
    })

    it('leaves the states out when no track has one', () => {
        expect(trackFilterFields(TRACKS.filter((track) => track.states === undefined)).map((field) => field.id)).toEqual([
            'affiliation',
            'kind',
        ])
    })
})

describe('TrackRoster', () => {
    it('groups the tracks under their affiliations, friend first, and marks the one selected', () => {
        const box = draw(<TrackRoster tracks={TRACKS} now={NOW} selected="contact-14" />)
        const groups = [...box.querySelectorAll('[data-group]')].map((element) => element.getAttribute('data-group'))
        expect(groups.filter((group, index) => groups.indexOf(group) === index)).toEqual(['friend', 'hostile', 'unknown'])
        const chosen = box.querySelector('[data-row="contact-14"]')
        expect(chosen?.getAttribute('aria-selected')).toBe('true')
        expect(box.textContent).toContain('9 min ago')
    })

    it('calls onSelect with the track pressed', () => {
        const picked: string[] = []
        const box = draw(<TrackRoster tracks={TRACKS} now={NOW} onSelect={(id) => picked.push(id)} />)
        act(() => box.querySelector<HTMLElement>('[data-row="pilot-2"]')?.click())
        expect(picked).toEqual(['pilot-2'])
    })

    it('keeps only the tracks its filters keep', () => {
        const box = draw(
            <TrackRoster tracks={TRACKS} now={NOW} defaultFilters={[{ field: 'affiliation', operator: 'oneOf', values: ['unknown'] }]} />,
        )
        expect(box.querySelector('[data-row="contact-9"]')).not.toBeNull()
        expect(box.querySelector('[data-row="pilot-2"]')).toBeNull()
    })
})
