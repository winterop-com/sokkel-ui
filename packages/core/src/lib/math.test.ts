import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'

import { markdownSchema } from './markdown-html'
import { hasMath, normalizeMath } from './math'

describe('normalizeMath', () => {
    it('turns \\(…\\) into inline dollars', () => {
        expect(normalizeMath('The rate is \\(r = k / n\\) per run.')).toBe('The rate is $r = k / n$ per run.')
    })

    it('turns \\[…\\] on its own line into a $$ block', () => {
        expect(normalizeMath('Before\n\\[ x^2 \\]\nAfter')).toBe('Before\n$$\nx^2\n$$\nAfter')
    })

    it('turns a display formula over several lines into one block, at its indent', () => {
        expect(normalizeMath('- Sum:\n  \\[\n  a + b\n  = c\n  \\]')).toBe('- Sum:\n  $$\n  a + b\n  = c\n  $$')
    })

    it('leaves \\[…\\] inside a sentence as escaped brackets', () => {
        for (const text of [
            'So \\[a+b\\] holds.',
            'Cited \\[45 & 48–9\\].',
            'History\\[edit\\]',
            '19 January \\[[[dates|O.S.]] 6 January\\]',
        ]) {
            expect(normalizeMath(text)).toBe(text)
        }
    })

    it('reads \\[…\\] inside a sentence as inline math with inlineBrackets, as chat models write it', () => {
        expect(normalizeMath('So \\[a+b\\] holds.', { inlineBrackets: true })).toBe('So $$a+b$$ holds.')
        expect(hasMath('So \\[a+b\\] holds.', { inlineBrackets: true })).toBe(true)
        expect(hasMath('So \\[a+b\\] holds.')).toBe(false)
    })

    it('leaves inline code and fenced code alone', () => {
        const source = ['Use `\\(x\\)` or `$5`.', '```latex', '\\[ y \\] costs $5', '```'].join('\n')
        expect(normalizeMath(source)).toBe(source)
    })

    it('leaves escaped backslashes and escaped dollars alone', () => {
        expect(normalizeMath('A path C:\\\\(temp\\) and \\$5.')).toBe('A path C:\\\\(temp\\) and \\$5.')
    })

    it('escapes dollars that pair as no math, as in prices', () => {
        expect(normalizeMath('It costs $5 and $10.')).toBe('It costs \\$5 and \\$10.')
        expect(normalizeMath('Pay $ 5 now')).toBe('Pay \\$ 5 now')
    })

    it('keeps single-dollar math and a price beside it', () => {
        expect(normalizeMath('With $n$ runs it costs $5.')).toBe('With $n$ runs it costs \\$5.')
    })

    it('leaves $$ blocks alone', () => {
        const source = 'Then\n\n$$\n\\frac{a}{b} = $c\n$$\n'
        expect(normalizeMath(source)).toBe(source)
    })

    it('holds a $$ block still being written as its source while streaming', () => {
        const source = 'Then\n\n$$\n\\frac{a}{b'
        expect(normalizeMath(source, { streaming: true })).toBe('Then\n\n```latex\n\\frac{a}{b')
        expect(normalizeMath(source)).toBe(source)
    })

    it('draws a closed $$ block while streaming', () => {
        const source = 'Then\n\n$$\n\\frac{a}{b}\n$$\n\nAnd'
        expect(normalizeMath(source, { streaming: true })).toBe(source)
    })

    it('turns \\[…\\] on lines of its own in a quote into a $$ block inside the quote', () => {
        expect(normalizeMath('> [!note]\n> \\[\n> E = mc^2\n> \\]')).toBe('> [!note]\n> $$\n> E = mc^2\n> $$')
    })

    it("leaves a quote's markers out of inline math over several lines", () => {
        expect(normalizeMath('> \\( x\n> + y \\)')).toBe('> $x + y$')
    })

    it('leaves dollars in autolinks and raw HTML alone', () => {
        expect(normalizeMath('<https://e.example/?a=$b>')).toBe('<https://e.example/?a=$b>')
        expect(normalizeMath('<a href="x?$y">z</a> costs $5')).toBe('<a href="x?$y">z</a> costs \\$5')
    })

    it('reads a long line of openers that never close in time that grows with its length', () => {
        const time = (source: string) => {
            const start = performance.now()
            normalizeMath(source)
            return performance.now() - start
        }
        for (const piece of ['$a ', '\\( ', '\\[ ']) {
            time(piece.repeat(1_000))
            const short = Math.min(time(piece.repeat(10_000)), time(piece.repeat(10_000)))
            const long = Math.min(time(piece.repeat(100_000)), time(piece.repeat(100_000)))
            if (long < 50) continue
            expect(long / Math.max(short, 1)).toBeLessThan(30)
        }
    })

    it('leaves text with no math as it is', () => {
        expect(normalizeMath('Nothing to see (here) [or there].')).toBe('Nothing to see (here) [or there].')
    })
})

describe('hasMath', () => {
    it('finds each form of math', () => {
        expect(hasMath('Inline $x^2$ here')).toBe(true)
        expect(hasMath('Inline \\(x^2\\) here')).toBe(true)
        expect(hasMath('\\[\nx\n\\]')).toBe(true)
        expect(hasMath('$$\nx\n$$')).toBe(true)
        expect(hasMath('```math\nx\n```')).toBe(true)
    })

    it('finds none in prices, code or plain text', () => {
        expect(hasMath('It costs $5 and $10.')).toBe(false)
        expect(hasMath('Run `echo $HOME` or:\n```sh\necho $PATH $x$\n```')).toBe(false)
        expect(hasMath('Plain words (with brackets).')).toBe(false)
        expect(hasMath('An escaped \\$x\\$ stays.')).toBe(false)
    })
})

describe('markdownSchema', () => {
    const render = (source: string) =>
        String(
            unified()
                .use(remarkParse)
                .use(remarkMath)
                .use(remarkRehype)
                .use(rehypeSanitize, markdownSchema)
                .use(rehypeKatex)
                .use(rehypeStringify)
                .processSync(source),
        )

    it('keeps the classes math is marked with', () => {
        const attributes = markdownSchema.attributes?.code ?? []
        expect(attributes).toContainEqual(['className', /^language-./, 'math-inline', 'math-display'])
    })

    it('lets KaTeX draw inline and display math after sanitizing', () => {
        const html = render('Inline $x^2$.\n\n$$\n\\sum_i a_i\n$$')
        expect(html).toContain('class="katex"')
        expect(html).toContain('class="katex-display"')
        expect(html).not.toContain('math-inline')
    })

    it('still strips what it strips', () => {
        const html = String(
            unified().use(remarkParse).use(remarkRehype).use(rehypeSanitize, markdownSchema).use(rehypeStringify).processSync('`x`'),
        )
        expect(html).toBe('<p><code>x</code></p>')
        expect(markdownSchema.tagNames).not.toContain('script')
    })
})
