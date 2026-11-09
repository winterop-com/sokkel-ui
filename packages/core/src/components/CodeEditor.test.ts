import { json } from '@codemirror/lang-json'
import { codeFolding, foldGutter, syntaxTree } from '@codemirror/language'
import { search } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

describe('a large read-only document', () => {
    it('builds its state over a megabyte without parsing it all at once', () => {
        const rows = Array.from({ length: 12_000 }, (_, index) => ({
            id: index,
            job: ['nightly-export', 'sync-inventory', 'rebuild-index'][index % 3],
            state: ['succeeded', 'failed', 'running'][index % 3],
            steps: ['fetch', 'transform', 'validate', 'upload'],
        }))
        const doc = JSON.stringify(rows, null, 2)
        expect(doc.length).toBeGreaterThan(1_000_000)
        const started = performance.now()
        const state = EditorState.create({
            doc,
            extensions: [json(), codeFolding(), foldGutter(), search(), EditorState.readOnly.of(true)],
        })
        const tree = syntaxTree(state)
        expect(performance.now() - started).toBeLessThan(1000)
        expect(state.doc.lines).toBeGreaterThan(100_000)
        // The parse runs in the background as the view scrolls; creating the state parses only a start.
        expect(tree.length).toBeLessThan(doc.length)
    })
})

describe('languages by name', () => {
    it('reads a media type as the language it is written in', async () => {
        const { languageForMediaType } = await import('./CodeEditor')
        expect(languageForMediaType('application/schema+json')).toBe('json')
        expect(languageForMediaType('application/x-compose+yaml')).toBe('yaml')
        expect(languageForMediaType('text/x-shellscript')).toBe('shell')
        expect(languageForMediaType('text/x-jinja')).toBe('jinja')
        expect(languageForMediaType('application/sql; charset=utf-8')).toBe('sql')
        expect(languageForMediaType('application/jq')).toBe('jq')
        expect(languageForMediaType('image/png')).toBe('text')
        expect(languageForMediaType(undefined)).toBe('text')
    })

    it('loads SQL, shell and Jinja on first use', async () => {
        const { loadCodeLanguage } = await import('./CodeEditor')
        await Promise.all([loadCodeLanguage('sql'), loadCodeLanguage('shell'), loadCodeLanguage('jinja'), loadCodeLanguage('json')])
    })
})
