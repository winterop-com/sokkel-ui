import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AnswerColumn, type AnswerColumnProps } from './AnswerColumn'

describe('AnswerColumn images and links', () => {
    const content =
        'See ![the chart](https://example.org/p.png?d=ada), [the run](https://example.org/runs/1) and [mail](mailto:ada@example.org).'
    const reasoning = 'Checking ![a trace](https://example.org/t.png) and [the notes](mailto:grace@example.org).'
    type Given = Pick<AnswerColumnProps, 'images' | 'linkSchemes'>
    const answer = (props: Given) => renderToStaticMarkup(<AnswerColumn model="reef-8b" state="done" content={content} {...props} />)
    /** The thinking stands open while it streams with no answer yet. */
    const thinking = (props: Given) =>
        renderToStaticMarkup(<AnswerColumn model="reef-8b" state="streaming" content="" reasoning={reasoning} {...props} />)

    it('draws images as their alt text and address by default', () => {
        expect(answer({})).not.toContain('<img')
        expect(answer({})).toContain('https://example.org/p.png?d=ada')
        expect(thinking({})).not.toContain('<img')
        expect(thinking({})).toContain('https://example.org/t.png')
    })

    it('draws images with images on', () => {
        expect(answer({ images: true })).toMatch(/<img[^>]*src="https:\/\/example.org\/p.png\?d=ada"/)
        expect(thinking({ images: true })).toMatch(/<img[^>]*src="https:\/\/example.org\/t.png"/)
    })

    it('keeps live only the links whose scheme is listed', () => {
        const all = answer({})
        expect(all).toContain('href="https://example.org/runs/1"')
        expect(all).toContain('href="mailto:ada@example.org"')
        const https = answer({ linkSchemes: ['https'] })
        expect(https).toContain('href="https://example.org/runs/1"')
        expect(https).not.toContain('href="mailto:')
        expect(https).toContain('mail')
    })

    it('narrows the links in the thinking too', () => {
        expect(thinking({})).toContain('href="mailto:grace@example.org"')
        const html = thinking({ linkSchemes: ['https'] })
        expect(html).toContain('the notes')
        expect(html).not.toContain('href="mailto:')
    })
})
