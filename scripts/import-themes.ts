/**
 * One-off: build tokens/tokens.json from Maneki's themes, folding in the tokens dirigent has
 * that Maneki does not, so the default theme defines every token either app uses.
 *
 *   bun scripts/import-themes.ts <maneki src/index.css> <dirigent src/index.css>
 *
 * Maneki's own theme becomes `default`; its other themes keep their names. The density levels
 * already in tokens.json are kept.
 */
import { readFileSync, writeFileSync } from 'node:fs'

type Vars = Record<string, string>
type Theme = { light: Vars; dark: Vars }

const [manekiPath, dirigentPath] = process.argv.slice(2)
if (manekiPath === undefined || dirigentPath === undefined) throw new Error('give Maneki and dirigent index.css paths')

/** Every top-level `selector { ... }` block holding custom properties, comments removed. */
function blocks(css: string): { selector: string; vars: Vars }[] {
    const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
    const found: { selector: string; vars: Vars }[] = []
    for (const match of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const vars: Vars = {}
        for (const line of match[2].split(';')) {
            const at = line.indexOf(':')
            if (at === -1) continue
            const name = line.slice(0, at).trim()
            if (name.startsWith('--')) vars[name.slice(2)] = line.slice(at + 1).trim()
        }
        if (Object.keys(vars).length > 0) found.push({ selector: match[1].trim().replace(/\s+/g, ' '), vars })
    }
    return found
}

/** Read a stylesheet's `@theme` map and its themes, the app's own theme named `default`. */
function read(path: string, own: string): { map: Vars; themes: Record<string, Theme>; loose: Vars } {
    const map: Vars = {}
    const themes: Record<string, Theme> = {}
    const loose: Vars = {}
    for (const { selector, vars } of blocks(readFileSync(path, 'utf8'))) {
        if (selector.endsWith('@theme inline')) {
            Object.assign(map, vars)
            continue
        }
        const named = /data-(?:palette|theme)='([a-z-]+)'/.exec(selector)?.[1]
        const dark = selector.includes('.dark')
        if (named !== undefined) {
            const name = named === own ? 'default' : named
            themes[name] ??= { light: {}, dark: {} }
            Object.assign(themes[name][dark ? 'dark' : 'light'], vars)
        } else if (selector === ':root') {
            Object.assign(loose, vars)
        } else if (selector === '.dark' || selector.startsWith('.dark,')) {
            themes.default ??= { light: {}, dark: {} }
            Object.assign(themes.default.dark, vars)
        }
    }
    return { map, themes, loose }
}

const maneki = read(manekiPath, 'maneki')
const dirigent = read(dirigentPath, 'dirigent')

// Maneki's values win; what only dirigent has is added to the map and to the default theme.
const map: Vars = { ...dirigent.map, ...maneki.map }
const themes = maneki.themes
const base = themes.default
for (const [name, value] of Object.entries({ ...dirigent.themes.default.light, ...dirigent.loose })) {
    if (!(name in base.light) && !name.startsWith('font-scale')) base.light[name] = value
}
for (const [name, value] of Object.entries(dirigent.themes.default.dark)) {
    if (!(name in base.dark)) base.dark[name] = value
}

const previous = JSON.parse(readFileSync('tokens/tokens.json', 'utf8')) as { density: unknown; theme: Vars }
// The scale chosen earlier (type, radius, shell) stays as it was set.
for (const key of Object.keys(previous.theme)) {
    if (/^(text|radius|spacing|font)-/.test(key)) map[key] = previous.theme[key]
}

const tokens = {
    $description:
        'The single source of winterop-ui tokens. `default` defines every token; every other theme overrides what it changes, and may override any token, not only colors. scripts/build-tokens.ts writes the CSS.',
    theme: map,
    themes,
    density: previous.density,
}
writeFileSync('tokens/tokens.json', `${JSON.stringify(tokens, null, 4)}\n`)
console.log(
    Object.entries(themes)
        .map(([name, theme]) => `${name} ${Object.keys(theme.light).length}/${Object.keys(theme.dark).length}`)
        .join(', '),
    `| map ${Object.keys(map).length}`,
)
