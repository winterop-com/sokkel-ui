import { CompletionContext } from '@codemirror/autocomplete'
import { StringStream } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { linkCompletions } from '../CodeEditor'
import { markdownParser } from './markdown'

/** Each line's tokens that carry a style, as `style:text`. */
function tokens(text: string): string[][] {
    const state = markdownParser.startState?.(2) ?? { fence: null, address: false, front: 'start' as const, comment: false }
    return text.split('\n').map((line) => {
        if (line === '') {
            markdownParser.blankLine?.(state, 2)
            return []
        }
        const stream = new StringStream(line, 4, 2)
        const out: string[] = []
        while (!stream.eol()) {
            const style = markdownParser.token(stream, state)
            if (style !== null) out.push(`${style}:${stream.current()}`)
            stream.start = stream.pos
        }
        return out
    })
}

describe('the markdown language', () => {
    it('reads headings, lists, quotes and rules from a line start', () => {
        expect(tokens('## Steps\n- [ ] fetch\n> quoted\n---')).toEqual([
            ['heading:## Steps'],
            ['list:- [ ] '],
            ['quote:> '],
            ['contentSeparator:---'],
        ])
    })

    it('reads links between notes, tags, code and emphasis inside a line', () => {
        expect(tokens('See [[Nightly export]] #runbook, `code`, **bold** and *this*.')[0]).toEqual([
            'link:[[Nightly export]]',
            'labelName:#runbook',
            'monospace:`code`',
            'strong:**bold**',
            'emphasis:*this*',
        ])
    })

    it('takes no underscore inside a word for emphasis, and no heading for a tag', () => {
        expect(tokens('nightly_export_v2 runs')[0]).toEqual([])
        expect(tokens('#meeting')[0]).toEqual(['labelName:#meeting'])
    })

    it('colors a link address only after its words', () => {
        expect(tokens('[the docs](https://example.org) (aside)')[0]).toEqual(['link:[the docs]', 'url:(https://example.org)'])
    })

    it('reads the frontmatter at the top: its fences, and each key as a property', () => {
        expect(tokens('---\nowner: grace\nsteps: [fetch, upload]\n---\n# Retry')).toEqual([
            ['processingInstruction:---'],
            ['propertyName:owner'],
            ['propertyName:steps'],
            ['processingInstruction:---'],
            ['heading:# Retry'],
        ])
    })

    it('reads a rule and a sentence at the top as markdown, and no frontmatter after the first line', () => {
        // The first line is read before the next shows it a rule; both are drawn as punctuation.
        expect(tokens('---\nThe export **finished**.')).toEqual([['processingInstruction:---'], ['strong:**finished**']])
        expect(tokens('# Title\n---\nowner: grace')).toEqual([['heading:# Title'], ['contentSeparator:---'], []])
        expect(tokens('\n---\nowner: grace')[1]).toEqual(['contentSeparator:---'])
    })

    it('reads callout markers, embeds, highlights and comments', () => {
        expect(tokens('> [!warning]- Before a rerun')[0]).toEqual(['quote:> ', 'keyword:[!warning]-'])
        expect(tokens('Not a marker: [!note]')[0]).toEqual([])
        expect(tokens('![[Retry a run#Steps]] and ![[chart.png|300]]')[0]).toEqual([
            'link:![[Retry a run#Steps]]',
            'link:![[chart.png|300]]',
        ])
        expect(tokens('The ==failed step==, but a == b.')[0]).toEqual(['inserted:==failed step=='])
        expect(tokens('Before <!-- hidden --> after')[0]).toEqual(['comment:<!-- hidden -->'])
        expect(tokens('<!--\n# not a heading\n-->\n# heading')).toEqual([
            ['comment:<!--'],
            ['comment:# not a heading'],
            ['comment:-->'],
            ['heading:# heading'],
        ])
    })

    it('reads a long line of quote marks and equals signs in time in step with its length', () => {
        const started = performance.now()
        tokens('>'.repeat(20_000) + '='.repeat(20_000))
        expect(performance.now() - started).toBeLessThan(1000)
    })

    it('reads a long line of marks that never close in time in step with its length', () => {
        for (const mark of ['==a ', '**a ', '__a ', '*a ', '_a ', '~~a ', '[a ', '`a`` ', '#a ', '<!-- ', '\\', '(', 'https://a ']) {
            const started = performance.now()
            tokens(mark.repeat(Math.ceil(40_000 / mark.length)))
            expect(performance.now() - started, mark).toBeLessThan(1000)
        }
    })

    it('keeps a fenced block open across lines until its mark closes it', () => {
        expect(tokens('```\n[[not a link]]\n```\n[[link]]')).toEqual([
            ['processingInstruction:```'],
            ['monospace:[[not a link]]'],
            ['processingInstruction:```'],
            ['link:[[link]]'],
        ])
    })
})

describe('link completion', () => {
    const NAMES = [{ label: 'Nightly export' }, { label: 'harbor' }]
    const complete = (doc: string, pos = doc.length) =>
        linkCompletions(new CompletionContext(EditorState.create({ doc }), pos, false), NAMES)

    it('offers the names from the brackets on, each closed with ]]', async () => {
        const result = await complete('See [[Nigh')
        expect(result?.from).toBe(6)
        expect(result?.options.map((option) => option.apply)).toEqual(['Nightly export]]', 'harbor]]'])
    })

    it('puts in no second ]] where they follow already', async () => {
        const result = await complete('See [[]]', 6)
        expect(result?.options[0]?.apply).toBe('Nightly export')
    })

    it('offers nothing outside a link', async () => {
        expect(await complete('See [Nigh')).toBeNull()
        expect(await complete('See [[harbor]] and')).toBeNull()
    })
})
