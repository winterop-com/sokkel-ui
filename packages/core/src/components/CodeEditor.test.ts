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

describe('problems', () => {
    it('reads the diagnostics as problems by line and column, in the order of the document', async () => {
        const { setDiagnostics } = await import('@codemirror/lint')
        const { codeProblems } = await import('./CodeEditor')
        const state = EditorState.create({ doc: 'job: nightly-export\nsteps:\n  - kind: fetchh\n' })
        expect(codeProblems(state)).toEqual([])
        const marked = state.update(
            setDiagnostics(state, [
                { from: 37, to: 43, severity: 'error', message: 'Must be one of fetch, transform.' },
                { from: 0, to: 3, severity: 'hint', message: 'A job names its pipeline.' },
            ]),
        ).state
        expect(codeProblems(marked)).toEqual([
            { line: 1, column: 1, endLine: 1, endColumn: 4, from: 0, to: 3, tone: 'info', message: 'A job names its pipeline.' },
            {
                line: 3,
                column: 11,
                endLine: 3,
                endColumn: 17,
                from: 37,
                to: 43,
                tone: 'error',
                message: 'Must be one of fetch, transform.',
            },
        ])
    })

    it("carries the path of the value a schema's finding is about", async () => {
        const { setDiagnostics } = await import('@codemirror/lint')
        const { codeProblems } = await import('./CodeEditor')
        const state = EditorState.create({ doc: 'job: nightly-export\nsteps:\n  - kind: fetchh\n' })
        const marked = state.update(
            setDiagnostics(state, [
                { from: 37, to: 43, severity: 'error', message: 'Expected one of', path: ['steps', 0, 'kind'] } as never,
            ]),
        ).state
        expect(codeProblems(marked)[0].path).toEqual(['steps', 0, 'kind'])
    })
})
