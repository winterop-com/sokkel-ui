import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { AssistantReply } from './AssistantReply'
import { loadMath } from './Markdown'

const count = (html: string, needle: string) => html.split(needle).length - 1

describe('AssistantReply math', () => {
    beforeAll(loadMath)

    it('draws each form of math in its answer', () => {
        const content = ['Inline $t_0$ and \\(t_n\\), at $5 a run.', '', '$$', 'a + b', '$$', '', '\\[', 'c + d', '\\]'].join('\n')
        const html = renderToStaticMarkup(<AssistantReply content={content} />)
        expect(count(html, 'class="katex"')).toBe(4)
        expect(count(html, 'class="katex-display"')).toBe(2)
        expect(html).toContain('at $5 a run')
        expect(html).not.toContain('\\(')
    })

    it('leaves dollars as dollars with math off', () => {
        const html = renderToStaticMarkup(<AssistantReply content="From $t_0$ to $t_1$." math={false} />)
        expect(html).not.toContain('class="katex"')
        expect(html).toContain('From $t_0$ to $t_1$.')
    })
})

describe('AssistantReply waiting', () => {
    it('says Thinking when streaming with children React draws as nothing', () => {
        for (const children of [undefined, false, null, '', [false, null]]) {
            const html = renderToStaticMarkup(<AssistantReply state="streaming">{children}</AssistantReply>)
            expect(html).toContain('Thinking')
        }
    })

    it('draws the children instead once there are some', () => {
        const html = renderToStaticMarkup(
            <AssistantReply state="streaming">
                <p>Partial</p>
            </AssistantReply>,
        )
        expect(html).not.toContain('Thinking')
    })
})
