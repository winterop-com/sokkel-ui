import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { THEMES } from '../lib/appearance'
import { SchemeChoice } from './SchemeChoice'
import { ThemeCards } from './ThemeCards'
import { ThemePicker } from './ThemePicker'

const THEMES_DIR = join(import.meta.dirname, '../styles/themes')

describe('ThemeCards', () => {
    const html = renderToStaticMarkup(<ThemeCards value="contrast" onValueChange={() => undefined} />)

    it('is a named radio group with a radio for every theme, the chosen one checked', () => {
        expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Theme"|aria-label="Theme"[^>]*role="radiogroup"/)
        expect(html.match(/role="radio"/g)).toHaveLength(THEMES.length)
        expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
        const checked = html.slice(html.indexOf('aria-checked="true"'))
        expect(checked.slice(0, checked.indexOf('role="radio"', 1))).toContain('data-theme-scope="contrast"')
    })

    it('makes the chosen card the one focus enters at, so the arrow keys rove from it', () => {
        expect(html.match(/data-composite-item-active=""/g)).toHaveLength(1)
        const active = html.slice(html.indexOf('data-composite-item-active'))
        expect(active.slice(0, active.indexOf('role="radio"'))).toContain('data-theme-scope="contrast"')
    })

    it('says each theme by its label, and the group by its words', () => {
        for (const theme of THEMES) expect(html).toContain(`>${theme.label}<`)
        const translated = renderToStaticMarkup(<ThemeCards value="paper" onValueChange={() => undefined} words={{ theme: 'Tema' }} />)
        expect(translated).toContain('aria-label="Tema"')
    })

    it('draws each sample in its own theme, from the background, card, border, foreground and brand tokens', () => {
        const scopes = [...html.matchAll(/data-theme-scope="([^"]+)"/g)].map((match) => match[1])
        expect(scopes).toEqual(THEMES.map((theme) => theme.value))
        for (const token of ['bg-background', 'bg-card', 'border-border', 'bg-foreground', 'bg-muted-foreground', 'bg-primary']) {
            expect(html).toContain(token)
        }
    })

    it('offers only the themes it is given', () => {
        const two = renderToStaticMarkup(
            <ThemeCards
                value="paper"
                onValueChange={() => undefined}
                themes={THEMES.filter((theme) => ['paper', 'steel'].includes(theme.value))}
            />,
        )
        expect(two.match(/role="radio"/g)).toHaveLength(2)
    })
})

describe('the scoped tokens a card wears', () => {
    it('set the surfaces and lines of every theme but the base on its scope, light and dark', () => {
        for (const theme of THEMES.filter((one) => one.value !== 'tidevann')) {
            const css = readFileSync(join(THEMES_DIR, `${theme.value}.css`), 'utf8')
            expect(css).toContain(`[data-theme-scope='${theme.value}']`)
            expect(css).toContain(`.dark [data-theme-scope='${theme.value}']`)
        }
        const contrast = readFileSync(join(THEMES_DIR, 'contrast.css'), 'utf8')
        for (const token of ['--background', '--card', '--border', '--foreground', '--primary']) expect(contrast).toContain(`${token}:`)
    })
})

describe('SchemeChoice', () => {
    /** The label each option shows, leaving out the others laid unseen in its cell to share their width. */
    const labels = (html: string) => [...html.matchAll(/<span class="col-start-1 row-start-1">([A-Za-z]+)</g)].map((match) => match[1])

    it('offers system, light and dark in that order, the chosen one pressed', () => {
        const html = renderToStaticMarkup(<SchemeChoice value="light" onValueChange={() => undefined} />)
        expect(html).toContain('aria-label="Scheme"')
        expect(labels(html)).toEqual(['System', 'Light', 'Dark'])
        expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    })

    it('offers the schemes it is given, in their order, in its words', () => {
        const html = renderToStaticMarkup(
            <SchemeChoice
                value="dark"
                schemes={['dark', 'light']}
                onValueChange={() => undefined}
                words={{ dark: 'Mørk', light: 'Lys' }}
            />,
        )
        expect(html).toContain('Mørk')
        expect(html).not.toContain('System')
        expect(html.indexOf('Mørk')).toBeLessThan(html.indexOf('Lys'))
    })
})

describe('ThemePicker made of them', () => {
    const value = { theme: 'paper', scheme: 'dark' as const, density: 'regular', corners: 'theme', typeface: 'theme' }

    it('keeps its dark, light and system order and its density row', () => {
        const html = renderToStaticMarkup(<ThemePicker value={value} onChange={() => undefined} themes={THEMES} system />)
        expect(html.indexOf('>Dark<')).toBeLessThan(html.indexOf('>Light<'))
        expect(html.indexOf('>Light<')).toBeLessThan(html.indexOf('>System<'))
        expect(html).toContain('aria-label="Density"')
        expect(html).not.toContain('role="radiogroup"')
    })

    it('draws the themes as cards with themeCards', () => {
        const html = renderToStaticMarkup(<ThemePicker value={value} onChange={() => undefined} themes={THEMES} themeCards />)
        expect(html).toContain('data-slot="theme-cards"')
        expect(html.match(/role="radio"/g)).toHaveLength(THEMES.length)
    })
})
