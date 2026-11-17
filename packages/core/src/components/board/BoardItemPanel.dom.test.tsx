// @vitest-environment happy-dom
import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { CheckboxField } from '../CheckboxField'
import { DetailPane } from '../DetailPane'
import { BoardItemPanel, type ChecklistStep } from './BoardItemPanel'

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
})

function draw(node: ReactNode): HTMLElement {
    host = document.createElement('div')
    document.body.append(host)
    const made = createRoot(host)
    root = made
    act(() => made.render(node))
    return host
}

const boxes = (page: HTMLElement) => [...page.querySelectorAll<HTMLElement>('[role="checkbox"]')]

describe('BoardItemPanel', () => {
    it('ticks a checklist step, the count and the bar following, the done step struck through', () => {
        function Held() {
            const [steps, setSteps] = useState<ChecklistStep[]>([
                { text: 'Reproduce it', done: true },
                { text: 'Guard transform', done: false },
            ])
            return (
                <BoardItemPanel
                    code="HRB-142"
                    title="nightly-export fails"
                    state={{ label: 'In progress' }}
                    description="Zero rows in the feed."
                    fields={[{ term: 'Project', value: 'harbor' }]}
                    checklist={steps}
                    onChecklistChange={(index, done) => setSteps(steps.map((step, at) => (at === index ? { ...step, done } : step)))}
                    activity={[{ id: 'made', title: 'margaret opened it', at: '28 Oct' }]}
                />
            )
        }
        const page = draw(<Held />)
        for (const word of ['HRB-142', 'In progress', 'Description', 'Fields', 'harbor', 'Activity', 'margaret opened it']) {
            expect(page.textContent).toContain(word)
        }
        expect(page.textContent).toContain('Checklist 1/2')
        const [first, second] = boxes(page)
        expect(first.getAttribute('aria-checked')).toBe('true')
        expect(page.querySelector('.line-through')?.textContent).toBe('Reproduce it')
        act(() => second.click())
        expect(page.textContent).toContain('Checklist 2/2')
        expect(boxes(page)[1].getAttribute('aria-checked')).toBe('true')
        expect(page.querySelectorAll('.line-through')).toHaveLength(2)
        expect(page.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100')
    })

    it('leaves out the sections it is not given, and says its headings as given', () => {
        const page = draw(
            <BoardItemPanel title="Rename the metrics" checklist={[]} words={{ description: 'Beskrivelse' }} description="Text" />,
        )
        expect(page.textContent).toContain('Beskrivelse')
        expect(page.textContent).not.toContain('Checklist')
        expect(page.textContent).not.toContain('Fields')
        expect(page.textContent).not.toContain('Activity')
    })
})

describe('DetailPane', () => {
    it('draws each section with its sentence, its facts and its content, then the verbs', () => {
        const page = draw(
            <DetailPane
                sections={[
                    {
                        id: 'event',
                        title: 'Event',
                        summary: 'grace changed it',
                        facts: [{ term: 'Action', value: 'job.update', code: true }],
                    },
                    { id: 'change', title: 'Change', content: <pre>diff</pre> },
                ]}
                actions={<button type="button">Download</button>}
            />,
        )
        const sections = [...page.querySelectorAll('section')]
        expect(sections.map((section) => section.querySelector('h3')?.textContent)).toEqual(['Event', 'Change'])
        expect(sections[0].textContent).toContain('grace changed it')
        expect(sections[0].querySelector('dt')?.textContent).toBe('Action')
        expect(sections[1].querySelector('pre')?.textContent).toBe('diff')
        expect(page.lastElementChild?.textContent).toBe('Download')
    })
})

describe('CheckboxField', () => {
    it('draws a dot in its color and sets the label quiet while unticked with `quiet="unchecked"`', () => {
        function Held() {
            const [on, setOn] = useState(true)
            return <CheckboxField label="Runs" dot="blue" quiet="unchecked" checked={on} onCheckedChange={setOn} />
        }
        const page = draw(<Held />)
        expect(page.querySelector<HTMLElement>('label span[style]')?.style.background).toBe('var(--kind-blue)')
        expect(page.querySelector('.text-muted-foreground')).toBeNull()
        act(() => boxes(page)[0].click())
        expect(page.querySelector('.text-muted-foreground')?.textContent).toBe('Runs')
        expect(page.querySelector('.line-through')).toBeNull()
    })
})
