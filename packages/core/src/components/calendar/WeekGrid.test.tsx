// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import type { CalendarEvent } from './events'
import { WeekGrid, type WeekGridProps } from './WeekGrid'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

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

/** Monday to Wednesday of one week, at local midnight. */
const DAYS = [new Date(2026, 10, 16), new Date(2026, 10, 17), new Date(2026, 10, 18)]
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, 16 + day, hour, minute)

const EVENTS: CalendarEvent[] = [
    { id: 'export', title: 'nightly-export', start: at(0, 2), end: at(0, 3, 30) },
    { id: 'sync', title: 'sync-inventory', start: at(1, 9), end: at(1, 10) },
    { id: 'index', title: 'rebuild-index', start: at(1, 9, 30), end: at(1, 11) },
    { id: 'digest', title: 'send-digest', start: at(2, 8), end: at(2, 8, 10) },
    { id: 'freeze', title: 'Release freeze', start: at(0, 0), end: at(2, 0), allDay: true },
]

function mount(props: Partial<WeekGridProps<CalendarEvent>> = {}) {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(<WeekGrid days={DAYS} events={EVENTS} hourHeight={48} {...props} />))
    return host
}

/** The column of each day, and the timed event blocks drawn in it by their titles. */
function columns(at: HTMLElement) {
    return [...at.querySelectorAll<HTMLElement>('[data-calendar-day]')].map((column) =>
        [...column.querySelectorAll<HTMLElement>('[style*="top"]')]
            .filter((block) => block.textContent !== '')
            .map((block) => ({ title: block.textContent ?? '', style: block.style })),
    )
}

describe('WeekGrid', () => {
    it('draws a column for each day, each timed event in the column of its day', () => {
        const drawn = columns(mount())
        expect(drawn).toHaveLength(3)
        expect(drawn.map((day) => day.map((block) => block.title.split(/\d/)[0]))).toEqual([
            ['nightly-export'],
            ['sync-inventory', 'rebuild-index'],
            ['send-digest'],
        ])
    })

    it('places an event by its start and its length at the hour height', () => {
        const [monday] = columns(mount())
        expect(monday[0].style.top).toBe(`${2 * 48 + 1}px`)
        expect(monday[0].style.height).toBe(`${1.5 * 48 - 2}px`)
    })

    it('gives a short event half an hour of room, so its title can be read', () => {
        const wednesday = columns(mount())[2]
        expect(wednesday[0].style.height).toBe(`${48 / 2 - 2}px`)
    })

    it('splits the width between events that overlap', () => {
        const tuesday = columns(mount())[1]
        expect(tuesday.map((block) => block.style.width)).toEqual(['calc(50% - 4px)', 'calc(50% - 4px)'])
        expect(tuesday.map((block) => block.style.left)).toEqual(['calc(0% + 2px)', 'calc(50% + 2px)'])
    })

    it('draws an all-day event once across the days it spans, outside the hours', () => {
        const drawn = mount()
        expect(drawn.textContent?.match(/Release freeze/g)).toHaveLength(1)
        expect(
            columns(drawn)
                .flat()
                .some((block) => block.title.startsWith('Release freeze')),
        ).toBe(false)
    })

    it('draws the line across today only when given the time', () => {
        expect(mount().querySelector('[aria-label="Now"]')).toBeNull()
        act(() => root?.unmount())
        host?.remove()
        expect(mount({ now: at(1, 12) }).querySelector('[aria-label="Now"]')).not.toBeNull()
    })
})
