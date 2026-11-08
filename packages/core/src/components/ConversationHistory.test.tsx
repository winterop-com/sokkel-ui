import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ConversationHistory, conversationGroup, conversationTime } from './ConversationHistory'

const NOW = new Date(2026, 10, 8, 16, 30).getTime()
const HOUR = 3_600_000

describe('conversation history', () => {
    it('lists pinned ones first, then today and earlier by the day now falls in', () => {
        expect(conversationGroup({ id: 'a', title: 'a', time: NOW - 30 * 24 * HOUR, pinned: true }, NOW)).toBe('pinned')
        expect(conversationGroup({ id: 'b', title: 'b', time: NOW - 16 * HOUR }, NOW)).toBe('today')
        expect(conversationGroup({ id: 'c', title: 'c', time: NOW - 17 * HOUR }, NOW)).toBe('earlier')
    })

    it('shows the hour today, the day this year and the date before', () => {
        expect(conversationTime(new Date(2026, 10, 8, 9, 5).getTime(), NOW).replace(/\s/g, ' ')).toBe('9:05 AM')
        expect(conversationTime(new Date(2026, 9, 2, 9, 5).getTime(), NOW)).toBe('Oct 2')
        expect(conversationTime(new Date(2025, 9, 2, 9, 5).getTime(), NOW)).toBe('Oct 2, 2025')
    })

    it('draws the group heads in their order, the current one marked', () => {
        const html = renderToStaticMarkup(
            <ConversationHistory
                now={NOW}
                current="b"
                conversations={[
                    { id: 'a', title: 'Scheduler time zones', time: NOW - 40 * HOUR },
                    { id: 'b', title: 'Why nightly-export failed', time: NOW - HOUR },
                    { id: 'c', title: 'Retry policy', time: NOW - 2 * HOUR, pinned: true },
                ]}
            />,
        )
        const at = (text: string) => html.indexOf(text)
        expect(at('Pinned')).toBeGreaterThan(-1)
        expect(at('Pinned')).toBeLessThan(at('Today'))
        expect(at('Today')).toBeLessThan(at('Earlier'))
        expect(at('Retry policy')).toBeLessThan(at('Why nightly-export failed'))
    })
})
