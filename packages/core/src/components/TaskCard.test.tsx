import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { formatElapsed, TASK_STATES, TaskCard, taskStatuses } from './TaskCard'

const NOW = Date.UTC(2026, 10, 20, 14, 30)

describe('formatElapsed', () => {
    it('reads as a clock, with hours only past one', () => {
        expect(formatElapsed(0)).toBe('0:00')
        expect(formatElapsed(247_000)).toBe('4:07')
        expect(formatElapsed(3_847_000)).toBe('1:04:07')
        expect(formatElapsed(-5000)).toBe('0:00')
    })
})

describe('taskStatuses', () => {
    it('gives every state its tone', () => {
        const map = taskStatuses()
        expect(TASK_STATES.map((state) => map[state].color)).toEqual(['pending', 'running', 'warning', 'good', 'critical'])
        expect(map.executing.live).toBe(true)
    })
})

describe('TaskCard', () => {
    it('shows its state, elapsed time, line and actions', () => {
        const html = renderToStaticMarkup(
            <TaskCard
                title="Follow"
                code="task-41"
                state="executing"
                startedAt={NOW - 18 * 60_000}
                now={NOW}
                from={{ name: 'Patrol 7' }}
                to={{ name: 'Contact 14' }}
                facts={[{ term: 'Priority', value: 'High' }]}
                actions={[
                    { label: 'Complete', onSelect: () => undefined },
                    { label: 'Cancel', destructive: true, onSelect: () => undefined },
                ]}
            />,
        )
        expect(html).toContain('data-status="executing"')
        expect(html).toContain('18:00')
        expect(html.indexOf('Patrol 7')).toBeLessThan(html.indexOf('Contact 14'))
        expect(html).toContain('Priority')
        expect(html).toContain('Complete')
        expect(html).toContain('text-destructive')
    })

    it('stops its elapsed time where it ended', () => {
        const html = renderToStaticMarkup(
            <TaskCard title="Report" state="done" startedAt={NOW - 95 * 60_000} endedAt={NOW - 61 * 60_000} now={NOW} />,
        )
        expect(html).toContain('34:00')
    })
})
