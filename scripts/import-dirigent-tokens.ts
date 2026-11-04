/**
 * One-off: read dirigent's token blocks out of its stylesheet into tokens/tokens.json.
 *
 * Run once to seed the token source; from then on tokens.json is edited and
 * scripts/build-tokens.ts writes the CSS from it.
 *
 *   bun scripts/import-dirigent-tokens.ts <path to dirigent's src/index.css>
 */
import { readFileSync, writeFileSync } from 'node:fs'

type Vars = Record<string, string>

const source = process.argv[2]
if (source === undefined) throw new Error('give the path to dirigent frontend/src/index.css')

// Everything before the base layer is tokens; after it come component rules.
const css = readFileSync(source, 'utf8').split('@layer base')[0]
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every `selector { ... }` block at the top level, with its custom properties. */
function blocks(text: string): { selector: string; vars: Vars }[] {
    const found: { selector: string; vars: Vars }[] = []
    const pattern = /([^{}]+)\{([^{}]*)\}/g
    for (const match of text.matchAll(pattern)) {
        const selector = match[1].trim().replace(/\s+/g, ' ')
        const vars: Vars = {}
        for (const line of match[2].split(';')) {
            const at = line.indexOf(':')
            if (at === -1) continue
            const name = line.slice(0, at).trim()
            if (!name.startsWith('--')) continue
            vars[name.slice(2)] = line.slice(at + 1).trim()
        }
        if (Object.keys(vars).length > 0) found.push({ selector, vars })
    }
    return found
}

const theme: Vars = {}
const palettes: Record<string, { light: Vars; dark: Vars }> = {}
const common: { light: Vars; dark: Vars } = { light: {}, dark: {} }

function palette(name: string) {
    palettes[name] ??= { light: {}, dark: {} }
    return palettes[name]
}

for (const { selector, vars } of blocks(stripped)) {
    if (selector.endsWith('@theme inline')) {
        Object.assign(theme, vars)
        continue
    }
    const named = /data-(?:palette|theme)='([a-z-]+)'/.exec(selector)?.[1]
    const dark = selector.includes('.dark')
    if (selector === ':root') {
        Object.assign(common.light, vars)
    } else if (named !== undefined) {
        Object.assign(palette(named)[dark ? 'dark' : 'light'], vars)
    } else if (dark) {
        Object.assign(palette('dirigent').dark, vars)
    } else {
        console.warn(`skipped block: ${selector}`)
    }
}

// The terminal set sits in its own `:root` block but its dark half lives in the dirigent
// palette's dark block; it belongs to every palette, so it is moved to `common`.
for (const key of Object.keys(common.light)) {
    const darkValue = palettes.dirigent?.dark[key]
    if (darkValue !== undefined) {
        common.dark[key] = darkValue
        delete palettes.dirigent.dark[key]
    }
}

const tokens = {
    $description:
        'The single source of winterop-ui tokens. scripts/build-tokens.ts writes the CSS from it; nothing else is edited by hand.',
    theme,
    common,
    palettes,
}
writeFileSync('tokens/tokens.json', `${JSON.stringify(tokens, null, 4)}\n`)
const counts = Object.entries(palettes).map(([name, p]) => `${name} ${Object.keys(p.light).length}/${Object.keys(p.dark).length}`)
console.log(`theme ${Object.keys(theme).length}, common ${Object.keys(common.light).length}/${Object.keys(common.dark).length}, ${counts.join(', ')}`)
