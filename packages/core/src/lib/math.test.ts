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

    it('keeps \\[…\\] inside a sentence inline', () => {
        expect(normalizeMath('So \\[a+b\\] holds.')).toBe('So $$a+b$$ holds.')
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
