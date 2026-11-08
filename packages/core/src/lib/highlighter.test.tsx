import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { hasLanguage, highlightCode, registerLanguage } from './highlighter'

const html = (lines: React.ReactNode[] | null) => renderToStaticMarkup(<>{lines}</>)

describe('the highlighter', () => {
    it('colors code from the code tokens', async () => {
        const out = html(await highlightCode('const total = 42 // rows', 'ts'))
        expect(out).toContain('color:var(--code-keyword)')
        expect(out).toContain('color:var(--code-number)')
        expect(out).toContain('color:var(--code-comment);font-style:italic')
    })

    it('colors jq', async () => {
        const out = html(await highlightCode('.runs[] | select(.state == "failed") | {job, $id} # mine', 'jq'))
        expect(out).toContain('color:var(--code-property)')
        expect(out).toContain('color:var(--code-function)">select<')
        expect(out).toContain('color:var(--code-string)')
        expect(out).toContain('color:var(--code-variable)">$id<')
        expect(out).toContain('color:var(--code-comment)')
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
