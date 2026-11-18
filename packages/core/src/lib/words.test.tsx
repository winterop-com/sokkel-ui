import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LocaleProvider } from '../components/LocaleProvider'
import { partMessageIds, translateWords } from './catalog'
import { useLocale, useWords, type WordsPart } from './words'

interface IssueWords {
    critical: string
}
interface TallyWords extends IssueWords {
    title: string
    count: (count: number) => string
    moved: (item: string, place: number) => string
    tones: readonly [string, string]
    groups: { recent: string; flags: string }
}

const ISSUE: WordsPart<IssueWords> = { id: 'issue', words: { critical: 'Error: ' } }
const TALLY_WORDS: TallyWords = {
    ...ISSUE.words,
    title: 'Tally',
    count: (count) => `${String(count)} ${count === 1 ? 'run' : 'runs'}`,
    moved: (item, place) => `${item} moved to ${String(place)}`,
    tones: ['Light', 'Dark'],
    groups: { recent: 'Recent', flags: 'Flags' },
}
const TALLY: WordsPart<TallyWords> = { id: 'tally', words: TALLY_WORDS, args: { count: 'count', moved: 'item place' }, from: [ISSUE] }

const NB = {
    'issue.critical': 'Feil: ',
    'tally.title': 'Opptelling',
    'tally.count': '{count, plural, one {# kjøring} other {# kjøringer}}',
    'tally.moved': '{item} flyttet til plass {place, number}',
    'tally.tones.1': 'Mørk',
    'tally.groups.flags': 'Flagg',
}

function Tally({ words }: { words?: Partial<TallyWords> }) {
    const said = useWords(TALLY, words)
    return (
        <p>
            {useLocale()}|{said.critical}|{said.title}|{said.count(1234)}|{said.moved('nightly-export', 2)}|{said.tones.join(',')}|
            {said.groups.recent},{said.groups.flags}
        </p>
    )
}

const plain = (html: string) => html.replace(/<\/?p>/g, '').replace(/[  ]/g, ' ')

describe('useWords', () => {
    it('gives the English words and en-US without a provider', () => {
        expect(plain(renderToStaticMarkup(<Tally />))).toBe(
            'en-US|Error: |Tally|1234 runs|nightly-export moved to 2|Light,Dark|Recent,Flags',
        )
    })

    it("translates what the provider's catalog holds, in its locale, and leaves the rest English", () => {
        expect(
            plain(
                renderToStaticMarkup(
                    <LocaleProvider locale="nb-NO" messages={NB}>
                        <Tally />
                    </LocaleProvider>,
                ),
            ),
        ).toBe('nb-NO|Feil: |Opptelling|1 234 kjøringer|nightly-export flyttet til plass 2|Light,Mørk|Recent,Flagg')
    })

    it("lets a part's own words win over the catalog, word by word", () => {
        expect(
            plain(
                renderToStaticMarkup(
                    <LocaleProvider locale="nb-NO" messages={NB}>
                        <Tally words={{ title: 'Telling', count: (count) => `n=${String(count)}` }} />
                    </LocaleProvider>,
                ),
            ),
        ).toBe('nb-NO|Feil: |Telling|n=1234|nightly-export flyttet til plass 2|Light,Mørk|Recent,Flagg')
    })

    it("takes the outer provider's catalog and locale where an inner one gives none", () => {
        expect(
            plain(
                renderToStaticMarkup(
                    <LocaleProvider locale="nb-NO" messages={NB}>
                        <LocaleProvider locale="de-DE">
                            <Tally />
                        </LocaleProvider>
                    </LocaleProvider>,
                ),
            ),
        ).toBe('de-DE|Feil: |Opptelling|1.234 kjøringer|nightly-export flyttet til plass 2|Light,Mørk|Recent,Flagg')
    })

    it('keeps the English word for a message that cannot be read', () => {
        const errors: unknown[] = []
        const error = console.error
        console.error = (...args: unknown[]) => errors.push(args)
        try {
            expect(translateWords(TALLY, { 'tally.title': '{broken' }, 'nb-NO').title).toBe('Tally')
        } finally {
            console.error = error
        }
        expect(errors).toHaveLength(1)
    })
})

describe('partMessageIds', () => {
    it("lists a part's words by id, nested and listed words by their path, and leaves out what it takes from another part", () => {
        expect(partMessageIds(TALLY).map(([id, , args]) => [id, args])).toEqual([
            ['tally.title', undefined],
            ['tally.count', 'count'],
            ['tally.moved', 'item place'],
            ['tally.tones.0', undefined],
            ['tally.tones.1', undefined],
            ['tally.groups.recent', undefined],
            ['tally.groups.flags', undefined],
        ])
    })
})
