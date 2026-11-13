import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { hasLanguage, loadHighlighter, registerLanguage } from './highlighter'

async function highlightCode(code: string, language: string) {
    const highlighter = await loadHighlighter(language)
    return highlighter ? highlighter.highlight(code).lines : null
}

const html = (lines: React.ReactNode[] | null) => renderToStaticMarkup(<>{lines}</>)

describe('the highlighter', () => {
    // The first test loads the grammars cold, which under a full parallel run can take longer than the default 5 s.
    it('colors code from the code tokens', { timeout: 20_000 }, async () => {
        const out = html(await highlightCode('const total = 42 // rows', 'ts'))
        expect(out).toContain('color:var(--code-keyword)')
        expect(out).toContain('color:var(--code-number)')
        expect(out).toContain('color:var(--code-comment);font-style:italic')
    })

    it('draws a line too long to color plain', async () => {
        const out = html(await highlightCode(`const rows = [${'1, '.repeat(7_000)}]`, 'ts'))
        expect(out).not.toContain('color:var(--code-number)')
    })

    it('colors jq', async () => {
        const out = html(await highlightCode('.runs[] | select(.state == "failed") | {job, $id} # mine', 'jq'))
        expect(out).toContain('color:var(--code-property)')
        expect(out).toContain('color:var(--code-function)">select<')
        expect(out).toContain('color:var(--code-string)')
        expect(out).toContain('color:var(--code-variable)">$id<')
        expect(out).toContain('color:var(--code-comment)')
    })

    it('colors bracket pairs by depth, but not brackets inside strings', async () => {
        const out = html(await highlightCode('{"a": [1, "[x]"]}', 'json'))
        expect(out).toContain('<span style="color:var(--code-bracket-1)">{</span>')
        expect(out).toContain('<span style="color:var(--code-bracket-2)">[</span>')
        expect(out).toContain('<span style="color:var(--code-bracket-2)">]</span>')
        expect(out).toContain('<span style="color:var(--code-bracket-1)">}</span>')
        expect(out).not.toContain('color:var(--code-bracket-3)')
    })

    it('draws ANSI output as styled runs, line by line', async () => {
        const lines = await highlightCode('\u001b[31mfailed\u001b[0m\nok', 'ansi')
        expect(lines).toHaveLength(2)
        expect(html(lines)).toContain('<span style="color:var(--status-failed-ink)">failed</span>')
    })

    it('takes a language an app registers, by its name and aliases', async () => {
        expect(hasLanguage('toml')).toBe(false)
        registerLanguage('toml', () => import('shiki/langs/toml.mjs'), { aliases: ['tml'] })
        expect(hasLanguage('tml')).toBe(true)
        expect(html(await highlightCode('name = "harbor"', 'tml'))).toContain('color:var(--code-string)')
    })
})
