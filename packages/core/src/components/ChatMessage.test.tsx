import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ChatMessage, isChatPerson } from './ChatMessage'

describe('isChatPerson', () => {
    it('tells a person given by name from a picture given as a node', () => {
        expect(isChatPerson({ name: 'ada' })).toBe(true)
        expect(isChatPerson({ name: 'grace', image: 'https://example.org/grace.png' })).toBe(true)
        expect(isChatPerson(<img alt="linus" />)).toBe(false)
        expect(isChatPerson('margaret')).toBe(false)
        expect(isChatPerson(null)).toBe(false)
        expect(isChatPerson({ name: 3 } as never)).toBe(false)
    })
})

describe('ChatMessage', () => {
    const draw = (props: Partial<Parameters<typeof ChatMessage>[0]> = {}) =>
        renderToStaticMarkup(
            <ChatMessage author="ada" time="09:42" {...props}>
                nightly-export failed at upload
            </ChatMessage>,
        )

    it('names its author and time, and leaves both out of a continued message save the time', () => {
        const first = draw()
        expect(first).toContain('>ada<')
        expect(first).toContain('09:42')
        const continued = draw({ continued: true })
        expect(continued).not.toContain('>ada<')
        expect(continued).toContain('09:42')
    })

    it('says it was edited, with the time on hover when given', () => {
        expect(draw()).not.toContain('(edited)')
        expect(draw({ edited: true })).toContain('(edited)')
        expect(draw({ editedAt: 'today at 09:44' })).toContain('title="Edited today at 09:44"')
    })

    it('counts the replies of its thread in its words', () => {
        const thread = { count: 2, people: [{ name: 'grace' }, { name: 'linus' }], last: '10:05' }
        expect(draw({ thread, onOpenThread: () => {} })).toContain('2 replies')
        expect(draw({ thread: { ...thread, count: 1 }, onOpenThread: () => {} })).toContain('1 reply')
        const translated = draw({ thread, onOpenThread: () => {}, words: { replies: (count) => `${String(count)} svar` } })
        expect(translated).toContain('2 svar')
    })

    it('draws each reaction with its count, and marks the one that is mine', () => {
        const html = draw({
            reactions: [
                { id: 'ok', icon: '+', label: 'Looks good', count: 3, mine: true },
                { id: 'eyes', icon: 'o', label: 'Looking', count: 1 },
            ],
            onReact: () => {},
        })
        expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
        expect(html.match(/aria-pressed="false"/g)).toHaveLength(1)
        expect(html).toContain('Looks good')
        expect(html).toContain('Looking')
    })
})
